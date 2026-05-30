/**
 * League-aware overseas (OS) flags — shared by pool generation and fix scripts.
 * Domestic players are NOT overseas for their home league (e.g. Australia in BBL).
 */

export const DOMESTIC_BY_POOL = {
  ipl: ["India"],
  wpl: ["India"],
  legend: ["India"],
  bbl: ["Australia"],
  wbbl: ["Australia"],
  sa20: ["South Africa"],
  hundred: ["England", "Wales"],
};

const COUNTRY_ALIASES = {
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

export function normalizePlayerCountry(country) {
  const raw = (country ?? "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  return COUNTRY_ALIASES[key] ?? raw;
}

export function isPlayerOverseasForPool(country, poolId) {
  const normalized = normalizePlayerCountry(country);
  if (!normalized) return true;
  const domestic = DOMESTIC_BY_POOL[poolId] ?? DOMESTIC_BY_POOL.ipl;
  return !domestic.includes(normalized);
}
