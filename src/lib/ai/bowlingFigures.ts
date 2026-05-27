import type { MatchResult, ParsedTeam } from "./matchSchema";
import { sanitizePlayerName, namesMatch } from "./playerNames";
import { bowlerEconomyMultiplier, bowlerWicketWeightBoost } from "./playerPerformance";
import { distributeWicketsByQuota, isSpinnerName } from "./realismEngine";

export interface BuildBowlingContext {
  pitchType: string;
  dewCondition?: string;
  inningsIndex: number;
  matchOvers: number;
  boundarySize?: string;
  /** Stable key for per-bowler jitter (e.g. match title + innings) */
  seedKey?: string;
}

type Phase = "powerplay" | "middle" | "death";

function stableUnit(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return (h % 10_000) / 10_000;
}

function dominantPhase(overNumbers: number[], matchOvers: number): Phase {
  if (!overNumbers.length) return "middle";
  const deathStart = Math.max(1, matchOvers - 4);
  let pp = 0;
  let death = 0;
  let mid = 0;
  for (const o of overNumbers) {
    if (o <= 6) pp++;
    else if (o >= deathStart) death++;
    else mid++;
  }
  if (death >= pp && death >= mid) return "death";
  if (pp >= mid) return "powerplay";
  return "middle";
}

function pitchBaseEconomy(pitchType: string): number {
  switch (pitchType) {
    case "Flat":
      return 9.4;
    case "Green":
      return 7.2;
    case "Slow":
    case "Turning":
      return 7.6;
    default:
      return 8.4;
  }
}

function phaseEconomyAdjust(phase: Phase, spin: boolean, pitchType: string): number {
  const turning = pitchType === "Turning" || pitchType === "Slow";
  const green = pitchType === "Green";
  const flat = pitchType === "Flat";

  if (phase === "powerplay") {
    if (green && !spin) return -1.6;
    if (turning && spin) return -1.1;
    if (flat && !spin) return -0.4;
    return spin ? -0.5 : -0.9;
  }
  if (phase === "death") {
    if (spin) return turning ? 1.6 : 2.4;
    return flat ? 3.2 : 2.6;
  }
  if (turning && spin) return -1.2;
  if (green && !spin) return -0.5;
  return 0.35;
}

function dewEconomyAdjust(dew: string | undefined, inningsIndex: number): number {
  if (inningsIndex !== 1) return 0;
  if (dew === "Heavy") return 1.5;
  if (dew === "Moderate") return 0.65;
  return 0;
}

function boundaryEconomyAdjust(boundarySize: string | undefined): number {
  if (boundarySize === "Small") return 0.85;
  if (boundarySize === "Large") return -0.45;
  return 0;
}

function roleEconomyAdjust(
  player: ParsedTeam["playingXI"][0] | undefined,
  overCount: number,
  wickets: number,
): number {
  let adj = 0;
  if (player?.role === "bowler" || player?.notes === "bowling only") adj -= 1.1;
  else if (player?.role === "allrounder") adj -= 0.35;
  else if (player?.role === "batter" || player?.notes === "batting only") adj += 1.8;

  if (overCount === 1) adj += 2.8;
  else if (overCount === 2) adj += 1.4;
  else if (overCount >= 4) adj -= 0.25;

  adj -= wickets * 0.65;
  if (wickets >= 3) adj -= 1.0;
  else if (wickets >= 2) adj -= 0.45;

  if (player?.isNew) adj += 0.55;
  return adj;
}

/** Target economy before scaling to innings total — varies by phase, pitch, dew, role */
export function targetEconomyForBowler(
  bowlerName: string,
  overNumbers: number[],
  fieldingTeam: ParsedTeam,
  wickets: number,
  ctx: BuildBowlingContext,
): number {
  const player = fieldingTeam.playingXI.find((p) => namesMatch(p.name, bowlerName));
  const spin = isSpinnerName(bowlerName, player?.role);
  const phase = dominantPhase(overNumbers, ctx.matchOvers);
  const overCount = overNumbers.length;

  let eco =
    pitchBaseEconomy(ctx.pitchType) +
    phaseEconomyAdjust(phase, spin, ctx.pitchType) +
    dewEconomyAdjust(ctx.dewCondition, ctx.inningsIndex) +
    boundaryEconomyAdjust(ctx.boundarySize) +
    roleEconomyAdjust(player, overCount, wickets);

  eco *= bowlerEconomyMultiplier(bowlerName, fieldingTeam, ctx.pitchType);

  const jitterKey = `${ctx.seedKey ?? "match"}-${bowlerName}-${ctx.inningsIndex}-${overNumbers.join(",")}`;
  eco += (stableUnit(jitterKey) - 0.5) * 1.8;

  return Math.min(17.5, Math.max(4.25, Math.round(eco * 100) / 100));
}

