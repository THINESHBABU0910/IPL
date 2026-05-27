import type { DraftGender, LeagueId, Player, TeamState } from "./types";
import { getDraftPoolLabelForGender } from "./draftPlayerPool";

export const DRAFT_SQUAD_MIN = 18;
export const DRAFT_SQUAD_MAX = 25;

export const DRAFT_GENDER_TABS: { id: DraftGender; label: string; emoji: string }[] = [
  { id: "mens", label: "Mens", emoji: "🏏" },
  { id: "womens", label: "Womens", emoji: "👑" },
];

export function getDraftLeagueFromGender(gender: DraftGender): LeagueId {
  return gender === "womens" ? "wpl" : "ipl";
}

export function getDraftSubtitle(gender: DraftGender): string {
  return `${getDraftPoolLabelForGender(gender)} · Snake draft · 18–25 squad`;
}

export function validateDraftPick(
  team: TeamState,
  player: Player,
  draftedIds: Set<string>,
): { ok: boolean; reason?: string } {
  if (draftedIds.has(player.id)) {
    return { ok: false, reason: "Player already drafted" };
  }
  if (team.squad.some((p) => p.id === player.id)) {
    return { ok: false, reason: "Player already on your squad" };
  }
  if (team.squad.length >= DRAFT_SQUAD_MAX) {
    return { ok: false, reason: `Squad full (max ${DRAFT_SQUAD_MAX})` };
  }
  return { ok: true };
}

export function allTeamsMeetDraftMinimum(teams: Iterable<TeamState>): boolean {
  for (const t of teams) {
    if (t.isVacant) continue;
    if (t.squad.length < DRAFT_SQUAD_MIN) return false;
  }
  return true;
}

export function countActiveDraftTeams(teams: Iterable<TeamState>): number {
  let n = 0;
  for (const t of teams) {
    if (!t.isVacant && t.ownerId) n++;
  }
  return n;
}
