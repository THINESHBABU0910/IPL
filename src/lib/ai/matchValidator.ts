import type { MatchResult, ParsedTeam } from "./matchSchema";
import { rebuildPartnershipsAndFow, syncBoundaries, notOutsForWickets } from "./matchSquadEnricher";
import { sanitizePlayerName, sanitizeDismissalStatus, namesMatch } from "./playerNames";
import {
  buildBowlingRowsFromQuota,
  distributeWicketsWeightedForTeam,
  economySpread,
  type BuildBowlingContext,
} from "./bowlingFigures";
import { syncAllDismissals, validateFallOfWickets } from "./dismissalSync";
import { polishMatchResult } from "./matchPolish";

function isNotOut(status: string): boolean {
  return /not out/i.test(status);
}

function isRunOut(status: string): boolean {
  return /^run out/i.test(status.trim());
}

function extractDismissalBowler(status: string): string | null {
  const st = sanitizeDismissalStatus(status);
  if (/not out/i.test(st) || isRunOut(st)) return null;
  const bMatch = st.match(/\bb\s+(.+)$/i);
  if (bMatch) {
    const name = sanitizePlayerName(bMatch[1]);
    if (/^bowler$/i.test(name)) return null;
    return name;
  }
  const stMatch = st.match(/^st\s+(.+)$/i);
  if (stMatch) return sanitizePlayerName(stMatch[1]);
  return null;
}

function countRunOuts(batting: MatchResult["innings"][0]["batting"]): number {
  return batting.filter((b) => !isNotOut(b.status) && isRunOut(b.status)).length;
}

export function resolveFieldingTeams(
  match: MatchResult,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
): { inningsIdx: number; fieldingTeam: ParsedTeam }[] {
  const toss = match.toss;
  const aWins = namesMatch(toss.winner, teamA.name);
  const winner = aWins ? teamA : teamB;
  const loser = aWins ? teamB : teamA;
  const winnerBatsFirst = toss.decision === "bat";
  const firstBowl = winnerBatsFirst ? loser : winner;
  const secondBowl = winnerBatsFirst ? winner : loser;
  return [
    { inningsIdx: 0, fieldingTeam: firstBowl },
    { inningsIdx: 1, fieldingTeam: secondBowl },
  ];
}

function distributeWicketsForTeam(
  totalCredits: number,
  fieldingTeam: ParsedTeam,
  pitchType: string,
): number[] {
  return distributeWicketsWeightedForTeam(totalCredits, fieldingTeam, pitchType);
}

function wicketCountsFromDismissals(
  batting: MatchResult["innings"][0]["batting"],
  fieldingTeam: ParsedTeam,
  totalWickets: number,
  pitchType: string,
): number[] {
  const quota = fieldingTeam.bowlingQuota;
  const counts = new Array(quota.length).fill(0);
  const runOuts = countRunOuts(batting);
  const expectedCredits = Math.max(0, totalWickets - runOuts);

  for (const b of batting) {
    if (isNotOut(b.status) || isRunOut(b.status)) continue;
    const bowler = extractDismissalBowler(b.status);
    if (!bowler) continue;
    const idx = quota.findIndex((q) => namesMatch(q.name, bowler));
    if (idx >= 0) counts[idx]++;
  }

  const credited = counts.reduce((a, c) => a + c, 0);
  if (credited === expectedCredits) return counts;

  const fallback = distributeWicketsForTeam(expectedCredits, fieldingTeam, pitchType);
  if (credited === 0) return fallback;

  for (let i = 0; i < counts.length; i++) {
    counts[i] = Math.min(counts[i], fallback[i] + 1);
  }
  let assigned = counts.reduce((a, c) => a + c, 0);
  let i = 0;
  while (assigned < expectedCredits) {
    counts[i % counts.length]++;
    assigned++;
    i++;
  }
  while (assigned > expectedCredits) {
    const idx = counts.findIndex((c) => c > 0);
    if (idx < 0) break;
    counts[idx]--;
    assigned--;
  }
  return counts;
}

