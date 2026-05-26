import type { MatchResult, ParsedTeam } from "./matchSchema";
import type { IplVenue } from "@/data/iplVenues";

function cleanName(name: string): string {
  return name.replace(/\s*-\s*$/, "").replace(/\s+/g, " ").trim();
}

function isNotOut(status: string): boolean {
  return /not out/i.test(status);
}

function nameMatch(a: string, b: string): boolean {
  const na = cleanName(a).toLowerCase();
  const nb = cleanName(b).toLowerCase();
  return na === nb || na.includes(nb) || nb.includes(na);
}

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

function getBattingSquad(team: ParsedTeam, impactActive: boolean): string[] {
  const order = team.playingXI
    .filter((p) => p.notes !== "bowling only")
    .map((p) => cleanName(p.name));

  if (impactActive && team.impactPlayer && team.impactPlayer.notes !== "bowling only") {
    const ip = cleanName(team.impactPlayer.name);
    if (!order.some((n) => nameMatch(n, ip))) order.push(ip);
  }
  return order;
}

function isHomeSide(team: ParsedTeam, venue: IplVenue): boolean {
  const n = team.name.toLowerCase();
  const notes = venue.notes.toLowerCase();
  const city = venue.city.toLowerCase();
  return notes.includes(n.slice(0, 3)) || notes.includes(n.split(" ").pop() ?? "") || n.includes(city.slice(0, 4));
}

function analyzeBattingDepth(team: ParsedTeam): "deep" | "balanced" | "thin" {
  const batters = team.playingXI.filter((p) => p.notes !== "bowling only").length;
  if (batters >= 9) return "deep";
  if (batters <= 7) return "thin";
  return "balanced";
}

function spinQuotaCount(team: ParsedTeam): number {
  const spinHint = /spin|leg|off|left.?arm|mystery|kuldeep|chahal|ashwin|axar|jadeja|theekshana|varun|prashant|shah|bishnoi|moeen|rashid/i;
  return team.bowlingQuota.filter((q) => {
    const p = team.playingXI.find((x) => nameMatch(x.name, q.name));
    return spinHint.test(`${q.name} ${p?.role ?? ""} ${p?.notes ?? ""}`);
  }).length;
}

function pitchScoreRange(
  pitchType: string,
  overs: number,
  homeBoost: number,
  rng: () => number,
  battingDepth: "deep" | "balanced" | "thin",
): { min: number; max: number; firestorm: boolean } {
  const scale = overs / 20;
  let base: { min: number; max: number };
  let firestorm = false;

  switch (pitchType) {
    case "Flat":
      base = { min: 165, max: 215 };
      if (rng() < 0.18) {
        firestorm = true;
        base = { min: 195, max: 238 };
      }
      break;
    case "Green":
      base = { min: 125, max: 160 };
      if (battingDepth === "thin") base.max -= 8;
      break;
    case "Slow":
    case "Turning":
      base = { min: 135, max: 172 };
      if (battingDepth === "thin") {
        base.min -= 5;
        base.max -= 10;
      }
      break;
    default:
      base = { min: 145, max: 185 };
  }
  return {
    min: Math.round((base.min + homeBoost) * scale),
    max: Math.round((base.max + homeBoost) * scale),
    firestorm,
  };
}

function pickWickets(
  rng: () => number,
  pitchType: string,
  isChase: boolean,
  chaseWon: boolean,
  fieldingTeam: ParsedTeam,
  battingDepth: "deep" | "balanced" | "thin",
): number {
  let min = 4;
  let max = 7;
  if (pitchType === "Green") {
    min = 5;
    max = 9;
  }
  if (pitchType === "Turning" || pitchType === "Slow") {
    min = 5;
    max = 8;
    if (spinQuotaCount(fieldingTeam) >= 3) {
      min += 1;
      max = Math.min(10, max + 1);
    }
  }
  if (pitchType === "Green" && spinQuotaCount(fieldingTeam) <= 1) {
    min = Math.max(4, min - 1);
  }
  if (battingDepth === "thin") {
    min += 1;
    max = Math.min(10, max + 1);
  } else if (battingDepth === "deep" && !isChase) {
    max = Math.max(min, max - 1);
  }
  if (isChase) {
    min = chaseWon ? 3 : 6;
    max = chaseWon ? 6 : 10;
    if (chaseWon && max > 7) max = 7 + Math.floor(rng() * 2);
  }
  return min + Math.floor(rng() * (max - min + 1));
}

/** Cricket rule: not-outs = 10 - wickets (capped at 2 for completed innings) */
export function notOutsForWickets(wickets: number): number {
  return Math.min(2, Math.max(0, 10 - wickets));
}

