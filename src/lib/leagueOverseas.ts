import type { LeagueId } from "@/lib/leagueTypes";
import type { PlayerPoolId } from "@/lib/types";

/** Countries that count as local (not overseas) for each auction pool. */
const DOMESTIC_BY_POOL: Record<PlayerPoolId, readonly string[]> = {
  ipl: ["India"],
  wpl: ["India"],
  legend: ["India"],
  bbl: ["Australia"],
  wbbl: ["Australia"],
  sa20: ["South Africa"],
  hundred: ["England", "Wales"],
};

const COUNTRY_ALIASES: Record<string, string> = {
  india: "India",
  ind: "India",
  australia: "Australia",
  aus: "Australia",
  australian: "Australia",
  "south africa": "South Africa",
  sa: "South Africa",
  rsa: "South Africa",
  england: "England",
  eng: "England",
  wales: "Wales",
  wal: "Wales",
  welsh: "Wales",
};

export function normalizePlayerCountry(country: string | undefined | null): string {
  const raw = (country ?? "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  return COUNTRY_ALIASES[key] ?? raw;
}

export function getDomesticCountriesForPool(poolId: PlayerPoolId): readonly string[] {
  return DOMESTIC_BY_POOL[poolId] ?? DOMESTIC_BY_POOL.ipl;
}

export function isPlayerOverseasForPool(
  country: string | undefined | null,
  poolId: PlayerPoolId,
): boolean {
  const normalized = normalizePlayerCountry(country);
  if (!normalized) return true;
  const domestic = getDomesticCountriesForPool(poolId);
  return !domestic.includes(normalized);
}

export function isPlayerOverseasForLeague(
  country: string | undefined | null,
  league: LeagueId,
): boolean {
  return isPlayerOverseasForPool(country, league);
}

export function applyOverseasFlag<T extends { country: string; isOverseas: boolean }>(
  player: T,
  poolId: PlayerPoolId,
): T {
  return { ...player, isOverseas: isPlayerOverseasForPool(player.country, poolId) };
}
