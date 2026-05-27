import type { DraftGender, LeagueId, Player } from "./types";
import { getAllPlayers } from "@/data/playerLoader";
import { filterExcludedCountries } from "./playerFilter";
import { getLeagueConfig } from "@/data/leagueRegistry";

/** Leagues excluded from draft pools (Legend League and similar exhibition leagues). */
export const DRAFT_EXCLUDED_LEAGUES: readonly string[] = ["legend"];

/** Franchise leagues whose active players are eligible for the mens draft. */
export const DRAFT_MENS_LEAGUES: LeagueId[] = ["ipl", "hundred", "sa20", "bbl"];

/** Franchise leagues whose active players are eligible for the womens draft. */
export const DRAFT_WOMENS_LEAGUES: LeagueId[] = ["wpl", "wbbl"];

function normalizePlayerName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export function getDraftEligibleLeagues(gender: DraftGender): LeagueId[] {
  const leagues = gender === "womens" ? DRAFT_WOMENS_LEAGUES : DRAFT_MENS_LEAGUES;
  return leagues.filter((id) => !DRAFT_EXCLUDED_LEAGUES.includes(id));
}

/**
 * Merge players from all eligible franchise leagues.
 * Primary league entries win on name collision (same person in IPL + The Hundred → one row).
 * Internationally retired players remain eligible if they appear in any league roster JSON.
 */
function mergeLeaguePlayers(leagues: LeagueId[], primaryLeague: LeagueId): Player[] {
  const byName = new Map<string, Player>();
  const order = [primaryLeague, ...leagues.filter((l) => l !== primaryLeague)];

  for (const league of order) {
    const players = filterExcludedCountries(getAllPlayers(league).map((p) => ({ ...p })));
    for (const player of players) {
      const key = normalizePlayerName(player.name);
      if (!byName.has(key)) byName.set(key, player);
    }
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getDraftPoolPlayersForGender(gender: DraftGender): Player[] {
  const leagues = getDraftEligibleLeagues(gender);
  const primary = gender === "womens" ? "wpl" : "ipl";
  return mergeLeaguePlayers(leagues, primary);
}

export function getDraftPlayerById(gender: DraftGender, playerId: string): Player | undefined {
  return getDraftPoolPlayersForGender(gender).find((p) => p.id === playerId);
}

export function getDraftPoolSizeForGender(gender: DraftGender): number {
  return getDraftPoolPlayersForGender(gender).length;
}

export function getDraftPoolLabelForGender(gender: DraftGender): string {
  const leagues = getDraftEligibleLeagues(gender);
  const labels = leagues.map((id) => getLeagueConfig(id).shortLabel);
  const n = getDraftPoolSizeForGender(gender);
  const leagueText = labels.join(" + ");
  return `All ${gender === "womens" ? "women's" : "men's"} league players (${leagueText}) · ${n} eligible`;
}

/** @deprecated Use getDraftPoolPlayersForGender — kept for non-draft callers */
export function getDraftPoolPlayers(league: LeagueId): Player[] {
  const gender: DraftGender = league === "wpl" ? "womens" : "mens";
  return getDraftPoolPlayersForGender(gender);
}

export function getDraftPoolSize(league: LeagueId): number {
  const gender: DraftGender = league === "wpl" ? "womens" : "mens";
  return getDraftPoolSizeForGender(gender);
}

export function getDraftPoolLabel(league: LeagueId): string {
  const gender: DraftGender = league === "wpl" ? "womens" : "mens";
  return getDraftPoolLabelForGender(gender);
}
