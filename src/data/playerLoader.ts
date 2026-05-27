import { Player, PlayerJSON, PlayersData, LeagueId } from "@/lib/types";
import { formatPrice, sortSetKey } from "@/lib/constants";
import { formatLeaguePrice } from "@/lib/leagueRules";
import playersRaw from "./players.json";
import wplPlayersRaw from "./leagues/wpl/players.json";
import hundredPlayersRaw from "./leagues/hundred/players.json";
import sa20PlayersRaw from "./leagues/sa20/players.json";
import bblPlayersRaw from "./leagues/bbl/players.json";
import wbblPlayersRaw from "./leagues/wbbl/players.json";
import { RETENTIONS_2026, PURSE_REMAINING_2026 } from "./retentions2026";
import { filterExcludedCountries } from "@/lib/playerFilter";

const LEAGUE_DATA: Record<LeagueId, PlayersData> = {
  ipl: playersRaw as PlayersData,
  wpl: wplPlayersRaw as PlayersData,
  hundred: hundredPlayersRaw as PlayersData,
  sa20: sa20PlayersRaw as PlayersData,
  bbl: bblPlayersRaw as PlayersData,
  wbbl: wbblPlayersRaw as PlayersData,
};

function normalizePlayer(p: PlayerJSON, league: LeagueId = "ipl"): Player {
  const basePriceLakhs = p.basePrice / 100000;
  return {
    ...p,
    basePriceLakhs,
    displayPrice: formatLeaguePrice(basePriceLakhs, league),
  };
}

function loadLeaguePlayers(league: LeagueId): Player[] {
  return filterExcludedCountries(LEAGUE_DATA[league].players).map((p) => normalizePlayer(p, league));
}

const data = playersRaw as PlayersData;
const allPlayers: Player[] = loadLeaguePlayers("ipl");

// Build sorted unique set names from data
const uniqueSets = Array.from(new Set(allPlayers.map((p) => p.set)));
uniqueSets.sort((a, b) => sortSetKey(a) - sortSetKey(b));

const setToCategory = new Map<string, string>();
for (const cat of data.categories) {
  for (const setName of cat.sets) {
    setToCategory.set(setName, cat.name);
  }
}

/** e.g. BA1 → "Marquee Players", AL2 → "All-Rounders" */
export function getSetDisplayLabel(setName: string): string {
  return setToCategory.get(setName) || setName;
}

/** Short badge: BA1 → "Marquee", AL1 → "All-Rounders" */
export function getSetShortLabel(setName: string): string {
  const full = setToCategory.get(setName);
  if (!full) return setName;
  if (full === "Marquee Players") return setName.startsWith("M2") ? "Marquee · Set 2" : setName.startsWith("M1") ? "Marquee · Set 1" : "Marquee";
  if (full === "Wicket-Keepers") return "Wicketkeepers";
  if (full === "Spin Bowlers") return "Spinners";
  if (full === "Fast Bowlers") return "Fast Bowlers";
  return full.replace(/ Players$/, "");
}

export function getAllPlayers(league: LeagueId = "ipl"): Player[] {
  return loadLeaguePlayers(league);
}

export function getPlayersForTeam(teamId: string, league: LeagueId = "ipl"): Player[] {
  return loadLeaguePlayers(league).filter((p) => p.previousTeam === teamId);
}

export function getSetOrder(): string[] {
  return uniqueSets;
}

export function getPlayersBySet(): Map<string, Player[]> {
  const map = new Map<string, Player[]>();
  for (const set of uniqueSets) {
    map.set(set, allPlayers.filter((p) => p.set === set));
  }
  return map;
}

export function getPlayersForTeamLegacy(teamId: string): Player[] {
  return allPlayers.filter((p) => p.previousTeam === teamId);
}

// For IPL 2026 Mini Auction: determine retained/released players
export function getRetained2026(teamId: string): Player[] {
  const names = RETENTIONS_2026[teamId] || [];
  const nameSet = new Set(names.map((n) => n.toLowerCase()));
  return allPlayers.filter((p) => nameSet.has(p.name.toLowerCase()));
}

export function getReleased2026(): Player[] {
  const allRetainedNames = new Set<string>();
  for (const names of Object.values(RETENTIONS_2026)) {
    for (const n of names) {
      allRetainedNames.add(n.toLowerCase());
    }
  }
  return allPlayers.filter((p) => !allRetainedNames.has(p.name.toLowerCase()));
}

export function getPurseRemaining2026(teamId: string): number {
  const crores = PURSE_REMAINING_2026[teamId] ?? 120;
  return Math.round(crores * 100); // convert to lakhs
}

// Build auction pool sorted by set order
export function buildAuctionPool(players: Player[]): Player[] {
  return [...players].sort((a, b) => sortSetKey(a.set) - sortSetKey(b.set));
}
