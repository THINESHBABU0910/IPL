import type { MatchResult, ParsedTeam } from "./matchSchema";
import { namesMatch, sanitizePlayerName } from "./playerNames";
import { applyDismissalBowlers, createSeededRng } from "./matchSquadEnricher";

function isNotOut(status: string): boolean {
  return /not out/i.test(status);
}

function isRunOut(status: string): boolean {
  return /^run out/i.test(status.trim());
}

function extractBowler(status: string): string | null {
  const st = status.trim();
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

/** Align dismissed batters with totalWickets and assign realistic dismissal text */
export function syncInningsDismissals(
  inn: MatchResult["innings"][0],
  fieldingTeam: ParsedTeam,
  pitchType: string,
  seed: string,
): void {
  if (!inn.batting.length) return;

  const runOutCount = inn.batting.filter((b) => isRunOut(b.status)).length;
  let targetDismissed = Math.max(0, inn.totalWickets - runOutCount);

  const notOutPool = inn.batting.filter((b) => isNotOut(b.status));
  let dismissedPool = inn.batting.filter((b) => !isNotOut(b.status) && !isRunOut(b.status));

  while (dismissedPool.length < targetDismissed && notOutPool.length > 0) {
    notOutPool.sort((a, b) => a.runs - b.runs || a.balls - b.balls);
    const pick = notOutPool.shift()!;
    pick.status = "b Bowler";
    dismissedPool.push(pick);
  }

  while (dismissedPool.length > targetDismissed && dismissedPool.length > 0) {
    dismissedPool.sort((a, b) => a.runs - b.runs || a.balls - b.balls);
    const pick = dismissedPool.shift()!;
    pick.status = "not out";
    notOutPool.push(pick);
  }

  const maxNotOuts = inn.totalWickets >= 10 ? 0 : Math.min(2, 10 - inn.totalWickets);
  while (notOutPool.length > maxNotOuts) {
    notOutPool.sort((a, b) => a.runs - b.runs);
    const pick = notOutPool.shift()!;
    pick.status = "b Bowler";
    dismissedPool.push(pick);
    targetDismissed = Math.max(targetDismissed, dismissedPool.length);
  }

  dismissedPool = inn.batting.filter((b) => !isNotOut(b.status) && !isRunOut(b.status));
  if (dismissedPool.length && fieldingTeam.bowlingQuota.length) {
    applyDismissalBowlers(inn.batting, fieldingTeam, pitchType, createSeededRng(seed));
  }

  for (const b of inn.batting) {
    if (isNotOut(b.status) || isRunOut(b.status)) continue;
    if (!extractBowler(b.status) && fieldingTeam.bowlingQuota[0]) {
      b.status = `b ${sanitizePlayerName(fieldingTeam.bowlingQuota[0].name)}`;
    }
  }

  inn.totalWickets = inn.batting.filter((b) => !isNotOut(b.status)).length;
}

export function syncAllDismissals(
  match: MatchResult,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
  pitchType: string,
): MatchResult {
  const fielding = resolveFieldingTeams(match, teamA, teamB);
  const seedBase = match.matchTitle || `${teamA.name}-${teamB.name}`;

  for (const { inningsIdx, fieldingTeam } of fielding) {
    const inn = match.innings[inningsIdx];
    syncInningsDismissals(inn, fieldingTeam, pitchType, `${seedBase}-inn${inningsIdx}`);
  }

  return match;
}

function resolveFieldingTeams(
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

export function validateFallOfWickets(match: MatchResult): string[] {
  const errors: string[] = [];
  const pairs = [
    { label: "1st innings", batting: match.innings[0].batting, fow: match.fallOfWickets.firstInnings, wkts: match.innings[0].totalWickets },
    { label: "2nd innings", batting: match.innings[1].batting, fow: match.fallOfWickets.secondInnings, wkts: match.innings[1].totalWickets },
  ];

  for (const { label, batting, fow, wkts } of pairs) {
    const dismissed = batting.filter((b) => !isNotOut(b.status)).length;
    if (dismissed !== wkts) {
      errors.push(`${label}: ${dismissed} dismissal rows but totalWickets ${wkts}`);
    }
    if (wkts > 0 && fow.length === 0) {
      errors.push(`${label}: ${wkts} wickets but no fall-of-wickets entries`);
    }
    if (fow.length !== wkts) {
      errors.push(`${label}: FOW entries ${fow.length} != wickets ${wkts}`);
    }
    for (const b of batting) {
      if (isNotOut(b.status)) continue;
      if (isRunOut(b.status)) continue;
      if (!extractBowler(b.status)) {
        errors.push(`${label}: ${b.name} missing dismissal detail ("${b.status}")`);
      }
    }
  }

  return errors;
}
