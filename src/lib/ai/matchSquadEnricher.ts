import type { MatchResult, ParsedTeam } from "./matchSchema";
import type { IplVenue } from "@/data/iplVenues";
import { sanitizePlayerName, namesMatch } from "./playerNames";
import {
  weightedInningsTotal,
  roleBasedInnings,
  phaseHintForIndex,
  generateExtras,
  distributeWicketsByQuota,
  pressureWicketAdjust,
  pickDismissalType,
  isSpinnerName,
  pitchMaxTotal,
  pitchSrLimits,
} from "./realismEngine";
import {
  getBatterProfile,
  conditionPerformanceBoost,
  bowlerWicketWeightBoost,
  isValidImpactActivatedAt,
} from "./playerPerformance";
import {
  buildBowlingRowsFromQuota,
  distributeWicketsWeightedForTeam,
  type BuildBowlingContext,
} from "./bowlingFigures";

function cleanName(name: string): string {
  return sanitizePlayerName(name);
}

function nameMatch(a: string, b: string): boolean {
  return namesMatch(a, b);
}

function isNotOut(status: string): boolean {
  return /not out/i.test(status);
}

function scaleBattingBallCounts(
  batting: MatchResult["innings"][0]["batting"],
  maxBalls: number,
): void {
  const total = batting.reduce((s, b) => s + b.balls, 0);
  if (total <= maxBalls || total === 0) return;

  let scaled = 0;
  for (let i = 0; i < batting.length; i++) {
    const b = batting[i];
    if (i === batting.length - 1) {
      b.balls = Math.max(1, maxBalls - scaled);
    } else {
      b.balls = Math.max(1, Math.round((b.balls / total) * maxBalls));
      scaled += b.balls;
    }
    if (b.runs === 0) b.balls = Math.min(b.balls, 3);
    b.strikeRate = b.balls > 0 ? Math.round((b.runs / b.balls) * 1000) / 10 : 0;
  }
}

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