export function syncBoundaries(runs: number, rng: () => number): { fours: number; sixes: number } {
  if (runs <= 0) return { fours: 0, sixes: 0 };
  let sixes = Math.min(Math.floor(runs / 14), Math.floor(rng() * 3) + (runs > 40 ? 1 : 0));
  let left = runs - sixes * 6;
  let fours = Math.min(Math.floor(left / 4), Math.floor(rng() * 5) + 1);
  left -= fours * 4;
  while (left >= 6 && sixes < 5) {
    sixes++;
    left -= 6;
  }
  while (left >= 4) {
    fours++;
    left -= 4;
  }
  return { fours, sixes };
}

function roleInnings(
  idx: number,
  role: string,
  isNo: boolean,
  rng: () => number,
): { runs: number; balls: number } {
  if (isNo) {
    const runs = idx >= 5 ? 18 + Math.floor(rng() * 45) : 8 + Math.floor(rng() * 28);
    const sr = 130 + rng() * 60;
    const balls = Math.max(1, Math.round((runs / sr) * 100));
    return { runs, balls };
  }
  if (/anchor|wicketkeeper/i.test(role) || idx === 2) {
    const runs = 12 + Math.floor(rng() * 42);
    const balls = Math.round(runs * (1.15 + rng() * 0.35));
    return { runs, balls };
  }
  if (idx <= 1 || /aggressor|batter/i.test(role)) {
    const runs = 6 + Math.floor(rng() * 38);
    const balls = Math.max(4, Math.round(runs * (0.85 + rng() * 0.45)));
    return { runs, balls };
  }
  if (/finisher|allrounder/i.test(role)) {
    const runs = 8 + Math.floor(rng() * 35);
    const balls = Math.round(runs * (0.9 + rng() * 0.5));
    return { runs, balls };
  }
  const runs = 0 + Math.floor(rng() * 18);
  const balls = runs > 0 ? Math.round(runs * (1.1 + rng() * 0.6)) : 1 + Math.floor(rng() * 5);
  return { runs, balls };
}

function dismissalText(bowler: string, rng: () => number): string {
  const types = [
    `c sub b ${bowler}`,
    `lbw b ${bowler}`,
    `b ${bowler}`,
    `c fielder b ${bowler}`,
    `st ${bowler}`,
  ];
  return types[Math.floor(rng() * types.length)];
}

function distributeWickets(totalWickets: number, bowlerCount: number): number[] {
  if (totalWickets <= 0) return new Array(bowlerCount).fill(0);
  const wkts = new Array(bowlerCount).fill(0);
  for (let i = 0; i < totalWickets; i++) wkts[i % bowlerCount]++;
  return wkts;
}

function buildBowlingFromQuota(
  fieldingTeam: ParsedTeam,
  runsConceded: number,
  wickets: number,
  matchOvers: number,
): NonNullable<MatchResult["innings"][0]["bowling"]> {
  const quota = fieldingTeam.bowlingQuota;
  if (!quota.length) return [];

  const wktSplit = distributeWickets(wickets, quota.length);
  let runsLeft = runsConceded;

  return quota.map((q, i) => {
    const bowlerOvers = q.overs.length;
    const isLast = i === quota.length - 1;
    const runs = isLast ? runsLeft : Math.round(runsConceded * (bowlerOvers / matchOvers));
    runsLeft -= runs;
    return {
      name: cleanName(q.name),
      overs: bowlerOvers,
      maidens: 0,
      runs: Math.max(0, runs),
      wickets: wktSplit[i],
      economy: bowlerOvers > 0 ? Math.round((Math.max(0, runs) / bowlerOvers) * 100) / 100 : 0,
      isImpact: fieldingTeam.impactPlayer?.name
        ? nameMatch(fieldingTeam.impactPlayer.name, q.name)
        : false,
    };
  });
}

