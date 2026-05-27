import type { ParsedTeam } from "./matchSchema";
import { namesMatch } from "./playerNames";

export interface BatterProfile {
  overseas: boolean;
  isNew: boolean;
  role: string;
  isImpact: boolean;
}

const NEW_SIGNING_NAME_HINT = /\b(bethel|vipraj|jacob bethel)\b/i;

const OVERSEAS_NAME_HINT =
  /\b(bairstow|bethel|head|stonis|starc|hazlewood|hazelwood|pooran|miller|singh arshdeep)\b/i;

function inferIsNew(name: string, player?: ParsedTeam["playingXI"][0]): boolean {
  if (player?.isNew) return true;
  return NEW_SIGNING_NAME_HINT.test(name);
}

function inferOverseas(name: string, player?: ParsedTeam["playingXI"][0]): boolean {
  if (player?.overseas) return true;
  return OVERSEAS_NAME_HINT.test(name);
}

export function getBatterProfile(
  squad: ParsedTeam,
  batterName: string,
  impactNames: string[],
): BatterProfile {
  const player = squad.playingXI.find((p) => namesMatch(p.name, batterName));
  const fromImpact = squad.impactPlayer?.name && namesMatch(squad.impactPlayer.name, batterName);
  return {
    overseas: inferOverseas(batterName, player),
    isNew: inferIsNew(batterName, player),
    role: player?.role ?? "unknown",
    isImpact: Boolean(fromImpact) || impactNames.some((n) => namesMatch(n, batterName)),
  };
}

type Phase = "powerplay" | "middle" | "death";

/** Condition-aware uplift for new signings and overseas players */
export function conditionPerformanceBoost(
  profile: BatterProfile,
  pitchType: string,
  phase: Phase,
  batterIdx: number,
  rng: () => number,
): { runsBonus: number; heroInnings: boolean } {
  const flat = pitchType === "Flat";
  const balanced = pitchType === "Balanced";
  const turning = pitchType === "Turning" || pitchType === "Slow";
  const green = pitchType === "Green";

  if (!profile.isNew && !profile.overseas) {
    return { runsBonus: 0, heroInnings: false };
  }

  let suit = 0.1;
  if (profile.overseas) {
    if (flat && phase === "powerplay" && batterIdx <= 1) suit += 0.45;
    if (balanced && batterIdx <= 2) suit += 0.3;
    if (turning && phase === "death" && batterIdx >= 4) suit += 0.25;
    if (green && phase === "powerplay" && batterIdx <= 1) suit += 0.2;
  }
  if (profile.isNew) {
    if (turning && !profile.overseas && phase === "middle") suit += 0.35;
    if (flat || balanced) suit += 0.25;
    if (profile.overseas && flat) suit += 0.2;
  }
  if (profile.isImpact) suit += 0.15;

  const heroInnings = rng() < Math.min(0.42, 0.12 + suit);
  if (!heroInnings) {
    let runsBonus = 0;
    if (profile.overseas && batterIdx <= 1 && (flat || balanced)) {
      runsBonus = 3 + Math.floor(rng() * 10);
    }
    if (profile.isNew && turning && !profile.overseas) {
      runsBonus = 2 + Math.floor(rng() * 8);
    }
    return { runsBonus, heroInnings: false };
  }

  let runsBonus = 8 + Math.floor(rng() * 14);
  if (profile.overseas && (flat || balanced) && batterIdx <= 2) {
    runsBonus = 18 + Math.floor(rng() * 38);
  } else if (profile.overseas && phase === "death") {
    runsBonus = 12 + Math.floor(rng() * 28);
  } else if (profile.isNew && profile.overseas && turning && batterIdx <= 1) {
    runsBonus = 10 + Math.floor(rng() * 22);
  } else if (profile.isNew && !profile.overseas && turning) {
    runsBonus = 14 + Math.floor(rng() * 30);
  } else if (profile.isNew) {
    runsBonus = 10 + Math.floor(rng() * 24);
  }

  return { runsBonus, heroInnings: true };
}

/** Overseas / new bowlers can spike on favourable surfaces */
export function bowlerWicketWeightBoost(
  bowlerName: string,
  squad: ParsedTeam,
  pitchType: string,
): number {
  const player = squad.playingXI.find((p) => namesMatch(p.name, bowlerName));
  if (!player) return 1;
  let w = 1;
  if (player.overseas && pitchType === "Green") w += 0.35;
  if (player.isNew && (pitchType === "Turning" || pitchType === "Slow")) w += 0.25;
  if (player.overseas && (pitchType === "Turning" || pitchType === "Slow")) w += 0.15;
  return w;
}

export function isValidImpactActivatedAt(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const t = value.trim();
  if (/^0+$/.test(t) || /^\d+$/.test(t)) return false;
  return true;
}