function fixOrphanDismissals(
  batting: MatchResult["innings"][0]["batting"],
  bowling: NonNullable<MatchResult["innings"][0]["bowling"]>,
  fieldingTeam: ParsedTeam,
): void {
  const dismissed = batting.filter((b) => !isNotOut(b.status) && !isRunOut(b.status));
  const quota = fieldingTeam.bowlingQuota;
  if (!quota.length) return;

  const wktRemaining = new Map<string, number>();
  for (const row of bowling) {
    wktRemaining.set(row.name.toLowerCase(), row.wickets);
  }

  for (const b of dismissed) {
    const bowler = extractDismissalBowler(b.status);
    if (bowler && quota.some((q) => namesMatch(q.name, bowler))) continue;

    const pick = bowling.find((row) => (wktRemaining.get(row.name.toLowerCase()) ?? 0) > 0)
      ?? bowling.slice().sort((a, c) => c.wickets - a.wickets)[0];
    if (!pick) continue;

    wktRemaining.set(pick.name.toLowerCase(), Math.max(0, (wktRemaining.get(pick.name.toLowerCase()) ?? 0) - 1));
    b.status = `b ${pick.name}`;
  }
}

export function rebuildBowlingForInnings(
  inn: MatchResult["innings"][0],
  fieldingTeam: ParsedTeam,
  bowlingCtx: BuildBowlingContext,
): NonNullable<MatchResult["innings"][0]["bowling"]> {
  const quota = fieldingTeam.bowlingQuota;
  if (!quota.length) return [];

  let wktSplit = wicketCountsFromDismissals(
    inn.batting,
    fieldingTeam,
    inn.totalWickets,
    bowlingCtx.pitchType,
  );

  let rows = buildBowlingRowsFromQuota(fieldingTeam, inn.totalRuns, wktSplit, bowlingCtx);
  fixOrphanDismissals(inn.batting, rows, fieldingTeam);

  wktSplit = wicketCountsFromDismissals(
    inn.batting,
    fieldingTeam,
    inn.totalWickets,
    bowlingCtx.pitchType,
  );
  rows = buildBowlingRowsFromQuota(fieldingTeam, inn.totalRuns, wktSplit, bowlingCtx);
  return rows;
}

export function rebuildBowlingForMatch(
  match: MatchResult,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
  pitchType: string,
  matchOvers: number,
  boundarySize?: string,
  seedSuffix = "0",
): MatchResult {
  const fielding = resolveFieldingTeams(match, teamA, teamB);
  const seedKey = `${match.matchTitle || `${teamA.name}-${teamB.name}-${match.venue}`}-${seedSuffix}`;
  const innings = match.innings.map((inn, idx) => {
    const mapping = fielding.find((f) => f.inningsIdx === idx);
    if (!mapping) return inn;
    const bowling = rebuildBowlingForInnings(inn, mapping.fieldingTeam, {
      pitchType,
      dewCondition: match.dewCondition,
      inningsIndex: idx,
      matchOvers,
      boundarySize,
      seedKey: `${seedKey}-inn${idx}`,
    });
    return { ...inn, bowling };
  }) as MatchResult["innings"];

  const updated = { ...match, innings };
  rebuildPartnershipsAndFow(updated, matchOvers);
  return updated;
}

export function ensureMatchReadyForPdf(
  match: MatchResult,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
  pitchType: string,
  matchOvers: number,
  boundarySize?: string,
): MatchResult {
  let current: MatchResult = {
    ...match,
    innings: match.innings.map((inn) => ({
      ...inn,
      batting: inn.batting.map((b) => ({ ...b })),
      extras: { ...inn.extras },
    })) as MatchResult["innings"],
  };

  for (let pass = 0; pass < 3; pass++) {
    current = repairMatchStats(current, matchOvers);
    current = syncAllDismissals(current, teamA, teamB, pitchType);
    current = rebuildBowlingForMatch(
      current,
      teamA,
      teamB,
      pitchType,
      matchOvers,
      boundarySize,
      `pass-${pass}`,
    );
    rebuildPartnershipsAndFow(current, matchOvers);

    const errors = [
      ...validateMatchResult(current, matchOvers, teamA, teamB),
      ...validateBowlingFromQuota(current, teamA, teamB, matchOvers),
      ...validateBowlingStats(current, teamA, teamB, matchOvers),
      ...validateDismissalsAgainstBowling(current, teamA, teamB),
      ...validateFallOfWickets(current),
    ];
    if (errors.length === 0) break;
  }

  current = polishMatchResult(current, matchOvers);
  syncAllDismissals(current, teamA, teamB, pitchType);
  current = rebuildBowlingForMatch(current, teamA, teamB, pitchType, matchOvers, boundarySize, "final");
  rebuildPartnershipsAndFow(current, matchOvers);
  return current;
}

function countNotOuts(batting: MatchResult["innings"][0]["batting"]): number {
  return batting.filter((b) => isNotOut(b.status)).length;
}

function sumBattingRuns(batting: MatchResult["innings"][0]["batting"]): number {
  return batting.reduce((s, b) => s + b.runs, 0);
}