function buildInnings(
  squad: ParsedTeam,
  opposition: ParsedTeam,
  matchOvers: number,
  pitchType: string,
  rng: () => number,
  forcedTotal?: number,
  forcedWickets?: number,
  homeBoost = 0,
): MatchResult["innings"][0] {
  const squadOrder = getBattingSquad(squad, true);
  const depth = analyzeBattingDepth(squad);
  const range = pitchScoreRange(pitchType, matchOvers, homeBoost, rng, depth);
  const wickets =
    forcedWickets ??
    pickWickets(rng, pitchType, forcedTotal !== undefined, false, opposition, depth);
  const notOutCount = notOutsForWickets(wickets);
  const battersCount = wickets + notOutCount;

  let targetTotal =
    forcedTotal ?? range.min + Math.floor(rng() * (range.max - range.min + 1));

  const wides = 2 + Math.floor(rng() * 4);
  const noBalls = 1 + Math.floor(rng() * 3);
  const byes = Math.floor(rng() * 2);
  let legByes = 1 + Math.floor(rng() * 2);
  let totalExtras = wides + noBalls + byes + legByes;
  if (totalExtras < 5) {
    legByes += 5 - totalExtras;
    totalExtras = wides + noBalls + byes + legByes;
  }
  const batRunsNeeded = targetTotal - totalExtras;

  const bowlers = opposition.bowlingQuota.map((q) => cleanName(q.name));
  const batting: MatchResult["innings"][0]["batting"] = [];

  for (let i = 0; i < battersCount && i < squadOrder.length; i++) {
    const name = squadOrder[i];
    const player = squad.playingXI.find((p) => nameMatch(p.name, name));
    const role = player?.role ?? "unknown";
    const isNo = i >= wickets;
    let { runs, balls } = roleInnings(i, role, isNo, rng);
    if (range.firestorm && i <= 1 && !isNo) {
      runs = Math.min(85, runs + 15 + Math.floor(rng() * 35));
      balls = Math.max(balls, Math.round(runs * 0.72));
    }
    const { fours, sixes } = syncBoundaries(runs, rng);
    batting.push({
      name,
      status: isNo ? "not out" : dismissalText(bowlers[i % bowlers.length] ?? "Bowler", rng),
      runs,
      balls,
      fours,
      sixes,
      strikeRate: balls > 0 ? Math.round((runs / balls) * 1000) / 10 : 0,
    });
  }

  let sum = batting.reduce((s, b) => s + b.runs, 0);
  const diff = batRunsNeeded - sum;
  if (diff !== 0 && batting.length) {
    const tail = batting.filter((b) => isNotOut(b.status));
    const adjust = tail.length ? tail[tail.length - 1] : batting[batting.length - 1];
    adjust.runs = Math.max(0, adjust.runs + diff);
    const bnd = syncBoundaries(adjust.runs, rng);
    adjust.fours = bnd.fours;
    adjust.sixes = bnd.sixes;
    adjust.strikeRate =
      adjust.balls > 0 ? Math.round((adjust.runs / adjust.balls) * 1000) / 10 : 0;
    sum = batting.reduce((s, b) => s + b.runs, 0);
  }

  const totalRuns = sum + totalExtras;
  const batted = new Set(batting.map((b) => b.name.toLowerCase()));

  return {
    teamName: squad.name,
    batting,
    extras: { total: totalExtras, wides, noBalls, byes, legByes },
    totalRuns,
    totalWickets: wickets,
    overs: matchOvers,
    runRate: Math.round((totalRuns / matchOvers) * 100) / 100,
    didNotBat: squadOrder.filter((n) => !batted.has(n.toLowerCase())),
  };
}

export function rebuildPartnershipsAndFow(match: MatchResult, matchOvers: number): void {
  const maxBalls = matchOvers * 6;

  const buildForInnings = (batting: MatchResult["innings"][0]["batting"]) => {
    const partnerships: MatchResult["partnerships"]["firstInnings"] = [];
    const fow: MatchResult["fallOfWickets"]["firstInnings"] = [];
    let cumRuns = 0;
    let cumBalls = 0;
    let wkt = 0;
    let prevName = batting[0]?.name ?? "";

    for (let i = 0; i < batting.length; i++) {
      const b = batting[i];
      cumRuns += b.runs;
      cumBalls += b.balls;
      if (cumBalls > maxBalls) cumBalls = maxBalls;

      if (isNotOut(b.status)) {
        prevName = b.name;
        continue;
      }

      wkt++;
      partnerships.push({
        wicket: wkt,
        runs: cumRuns,
        balls: cumBalls,
        batters: `${prevName} & ${b.name}`,
      });
      fow.push({
        score: `${cumRuns}-${wkt}`,
        over: `${Math.floor(cumBalls / 6)}.${cumBalls % 6}`,
        batter: b.name,
      });
      prevName = batting[i + 1]?.name ?? b.name;
    }
    return { partnerships, fow };
  };

  const p1 = buildForInnings(match.innings[0].batting);
  const p2 = buildForInnings(match.innings[1].batting);
  match.partnerships = { firstInnings: p1.partnerships, secondInnings: p2.partnerships };
  match.fallOfWickets = { firstInnings: p1.fow, secondInnings: p2.fow };
}