/** Split innings runs across bowlers so economies differ but sum matches totalRuns */
export function distributeBowlingRuns(
  quota: ParsedTeam["bowlingQuota"],
  totalRuns: number,
  wktSplit: number[],
  fieldingTeam: ParsedTeam,
  ctx: BuildBowlingContext,
): number[] {
  if (!quota.length || totalRuns <= 0) return quota.map(() => 0);

  const targets = quota.map((q, i) => {
    const name = sanitizePlayerName(q.name);
    const eco = targetEconomyForBowler(name, q.overs, fieldingTeam, wktSplit[i] ?? 0, ctx);
    return Math.max(0, eco * q.overs.length);
  });

  const rawSum = targets.reduce((a, b) => a + b, 0) || 1;
  let runsLeft = totalRuns;
  const runs = targets.map((raw, i) => {
    const isLast = i === quota.length - 1;
    if (isLast) return Math.max(0, runsLeft);
    const share = Math.round(totalRuns * (raw / rawSum));
    runsLeft -= share;
    return Math.max(0, share);
  });

  let diff = totalRuns - runs.reduce((a, b) => a + b, 0);
  let idx = runs.findIndex((_, i) => quota[i].overs.length > 0);
  if (idx < 0) idx = 0;
  while (diff !== 0 && quota.length) {
    if (diff > 0) {
      runs[idx] += 1;
      diff -= 1;
    } else if (runs[idx] > 0) {
      runs[idx] -= 1;
      diff += 1;
    }
    idx = (idx + 1) % runs.length;
  }

  return runs;
}

export function buildBowlingRowsFromQuota(
  fieldingTeam: ParsedTeam,
  totalRuns: number,
  wktSplit: number[],
  ctx: BuildBowlingContext,
): NonNullable<MatchResult["innings"][0]["bowling"]> {
  const quota = fieldingTeam.bowlingQuota;
  if (!quota.length) return [];

  const runsSplit = distributeBowlingRuns(quota, totalRuns, wktSplit, fieldingTeam, ctx);

  return quota.map((q, i) => {
    const bowlerOvers = q.overs.length;
    const finalRuns = runsSplit[i] ?? 0;
    return {
      name: sanitizePlayerName(q.name),
      overs: bowlerOvers,
      maidens: 0,
      runs: finalRuns,
      wickets: wktSplit[i] ?? 0,
      economy: bowlerOvers > 0 ? Math.round((finalRuns / bowlerOvers) * 100) / 100 : 0,
      isImpact: fieldingTeam.impactPlayer?.name
        ? namesMatch(fieldingTeam.impactPlayer.name, q.name)
        : false,
    };
  });
}

export function distributeWicketsWeightedForTeam(
  totalWickets: number,
  fieldingTeam: ParsedTeam,
  pitchType: string,
): number[] {
  const quota = fieldingTeam.bowlingQuota;
  if (!quota.length || totalWickets <= 0) return new Array(quota.length).fill(0);
  const weights = quota.map(
    (q) => q.overs.length * bowlerWicketWeightBoost(sanitizePlayerName(q.name), fieldingTeam, pitchType),
  );
  return distributeWicketsByQuota(totalWickets, weights);
}

export function economySpread(bowling: NonNullable<MatchResult["innings"][0]["bowling"]>): number {
  const ecos = bowling.filter((b) => b.overs > 0).map((b) => b.economy);
  if (ecos.length < 2) return 0;
  return Math.max(...ecos) - Math.min(...ecos);
}