function countDismissed(batting: MatchResult["innings"][0]["batting"]): number {
  return batting.filter((b) => !isNotOut(b.status)).length;
}

/** Recompute totals, wickets, SR, target and result from batting rows (LLM often gets these wrong) */
export function repairMatchStats(match: MatchResult, matchOvers: number): MatchResult {
  const repaired: MatchResult = {
    ...match,
    innings: match.innings.map((inn) => ({
      ...inn,
      batting: inn.batting.map((b) => ({ ...b })),
      extras: { ...inn.extras },
    })) as MatchResult["innings"],
    result: { ...match.result },
  };

  for (const inn of repaired.innings) {
    for (const b of inn.batting) {
      b.name = sanitizePlayerName(b.name);
      b.status = sanitizeDismissalStatus(b.status);
      if (/^dismissed$/i.test(b.status.trim())) {
        b.status = "b Bowler";
      }
      const boundaryRuns = b.fours * 4 + b.sixes * 6;
      if (boundaryRuns > b.runs || (b.runs > 0 && boundaryRuns === 0)) {
        const fixed = syncBoundaries(b.runs, () => 0.5);
        b.fours = fixed.fours;
        b.sixes = fixed.sixes;
      }
      if (b.runs === 0) {
        b.balls = Math.min(b.balls, 3);
      }
      if (b.balls > 0) {
        b.strikeRate = Math.round((b.runs / b.balls) * 1000) / 10;
      } else {
        b.strikeRate = 0;
      }
    }

    const componentExtras =
      inn.extras.wides + inn.extras.noBalls + inn.extras.byes + inn.extras.legByes;
    if (inn.extras.total < componentExtras) {
      inn.extras.total = componentExtras;
    }

    const batRuns = sumBattingRuns(inn.batting);
    inn.totalRuns = batRuns + inn.extras.total;

    const dismissedCount = countDismissed(inn.batting);
    if (dismissedCount >= inn.totalWickets) {
      inn.totalWickets = Math.min(10, dismissedCount);
    } else if (inn.totalWickets > 0 && dismissedCount < inn.totalWickets) {
      // Keep intended wicket count — syncAllDismissals will fix batting statuses
      inn.totalWickets = Math.min(10, inn.totalWickets);
    } else {
      inn.totalWickets = Math.min(10, dismissedCount);
    }

    const expectedNotOuts = notOutsForWickets(inn.totalWickets);
    let notOuts = countNotOuts(inn.batting);
    if (notOuts > expectedNotOuts) {
      const notOutBatters = inn.batting
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => isNotOut(b.status))
        .sort((a, c) => a.b.runs - c.b.runs);
      for (let k = expectedNotOuts; k < notOutBatters.length; k++) {
        notOutBatters[k].b.status = "b Bowler";
      }
      inn.totalWickets = Math.min(10, countDismissed(inn.batting));
      notOuts = countNotOuts(inn.batting);
    }

    if (notOuts > 2) {
      const notOutBatters = inn.batting
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => isNotOut(b.status))
        .sort((a, c) => c.b.runs - a.b.runs);
      for (let k = 2; k < notOutBatters.length; k++) {
        notOutBatters[k].b.status = "b Bowler";
      }
      inn.totalWickets = Math.min(10, countDismissed(inn.batting));
      notOuts = countNotOuts(inn.batting);
    }

    if (inn.totalWickets >= 10) {
      inn.overs = matchOvers;
    } else if (Math.abs(inn.overs - matchOvers) > 0.01 && inn.overs > matchOvers) {
      inn.overs = matchOvers;
    }

    inn.runRate = inn.overs > 0 ? Math.round((inn.totalRuns / inn.overs) * 100) / 100 : 0;

    if (inn.bowling?.length) {
      for (const bw of inn.bowling) {
        bw.name = sanitizePlayerName(bw.name);
      }
    }
  }

  const [inn1, inn2] = repaired.innings;
  inn2.target = inn1.totalRuns + 1;

  const target = inn2.target;
  const chased = inn2.totalRuns >= target;
  const wicketsLeft = 10 - inn2.totalWickets;

  if (chased) {
    repaired.result.winner = inn2.teamName;
    if (!repaired.result.margin.toLowerCase().includes("wicket")) {
      repaired.result.margin = `by ${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}`;
    }
    repaired.result.summary = `${inn2.teamName} won ${repaired.result.margin}`;
  } else {
    repaired.result.winner = inn1.teamName;
    const defMargin = target - inn2.totalRuns - 1;
    if (!repaired.result.margin.toLowerCase().includes("run")) {
      repaired.result.margin = `by ${Math.max(1, defMargin)} run${defMargin === 1 ? "" : "s"}`;
    }
    repaired.result.summary = `${inn1.teamName} won ${repaired.result.margin}`;
  }

  rebuildPartnershipsAndFow(repaired, matchOvers);

  return repaired;
}