function pickMom(match: MatchResult): string {
  const winner = match.result.winner;
  const winnerInn = match.innings.find((i) => nameMatch(i.teamName, winner));
  const pool = winnerInn?.batting ?? [];
  const scored = pool.filter((b) => b.runs > 0).sort((a, b) => b.runs - a.runs);
  const top = scored[0];
  if (!top) return "Player of the Match";
  const wkts = winnerInn === match.innings[0] ? match.innings[1].bowling : match.innings[0].bowling;
  const topBowler = wkts?.slice().sort((a, b) => b.wickets - a.wickets || b.runs - a.runs)[0];
  if (topBowler && topBowler.wickets >= 3 && top.runs < 40) {
    return `${topBowler.name} (${topBowler.wickets}/${topBowler.runs})`;
  }
  return `${top.name} (${top.runs} off ${top.balls})`;
}

export interface SquadEnrichContext {
  teamA: ParsedTeam;
  teamB: ParsedTeam;
  venue: IplVenue;
  matchOvers: number;
}

/** Deterministic realistic scorecard from squads, pitch, home advantage */
export function enrichMatchFromSquads(match: MatchResult, ctx: SquadEnrichContext): MatchResult {
  const seed = `${ctx.teamA.name}-${ctx.teamB.name}-${ctx.venue.id}-${ctx.matchOvers}`;
  const rng = seededRandom(seed);

  const homeA = isHomeSide(ctx.teamA, ctx.venue);
  const homeB = isHomeSide(ctx.teamB, ctx.venue);

  const inn1 = buildInnings(
    ctx.teamA,
    ctx.teamB,
    ctx.matchOvers,
    ctx.venue.pitchType,
    rng,
    undefined,
    undefined,
    homeA ? 8 : 0,
  );

  inn1.target = undefined;
  const target = inn1.totalRuns + 1;
  const chaseWins = rng() > (ctx.venue.typicalDew === "Heavy" ? 0.42 : 0.5);
  const chaseDepth = analyzeBattingDepth(ctx.teamB);
  const chaseWickets = pickWickets(
    rng,
    ctx.venue.pitchType,
    true,
    chaseWins,
    ctx.teamA,
    chaseDepth,
  );
  const chaseTotal = chaseWins
    ? target + Math.floor(rng() * 12)
    : target - 1 - Math.floor(rng() * 16);

  const inn2 = buildInnings(
    ctx.teamB,
    ctx.teamA,
    ctx.matchOvers,
    ctx.venue.pitchType,
    rng,
    chaseTotal,
    chaseWickets,
    homeB ? 5 : 0,
  );
  inn2.target = target;

  inn1.bowling = buildBowlingFromQuota(ctx.teamB, inn1.totalRuns, inn1.totalWickets, ctx.matchOvers);
  inn2.bowling = buildBowlingFromQuota(ctx.teamA, inn2.totalRuns, inn2.totalWickets, ctx.matchOvers);

  const enriched: MatchResult = {
    ...match,
    matchTitle: `${ctx.teamA.name} vs ${ctx.teamB.name}`,
    venue: ctx.venue.name,
    venueCity: ctx.venue.city,
    pitchType: ctx.venue.pitchType,
    pitchDescription: ctx.venue.pitchDescription,
    dewCondition: ctx.venue.typicalDew,
    toss: match.toss.winner ? match.toss : {
      winner: ctx.teamA.name,
      decision: "bat",
      decisionText: `${ctx.teamA.name} chose to bat first`,
    },
    impactPlayers: match.impactPlayers.length
      ? match.impactPlayers.map((ip) => ({
          ...ip,
          playerIn: cleanName(ip.playerIn),
          teamName: ip.teamName || ctx.teamA.name,
        }))
      : ctx.teamA.impactPlayer
        ? [{
            teamName: ctx.teamA.name,
            playerIn: cleanName(ctx.teamA.impactPlayer.name),
            reason: ctx.teamA.impactPlayer.notes || "Impact substitution",
            activatedAt: "2nd innings fielding",
          }]
        : [],
    innings: [inn1, inn2],
    partnerships: { firstInnings: [], secondInnings: [] },
    fallOfWickets: { firstInnings: [], secondInnings: [] },
    result: { winner: "", margin: "", summary: "" },
    playerOfTheMatch: "",
  };

  rebuildPartnershipsAndFow(enriched, ctx.matchOvers);

  if (inn2.totalRuns >= target) {
    const wktsLeft = 10 - inn2.totalWickets;
    enriched.result = {
      winner: ctx.teamB.name,
      margin: `by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`,
      summary: `${ctx.teamB.name} won by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`,
    };
  } else {
    const margin = target - inn2.totalRuns - 1;
    enriched.result = {
      winner: ctx.teamA.name,
      margin: `by ${Math.max(1, margin)} run${margin === 1 ? "" : "s"}`,
      summary: `${ctx.teamA.name} won by ${Math.max(1, margin)} runs`,
    };
  }

  enriched.playerOfTheMatch = pickMom(enriched);
  return enriched;
}
