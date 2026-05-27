import type { Player, PlayerJSON } from "./types";

export const EXCLUDED_COUNTRIES = ["Pakistan"] as const;

export function isExcludedCountry(country: string): boolean {
  return EXCLUDED_COUNTRIES.includes(country as (typeof EXCLUDED_COUNTRIES)[number]);
}

export function filterExcludedCountries<T extends PlayerJSON | Player>(players: T[]): T[] {
  return players.filter((p) => !isExcludedCountry(p.country));
}