export function validateMatchResult(
  match: MatchResult,
  matchOvers: number,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
): string[] {
  const errors: string[] = [];
  const [inn1, inn2] = match.innings;

  for (const [idx, inn] of [inn1, inn2].entries()) {
    const label = `Innings ${idx + 1} (${inn.teamName})`;

    const batRuns = sumBattingRuns(inn.batting);
    const expectedTotal = batRuns + inn.extras.total;
    if (inn.totalRuns !== expectedTotal) {
      errors.push(`${label}: totalRuns ${inn.totalRuns} != batting ${batRuns} + extras ${inn.extras.total} (${expectedTotal})`);
    }

    const extrasSum = inn.extras.wides + inn.extras.noBalls + inn.extras.byes + inn.extras.legByes;
    if (inn.extras.total < extrasSum) {
      errors.push(`${label}: extras.total ${inn.extras.total} less than component sum ${extrasSum}`);
    }

    const dismissed = inn.batting.filter((b) => !isNotOut(b.status)).length;
    if (inn.totalWickets !== dismissed) {
      errors.push(`${label}: totalWickets ${inn.totalWickets} != dismissed count ${dismissed}`);
    }

    const notOuts = countNotOuts(inn.batting);
    if (notOuts > 2) {
      errors.push(`${label}: ${notOuts} not-out batters (max 2 allowed)`);
    }

    if (Math.abs(inn.overs - matchOvers) > 0.01 && inn.totalWickets < 10) {
      errors.push(`${label}: overs ${inn.overs} expected ${matchOvers} (unless all-out)`);
    }

    for (const b of inn.batting) {
      if (b.balls > 0) {
        const expectedSr = Math.round((b.runs / b.balls) * 1000) / 10;
        if (Math.abs(expectedSr - b.strikeRate) > 0.2) {
          errors.push(`${label}: ${b.name} SR ${b.strikeRate} expected ~${expectedSr}`);
        }
      }
    }
  }

  if (inn2.target !== undefined && inn2.target !== inn1.totalRuns + 1) {
    errors.push(`Second innings target ${inn2.target} should be ${inn1.totalRuns + 1}`);
  }

  const firstBatting = match.toss.decision === "bat" ? match.toss.winner : (inn1.teamName === match.toss.winner ? teamB.name : teamA.name);
  if (!inn1.teamName.toLowerCase().includes(firstBatting.slice(0, 4).toLowerCase()) &&
      !firstBatting.toLowerCase().includes(inn1.teamName.slice(0, 4).toLowerCase())) {
    // Soft check — team names may differ in formatting
  }

  if (inn2.totalRuns > (inn2.target ?? inn1.totalRuns + 1) - 1) {
    if (!match.result.winner.toLowerCase().includes(inn2.teamName.slice(0, 4).toLowerCase())) {
      errors.push("Chasing team scored above target but winner may be incorrect");
    }
  } else if (inn2.totalRuns < (inn2.target ?? inn1.totalRuns + 1)) {
    if (!match.result.winner.toLowerCase().includes(inn1.teamName.slice(0, 4).toLowerCase())) {
      errors.push("Defending team should win when chase falls short");
    }
  }

  if (!match.result.winner || match.result.winner.length < 2) {
    errors.push("Missing result winner");
  }

  if (!match.playerOfTheMatch) {
    errors.push("Missing Player of the Match");
  }

  return errors;
}

export function validateBowlingFromQuota(
  match: MatchResult,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
  matchOvers: number,
): string[] {
  const errors: string[] = [];

  for (const { inningsIdx, fieldingTeam } of resolveFieldingTeams(match, teamA, teamB)) {
    const inn = match.innings[inningsIdx];
    if (!fieldingTeam.bowlingQuota.length) {
      errors.push(`Innings ${inningsIdx + 1}: no bowling quota for fielding side`);
      continue;
    }
    if (!inn.bowling?.length) {
      errors.push(`Innings ${inningsIdx + 1} (${inn.teamName}): missing bowling figures`);
      continue;
    }

    for (const bowler of inn.bowling) {
      const quota = fieldingTeam.bowlingQuota.find((q) => namesMatch(q.name, bowler.name));
      if (!quota) {
        errors.push(`Bowling: ${bowler.name} not in ${fieldingTeam.name} quota`);
        continue;
      }
      if (Math.abs(bowler.overs - quota.overs.length) > 0.01) {
        errors.push(
          `Bowling: ${bowler.name} bowled ${bowler.overs} overs, quota assigns ${quota.overs.length}`,
        );
      }
    }

    const totalBowlingOvers = inn.bowling.reduce((s, b) => s + b.overs, 0);
    if (Math.abs(totalBowlingOvers - matchOvers) > 0.1) {
      errors.push(
        `Innings ${inningsIdx + 1} bowling overs sum ${totalBowlingOvers}, expected ${matchOvers}`,
      );
    }
  }

  return errors;
}