export function createSeededRng(seed: string): () => number {
  return seededRandom(seed);
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

function distributeRunDiff(
  batting: MatchResult["innings"][0]["batting"],
  diff: number,
  rng: () => number,
): void {
  if (diff === 0 || !batting.length) return;
  let remaining = diff;
  const order =
    diff > 0
      ? [...batting].reverse()
      : [...batting].sort((a, b) => a.runs - b.runs);
  let guard = 0;
  while (remaining !== 0 && guard < batting.length * 40) {
    const b = order[guard % order.length];
    if (remaining > 0) {
      b.runs += 1;
      remaining -= 1;
    } else if (b.runs > 0) {
      b.runs -= 1;
      remaining += 1;
    }
    guard++;
  }
  for (const b of batting) {
    const bnd = syncBoundaries(b.runs, rng);
    b.fours = bnd.fours;
    b.sixes = bnd.sixes;
  }
}

function applyPitchSrCaps(
  batting: MatchResult["innings"][0]["batting"],
  pitchType: string,
): void {
  for (let i = 0; i < batting.length; i++) {
    const b = batting[i];
    const phase = phaseHintForIndex(i);
    const roleKind = isNotOut(b.status)
      ? i >= 5
        ? "notout"
        : "finisher"
      : i <= 1
        ? "aggressor"
        : i === 2
          ? "anchor"
          : "finisher";
    const limits = pitchSrLimits(pitchType, phase, roleKind);
    const capped = clampStrikeRateLocal(b.runs, b.balls, limits.min, limits.max);
    b.balls = capped.balls;
    b.strikeRate = b.balls > 0 ? Math.round((b.runs / b.balls) * 1000) / 10 : 0;
  }
}

function clampStrikeRateLocal(
  runs: number,
  balls: number,
  minSr: number,
  maxSr: number,
): { runs: number; balls: number } {
  if (balls < 1) balls = 1;
  const sr = (runs / balls) * 100;
  if (sr > maxSr) {
    balls = Math.max(1, Math.ceil((runs / maxSr) * 100));
  } else if (runs > 0 && sr < minSr) {
    balls = Math.max(1, Math.min(balls, Math.floor((runs / minSr) * 100)));
  }
  return { runs, balls: Math.max(1, balls) };
}

function resolveInningsOrder(
  ctx: SquadEnrichContext,
  match: MatchResult,
): {
  firstBat: ParsedTeam;
  firstBowl: ParsedTeam;
  secondBat: ParsedTeam;
  secondBowl: ParsedTeam;
} {
  const toss = match.toss;
  const aWins = nameMatch(toss.winner, ctx.teamA.name);
  const winner = aWins ? ctx.teamA : ctx.teamB;
  const loser = aWins ? ctx.teamB : ctx.teamA;
  const winnerBatsFirst = toss.decision === "bat";

  return {
    firstBat: winnerBatsFirst ? winner : loser,
    firstBowl: winnerBatsFirst ? loser : winner,
    secondBat: winnerBatsFirst ? loser : winner,
    secondBowl: winnerBatsFirst ? winner : loser,
  };
}

function impactActivatedAt(
  team: ParsedTeam,
  toss: MatchResult["toss"],
  ctx: SquadEnrichContext,
): string {
  const aWins = nameMatch(toss.winner, ctx.teamA.name);
  const winner = aWins ? ctx.teamA : ctx.teamB;
  const teamBatsFirst =
    (nameMatch(team.name, winner.name) && toss.decision === "bat") ||
    (!nameMatch(team.name, winner.name) && toss.decision === "bowl");
  return teamBatsFirst ? "2nd innings fielding" : "2nd innings batting";
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
  const base = min + Math.floor(rng() * (max - min + 1));
  return pressureWicketAdjust(base, isChase, chaseWon, isChase ? 11.5 : 8, rng);
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

function distributeWickets(totalWickets: number, oversPerBowler: number[]): number[] {
  return distributeWicketsByQuota(totalWickets, oversPerBowler);
}

function distributeWicketsWeighted(
  totalWickets: number,
  fieldingTeam: ParsedTeam,
  pitchType: string,
): number[] {
  const quota = fieldingTeam.bowlingQuota;
  if (!quota.length || totalWickets <= 0) {
    return new Array(quota.length).fill(0);
  }
  const weights = quota.map(
    (q) => q.overs.length * bowlerWicketWeightBoost(cleanName(q.name), fieldingTeam, pitchType),
  );
  return distributeWicketsByQuota(totalWickets, weights);
}

export function applyDismissalBowlers(
  batting: MatchResult["innings"][0]["batting"],
  opposition: ParsedTeam,
  pitchType: string,
  rng: () => number,
): void {
  const dismissed = batting.filter((b) => !isNotOut(b.status));
  if (!opposition.bowlingQuota.length || !dismissed.length) return;

  let runOutCount = dismissed.filter((b) => /^run out/i.test(b.status.trim())).length;
  if (runOutCount === 0) {
    runOutCount =
      dismissed.length >= 7 && rng() > 0.82 ? 1 : dismissed.length >= 9 && rng() > 0.7 ? 1 : 0;
  }
  const bowlerCreditWkts = Math.max(0, dismissed.length - runOutCount);
  const wktCounts = distributeWicketsWeighted(bowlerCreditWkts, opposition, pitchType);
  const pool = opposition.bowlingQuota.map((q, i) => {
    const p = opposition.playingXI.find((x) => nameMatch(x.name, q.name));
    return {
      name: cleanName(q.name),
      spin: isSpinnerName(q.name, p?.role),
      remaining: wktCounts[i] ?? 0,
    };
  });

  const runOutIndices = new Set<number>();
  if (runOutCount > 0) {
    const existing = dismissed
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => /^run out/i.test(b.status.trim()));
    if (existing.length) {
      existing.forEach(({ i }) => runOutIndices.add(i));
    } else {
      const tailIdx = dismissed.length - 1 - Math.floor(rng() * Math.min(3, dismissed.length));
      runOutIndices.add(Math.max(0, tailIdx));
    }
  }

  for (let i = 0; i < dismissed.length; i++) {
    const b = dismissed[i];
    if (/^run out/i.test(b.status.trim())) continue;

    const idx = batting.indexOf(b);
    const phase = phaseHintForIndex(idx);

    if (runOutIndices.has(i)) {
      b.status = "run out (fielder)";
      continue;
    }

    let candidates = pool.filter((x) => x.remaining > 0);
    if (!candidates.length) candidates = pool.filter((x) => x.remaining >= 0);

    if ((pitchType === "Turning" || pitchType === "Slow") && phase === "middle") {
      const spinners = candidates.filter((c) => c.spin);
      if (spinners.length) candidates = spinners;
    }
    if (pitchType === "Green" && phase === "powerplay") {
      const pacers = candidates.filter((c) => !c.spin);
      if (pacers.length) candidates = pacers;
    }

    const pick = candidates[Math.floor(rng() * candidates.length)] ?? pool[0];
    if (pick) {
      pick.remaining = Math.max(0, pick.remaining - 1);
      b.status = pickDismissalType(pick.name, rng, pick.spin);
    }
  }
}

function buildBowlingFromQuota(
  fieldingTeam: ParsedTeam,
  runsConceded: number,
  wickets: number,
  matchOvers: number,
  pitchType: string,
  bowlingCtx: BuildBowlingContext,
  batting?: MatchResult["innings"][0]["batting"],
): NonNullable<MatchResult["innings"][0]["bowling"]> {
  const quota = fieldingTeam.bowlingQuota;
  if (!quota.length) return [];

  let wktSplit: number[];
  if (batting?.length) {
    wktSplit = wicketSplitFromDismissals(batting, fieldingTeam, wickets, pitchType);
  } else {
    wktSplit = distributeWicketsWeightedForTeam(Math.max(0, wickets), fieldingTeam, pitchType);
  }

  return buildBowlingRowsFromQuota(fieldingTeam, runsConceded, wktSplit, {
    ...bowlingCtx,
    pitchType,
    matchOvers,
  });
}

function wicketSplitFromDismissals(
  batting: MatchResult["innings"][0]["batting"],
  fieldingTeam: ParsedTeam,
  totalWickets: number,
  pitchType: string,
): number[] {
  const quota = fieldingTeam.bowlingQuota;
  const counts = new Array(quota.length).fill(0);
  let runOuts = 0;

  for (const b of batting) {
    if (isNotOut(b.status)) continue;
    if (/^run out/i.test(b.status.trim())) {
      runOuts++;
      continue;
    }
    const bowler = extractDismissalBowlerName(b.status);
    if (!bowler) continue;
    const idx = quota.findIndex((q) => nameMatch(q.name, bowler));
    if (idx >= 0) counts[idx]++;
  }

  const credited = counts.reduce((a, c) => a + c, 0);
  const expectedCredits = Math.max(0, totalWickets - runOuts);

  if (credited === expectedCredits) return counts;

  const fallback = distributeWicketsWeighted(expectedCredits, fieldingTeam, pitchType);
  if (credited === 0) return fallback;

  for (let i = 0; i < counts.length; i++) {
    if (counts[i] > fallback[i]) counts[i] = fallback[i];
  }
  let assigned = counts.reduce((a, c) => a + c, 0);
  let i = 0;
  while (assigned < expectedCredits) {
    counts[i % counts.length]++;
    assigned++;
    i++;
  }
  return counts;
}

function extractDismissalBowlerName(status: string): string | null {
  const st = status.trim();
  if (/not out/i.test(st) || /^run out/i.test(st)) return null;
  const bMatch = st.match(/\bb\s+(.+)$/i);
  if (bMatch) return cleanName(bMatch[1]);
  const stMatch = st.match(/^st\s+(.+)$/i);
  if (stMatch) return cleanName(stMatch[1]);
  return null;
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
  isChase = false,
): MatchResult["innings"][0] {
  const squadOrder = getBattingSquad(squad, true);
  const depth = analyzeBattingDepth(squad);
  const weighted =
    forcedTotal === undefined
      ? weightedInningsTotal(pitchType, matchOvers, homeBoost, rng)
      : { total: forcedTotal, firestorm: forcedTotal >= 200 && pitchType === "Flat" };
  const wickets =
    forcedWickets ??
    pickWickets(rng, pitchType, forcedTotal !== undefined, false, opposition, depth);
  const notOutCount = notOutsForWickets(wickets);
  const battersCount = wickets + notOutCount;

  const targetTotal = weighted.total;
  const highPressure = isChase && targetTotal >= 180;
  const extrasBlock = generateExtras(rng, isChase, highPressure);
  const { wides, noBalls, byes, legByes } = extrasBlock;
  const totalExtras = extrasBlock.total;
  const batRunsNeeded = targetTotal - totalExtras;

  const batting: MatchResult["innings"][0]["batting"] = [];
  const impactNames = squad.impactPlayer ? [squad.impactPlayer.name] : [];

  for (let i = 0; i < battersCount && i < squadOrder.length; i++) {
    const name = squadOrder[i];
    const player = squad.playingXI.find((p) => nameMatch(p.name, name));
    const role = player?.role ?? "unknown";
    const isNo = i >= wickets;
    const phase = phaseHintForIndex(i);
    const profile = getBatterProfile(squad, name, impactNames);
    let { runs, balls } = roleBasedInnings(i, role, isNo, phase, pitchType, rng);

    const boost = conditionPerformanceBoost(profile, pitchType, phase, i, rng);
    runs += boost.runsBonus;

    if (profile.overseas && i <= 1 && (pitchType === "Flat" || pitchType === "Balanced") && runs < 14) {
      runs = 14 + Math.floor(rng() * 22);
    }
    if (profile.isNew && isNo && runs < 8 && rng() > 0.25) {
      runs = 8 + Math.floor(rng() * 22);
    }
    if (profile.isNew && !isNo && runs < 6 && boost.heroInnings) {
      runs = 10 + Math.floor(rng() * 28);
    }

    if (weighted.firestorm && i <= 1 && !isNo) {
      runs = Math.min(85, runs + 15 + Math.floor(rng() * 35));
      balls = Math.max(balls, Math.round(runs * 0.72));
    }

    const { fours, sixes } = syncBoundaries(runs, rng);
    batting.push({
      name,
      status: isNo ? "not out" : "b Bowler",
      runs,
      balls,
      fours,
      sixes,
      strikeRate: balls > 0 ? Math.round((runs / balls) * 1000) / 10 : 0,
    });
  }

  applyDismissalBowlers(batting, opposition, pitchType, rng);

  let sum = batting.reduce((s, b) => s + b.runs, 0);
  const diff = batRunsNeeded - sum;
  if (diff !== 0) {
    distributeRunDiff(batting, diff, rng);
    sum = batting.reduce((s, b) => s + b.runs, 0);
  }

  scaleBattingBallCounts(batting, matchOvers * 6);
  applyPitchSrCaps(batting, pitchType);
  for (const b of batting) {
    if (b.runs === 0) b.balls = Math.min(b.balls, 3);
    if (b.balls > 0) {
      b.strikeRate = Math.round((b.runs / b.balls) * 1000) / 10;
    }
  }

  let totalRuns = sum + totalExtras;
  const maxTotal = pitchMaxTotal(pitchType) + (homeBoost > 0 ? homeBoost : 0);
  if (totalRuns > maxTotal && sum > 0) {
    const scale = (maxTotal - totalExtras) / sum;
    for (const b of batting) {
      b.runs = Math.max(0, Math.floor(b.runs * scale));
      const bnd = syncBoundaries(b.runs, rng);
      b.fours = bnd.fours;
      b.sixes = bnd.sixes;
    }
    sum = batting.reduce((s, b) => s + b.runs, 0);
    totalRuns = sum + totalExtras;
  }
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
    let inningsBalls = 0;
    let wkt = 0;
    let striker = batting[0]?.name ?? "";
    let nonStriker = batting[1]?.name ?? "";

    for (let i = 0; i < batting.length; i++) {
      const b = batting[i];
      inningsBalls += b.balls;
      cumRuns += b.runs;

      if (isNotOut(b.status)) continue;

      wkt++;
      const ballPos = Math.min(inningsBalls, maxBalls);

      let partner = nameMatch(b.name, striker) ? nonStriker : striker;
      if (!partner || nameMatch(partner, b.name)) {
        partner =
          batting.slice(i + 1).find((x) => !nameMatch(x.name, b.name))?.name ??
          batting.slice(0, i).reverse().find((x) => !nameMatch(x.name, b.name))?.name ??
          "";
      }
      const battersLabel =
        partner && !nameMatch(partner, b.name) ? `${partner} & ${b.name}` : b.name;

      partnerships.push({
        wicket: wkt,
        runs: cumRuns,
        balls: ballPos,
        batters: battersLabel,
      });
      fow.push({
        score: `${cumRuns}-${wkt}`,
        over: `${Math.floor(ballPos / 6)}.${ballPos % 6}`,
        batter: b.name,
      });

      const incoming = batting[i + 1]?.name ?? "";
      if (nameMatch(b.name, striker)) striker = incoming || striker;
      else if (nameMatch(b.name, nonStriker)) nonStriker = incoming || nonStriker;
      else striker = incoming || striker;
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
  const tossSalt = match.toss?.winner
    ? `${match.toss.winner}-${match.toss.decision}`
    : `${Date.now()}`;
  const seed = `${ctx.teamA.name}-${ctx.teamB.name}-${ctx.venue.id}-${ctx.matchOvers}-${tossSalt}`;
  const rng = seededRandom(seed);

  const toss: MatchResult["toss"] =
    match.toss?.winner && match.toss?.decision
      ? match.toss
      : {
          winner: ctx.teamA.name,
          decision: "bat",
          decisionText: `${ctx.teamA.name} won the toss and elected to bat first`,
        };

  const order = resolveInningsOrder(ctx, { ...match, toss });

  const homeFirst = isHomeSide(order.firstBat, ctx.venue) ? 6 : 0;
  const homeSecond = isHomeSide(order.secondBat, ctx.venue) ? 4 : 0;

  const inn1 = buildInnings(
    order.firstBat,
    order.firstBowl,
    ctx.matchOvers,
    ctx.venue.pitchType,
    rng,
    undefined,
    undefined,
    homeFirst,
  );

  inn1.target = undefined;
  const target = inn1.totalRuns + 1;
  const chaseWins = rng() > (ctx.venue.typicalDew === "Heavy" ? 0.42 : 0.5);
  const chaseDepth = analyzeBattingDepth(order.secondBat);
  let chaseWickets = pickWickets(
    rng,
    ctx.venue.pitchType,
    true,
    chaseWins,
    order.firstBowl,
    chaseDepth,
  );

  const nailBiter = rng() < (ctx.venue.typicalDew === "Heavy" ? 0.58 : 0.48);
  let chaseMargin: number;
  if (chaseWins) {
    if (nailBiter) {
      const tight = rng() > 0.45;
      if (tight) {
        chaseMargin = 1 + Math.floor(rng() * 4);
        chaseWickets = Math.max(3, Math.min(7, chaseWickets));
      } else {
        chaseMargin = 1 + Math.floor(rng() * 7);
        chaseWickets = Math.max(4, Math.min(9, chaseWickets + Math.floor(rng() * 2)));
      }
    } else {
      chaseMargin = 1 + Math.floor(rng() * 10);
    }
  } else if (nailBiter) {
    chaseMargin = 1 + Math.floor(rng() * 5);
    chaseWickets = Math.max(6, Math.min(10, chaseWickets + 1));
  } else {
    chaseMargin = 1 + Math.floor(rng() * 14);
  }
  const chaseTotal = chaseWins ? target + chaseMargin - 1 : target - chaseMargin;

  const inn2 = buildInnings(
    order.secondBat,
    order.secondBowl,
    ctx.matchOvers,
    ctx.venue.pitchType,
    rng,
    Math.max(1, chaseTotal),
    chaseWickets,
    homeSecond,
    true,
  );
  inn2.target = target;

  inn1.bowling = buildBowlingFromQuota(
    order.firstBowl,
    inn1.totalRuns,
    inn1.totalWickets,
    ctx.matchOvers,
    ctx.venue.pitchType,
    {
      pitchType: ctx.venue.pitchType,
      dewCondition: ctx.venue.typicalDew,
      inningsIndex: 0,
      matchOvers: ctx.matchOvers,
      boundarySize: ctx.venue.boundarySize,
      seedKey: `${ctx.teamA.name}-${ctx.teamB.name}-${ctx.venue.id}`,
    },
    inn1.batting,
  );
  inn2.bowling = buildBowlingFromQuota(
    order.secondBowl,
    inn2.totalRuns,
    inn2.totalWickets,
    ctx.matchOvers,
    ctx.venue.pitchType,
    {
      pitchType: ctx.venue.pitchType,
      dewCondition: ctx.venue.typicalDew,
      inningsIndex: 1,
      matchOvers: ctx.matchOvers,
      boundarySize: ctx.venue.boundarySize,
      seedKey: `${ctx.teamA.name}-${ctx.teamB.name}-${ctx.venue.id}`,
    },
    inn2.batting,
  );

  const impactPlayers =
    match.impactPlayers.length > 0
      ? match.impactPlayers.map((ip) => ({
          ...ip,
          playerIn: cleanName(ip.playerIn),
          activatedAt:
            isValidImpactActivatedAt(ip.activatedAt)
              ? ip.activatedAt
              : impactActivatedAt(
                  nameMatch(ip.teamName, ctx.teamA.name) ? ctx.teamA : ctx.teamB,
                  toss,
                  ctx,
                ),
        }))
      : [ctx.teamA, ctx.teamB]
          .filter((t) => t.impactPlayer)
          .map((t) => ({
            teamName: t.name,
            playerIn: cleanName(t.impactPlayer!.name),
            reason: t.impactPlayer!.notes || "Impact substitution",
            activatedAt: impactActivatedAt(t, toss, ctx),
          }));

  const enriched: MatchResult = {
    ...match,
    matchTitle: `${ctx.teamA.name} vs ${ctx.teamB.name}`,
    venue: ctx.venue.name,
    venueCity: ctx.venue.city,
    pitchType: ctx.venue.pitchType,
    pitchDescription: ctx.venue.pitchDescription,
    dewCondition: ctx.venue.typicalDew,
    toss,
    impactPlayers,
    innings: [inn1, inn2],
    partnerships: { firstInnings: [], secondInnings: [] },
    fallOfWickets: { firstInnings: [], secondInnings: [] },
    result: { winner: "", margin: "", summary: "" },
    playerOfTheMatch: "",
  };

  rebuildPartnershipsAndFow(enriched, ctx.matchOvers);

  if (inn2.totalRuns >= target) {
    const wktsLeft = 10 - inn2.totalWickets;
    const runsAbove = inn2.totalRuns - target + 1;
    const thriller =
      runsAbove <= 4 || wktsLeft <= 2
        ? " in a thriller"
        : runsAbove <= 8 || wktsLeft <= 4
          ? " in a tight finish"
          : "";
    enriched.result = {
      winner: order.secondBat.name,
      margin: `by ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"}`,
      summary: `${order.secondBat.name} chased ${target} with ${wktsLeft} wicket${wktsLeft === 1 ? "" : "s"} to spare${thriller}`,
    };
  } else {
    const margin = target - inn2.totalRuns - 1;
    const thriller = margin <= 4 ? " in a nail-biter" : margin <= 10 ? " in a close finish" : "";
    enriched.result = {
      winner: order.firstBat.name,
      margin: `by ${Math.max(1, margin)} run${margin === 1 ? "" : "s"}`,
      summary: `${order.firstBat.name} defended ${inn1.totalRuns} by ${Math.max(1, margin)} run${margin === 1 ? "" : "s"}${thriller}`,
    };
  }

  enriched.playerOfTheMatch = pickMom(enriched);
  return enriched;
}