export function validateBowlingStats(
  match: MatchResult,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
  _matchOvers: number,
): string[] {
  const errors: string[] = [];

  for (const { inningsIdx, fieldingTeam } of resolveFieldingTeams(match, teamA, teamB)) {
    const inn = match.innings[inningsIdx];
    const label = `Innings ${inningsIdx + 1} (${inn.teamName})`;
    if (!inn.bowling?.length) {
      errors.push(`${label}: missing bowling figures`);
      continue;
    }

    const runOuts = countRunOuts(inn.batting);
    const bowlingWkts = inn.bowling.reduce((s, b) => s + b.wickets, 0);
    const expectedBowlingWkts = Math.max(0, inn.totalWickets - runOuts);
    if (bowlingWkts !== expectedBowlingWkts) {
      errors.push(
        `${label}: bowling wickets ${bowlingWkts} != credited dismissals ${expectedBowlingWkts} (${runOuts} run out)`,
      );
    }

    const bowlingRuns = inn.bowling.reduce((s, b) => s + b.runs, 0);
    if (Math.abs(bowlingRuns - inn.totalRuns) > 1) {
      errors.push(`${label}: bowling runs ${bowlingRuns} != innings total ${inn.totalRuns}`);
    }

    for (const row of inn.bowling) {
      if (row.overs <= 0) continue;
      const expectedEco = Math.round((row.runs / row.overs) * 100) / 100;
      if (Math.abs(row.economy - expectedEco) > 0.05) {
        errors.push(`${label}: ${row.name} economy ${row.economy} expected ${expectedEco}`);
      }
    }

    const spread = economySpread(inn.bowling);
    const activeBowlers = inn.bowling.filter((b) => b.overs > 0).length;
    if (activeBowlers >= 3 && spread < 1.25) {
      errors.push(`${label}: bowling economies too uniform (spread ${spread.toFixed(2)}, need ≥1.25)`);
    }
  }

  return errors;
}

export function validateDismissalsAgainstBowling(
  match: MatchResult,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
): string[] {
  const errors: string[] = [];

  for (const { inningsIdx, fieldingTeam } of resolveFieldingTeams(match, teamA, teamB)) {
    const inn = match.innings[inningsIdx];
    const label = `Innings ${inningsIdx + 1}`;
    const wktByBowler = new Map<string, number>();

    for (const b of inn.batting) {
      if (isNotOut(b.status) || isRunOut(b.status)) continue;
      const bowler = extractDismissalBowler(b.status);
      if (!bowler) {
        errors.push(`${label}: ${b.name} dismissal "${b.status}" has no credited bowler`);
        continue;
      }
      if (!fieldingTeam.bowlingQuota.some((q) => namesMatch(q.name, bowler))) {
        errors.push(`${label}: ${b.name} dismissed by ${bowler} who is not in bowling quota`);
      }
      const key = fieldingTeam.bowlingQuota.find((q) => namesMatch(q.name, bowler))?.name ?? bowler;
      wktByBowler.set(key.toLowerCase(), (wktByBowler.get(key.toLowerCase()) ?? 0) + 1);
    }

    for (const row of inn.bowling ?? []) {
      const credited = wktByBowler.get(row.name.toLowerCase()) ?? 0;
      if (row.wickets > 0 && credited === 0) {
        errors.push(`${label}: ${row.name} has ${row.wickets} wicket(s) in figures but no matching dismissal`);
      }
      if (credited > row.wickets) {
        errors.push(`${label}: ${row.name} has ${row.wickets} wicket(s) in figures but ${credited} dismissals credit them`);
      }
    }
  }

  return errors;
}

/** Ensure LLM output includes bowling figures derived from innings if missing */
export function enrichMatchWithBowling(
  match: MatchResult,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
  pitchType: string,
  matchOvers: number,
  boundarySize?: string,
): MatchResult {
  return rebuildBowlingForMatch(match, teamA, teamB, pitchType, matchOvers, boundarySize);
}
