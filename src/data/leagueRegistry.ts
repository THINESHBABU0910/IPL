import type { TeamDef } from "@/lib/types";
import type { LeagueConfig, LeagueId } from "@/lib/leagueTypes";
import { SET_ORDER_10_TEAM } from "./leagueCategories";
import { IPL_TEAMS } from "./leagues/ipl/teams";
import { WPL_TEAMS } from "./leagues/wpl/teams";
import { HUNDRED_TEAMS } from "./leagues/hundred/teams";
import { SA20_TEAMS } from "./leagues/sa20/teams";
import { BBL_TEAMS } from "./leagues/bbl/teams";
import { WBBL_TEAMS } from "./leagues/wbbl/teams";

const SET_ORDER_10 = [...SET_ORDER_10_TEAM];

const IPL_RULES = {
  maxFranchises: 10,
  totalPurse: 12000,
  maxSquadSize: 25,
  minSquadSize: 18,
  maxOverseas: 8,
  maxRetentions: 6,
  maxCappedRetentions: 5,
  maxUncappedRetentions: 2,
  flexMaxCappedRetentions: 4,
  flexMaxUncappedRetentions: 2,
  minBasePriceLakhs: 30,
  retentionCostsCapped: [1800, 1400, 1100, 1800, 1400],
  retentionCostUncapped: 400,
  timerInitial: 15,
  timerBidReset: 5,
  rtmTimer: 15,
  retentionTimer: 180,
  round2Discount: 0.9,
  setOrderPrefixes: SET_ORDER_10,
  currencySymbol: "₹",
  purseLabel: "₹120 Cr",
};

const WPL_RULES = {
  maxFranchises: 10,
  totalPurse: 2400,
  maxSquadSize: 18,
  minSquadSize: 15,
  maxOverseas: 4,
  maxRetentions: 4,
  maxCappedRetentions: 3,
  maxUncappedRetentions: 2,
  flexMaxCappedRetentions: 3,
  flexMaxUncappedRetentions: 2,
  minBasePriceLakhs: 10,
  retentionCostsCapped: [300, 240, 180],
  retentionCostUncapped: 75,
  timerInitial: 15,
  timerBidReset: 5,
  rtmTimer: 15,
  retentionTimer: 120,
  round2Discount: 0.9,
  setOrderPrefixes: SET_ORDER_10,
  currencySymbol: "₹",
  purseLabel: "₹24 Cr",
};

const HUNDRED_RULES = {
  maxFranchises: 10,
  totalPurse: 1400,
  maxSquadSize: 15,
  minSquadSize: 11,
  maxOverseas: 3,
  maxRetentions: 3,
  maxCappedRetentions: 3,
  maxUncappedRetentions: 1,
  flexMaxCappedRetentions: 3,
  flexMaxUncappedRetentions: 1,
  minBasePriceLakhs: 5,
  retentionCostsCapped: [200, 150, 100],
  retentionCostUncapped: 50,
  timerInitial: 15,
  timerBidReset: 5,
  rtmTimer: 15,
  retentionTimer: 120,
  round2Discount: 0.9,
  setOrderPrefixes: SET_ORDER_10,
  currencySymbol: "£",
  purseLabel: "£1.4M",
};

const SA20_RULES = {
  maxFranchises: 10,
  totalPurse: 4800,
  maxSquadSize: 20,
  minSquadSize: 15,
  maxOverseas: 4,
  maxRetentions: 4,
  maxCappedRetentions: 3,
  maxUncappedRetentions: 2,
  flexMaxCappedRetentions: 3,
  flexMaxUncappedRetentions: 2,
  minBasePriceLakhs: 20,
  retentionCostsCapped: [800, 600, 400],
  retentionCostUncapped: 200,
  timerInitial: 15,
  timerBidReset: 5,
  rtmTimer: 15,
  retentionTimer: 120,
  round2Discount: 0.9,
  setOrderPrefixes: SET_ORDER_10,
  currencySymbol: "R",
  purseLabel: "R48M",
};

const BBL_RULES = {
  maxFranchises: 10,
  totalPurse: 2800,
  maxSquadSize: 19,
  minSquadSize: 14,
  maxOverseas: 3,
  maxRetentions: 3,
  maxCappedRetentions: 3,
  maxUncappedRetentions: 1,
  flexMaxCappedRetentions: 3,
  flexMaxUncappedRetentions: 1,
  minBasePriceLakhs: 20,
  retentionCostsCapped: [400, 300, 200],
  retentionCostUncapped: 100,
  timerInitial: 15,
  timerBidReset: 5,
  rtmTimer: 15,
  retentionTimer: 120,
  round2Discount: 0.9,
  setOrderPrefixes: SET_ORDER_10,
  currencySymbol: "A$",
  purseLabel: "A$2.8M",
};

const WBBL_RULES = {
  maxFranchises: 10,
  totalPurse: 1100,
  maxSquadSize: 15,
  minSquadSize: 12,
  maxOverseas: 3,
  maxRetentions: 3,
  maxCappedRetentions: 3,
  maxUncappedRetentions: 1,
  flexMaxCappedRetentions: 3,
  flexMaxUncappedRetentions: 1,
  minBasePriceLakhs: 10,
  retentionCostsCapped: [200, 150, 100],
  retentionCostUncapped: 50,
  timerInitial: 15,
  timerBidReset: 5,
  rtmTimer: 15,
  retentionTimer: 120,
  round2Discount: 0.9,
  setOrderPrefixes: SET_ORDER_10,
  currencySymbol: "A$",
  purseLabel: "A$1.1M",
};

export const LEAGUE_CONFIGS: Record<LeagueId, LeagueConfig> = {
  ipl: {
    id: "ipl",
    name: "Indian Premier League",
    shortLabel: "IPL",
    seasonLabel: "2026",
    tagline: "539 Players · Live Multiplayer",
    teams: IPL_TEAMS,
    rules: IPL_RULES,
    playersFile: "players.json",
    teamGridCols: 5,
  },
  wpl: {
    id: "wpl",
    name: "Women's Premier League",
    shortLabel: "WPL",
    seasonLabel: "2026",
    tagline: "181 Players · Live Multiplayer",
    teams: WPL_TEAMS,
    rules: WPL_RULES,
    playersFile: "leagues/wpl/players.json",
    teamGridCols: 5,
  },
  hundred: {
    id: "hundred",
    name: "The Hundred",
    shortLabel: "The Hundred",
    seasonLabel: "2025",
    tagline: "184 Players · Live Multiplayer",
    teams: HUNDRED_TEAMS,
    rules: HUNDRED_RULES,
    playersFile: "leagues/hundred/players.json",
    teamGridCols: 5,
  },
  sa20: {
    id: "sa20",
    name: "SA20",
    shortLabel: "SA20",
    seasonLabel: "2025",
    tagline: "86 Players · Live Multiplayer",
    teams: SA20_TEAMS,
    rules: SA20_RULES,
    playersFile: "leagues/sa20/players.json",
    teamGridCols: 5,
  },
  bbl: {
    id: "bbl",
    name: "Big Bash League",
    shortLabel: "BBL",
    seasonLabel: "2025",
    tagline: "97 Players · Live Multiplayer",
    teams: BBL_TEAMS,
    rules: BBL_RULES,
    playersFile: "leagues/bbl/players.json",
    teamGridCols: 5,
  },
  wbbl: {
    id: "wbbl",
    name: "Women's Big Bash League",
    shortLabel: "WBBL",
    seasonLabel: "2025",
    tagline: "72 Players · Live Multiplayer",
    teams: WBBL_TEAMS,
    rules: WBBL_RULES,
    playersFile: "leagues/wbbl/players.json",
    teamGridCols: 5,
  },
};

/** Legend auction always uses IPL franchises and logos */
export function getTeamsForLeague(league: LeagueId): TeamDef[] {
  if (league === "wpl") return WPL_TEAMS;
  return getLeagueConfig(league).teams;
}

export function getLeagueConfig(league: LeagueId): LeagueConfig {
  return LEAGUE_CONFIGS[league] ?? LEAGUE_CONFIGS.ipl;
}

export function getTeamMapForLeague(league: LeagueId): Record<string, TeamDef> {
  return Object.fromEntries(getTeamsForLeague(league).map((t) => [t.id, t]));
}

export function isValidLeagueId(value: unknown): value is LeagueId {
  return (
    value === "ipl" || value === "wpl" || value === "hundred" ||
    value === "sa20" || value === "bbl" || value === "wbbl"
  );
}

export function parseLeagueId(value: unknown): LeagueId {
  return isValidLeagueId(value) ? value : "ipl";
}

export const LEAGUE_TABS: { id: LeagueId; label: string; emoji: string }[] = [
  { id: "ipl", label: "IPL", emoji: "🏏" },
  { id: "wpl", label: "WPL", emoji: "👑" },
  { id: "hundred", label: "The Hundred", emoji: "💯" },
  { id: "sa20", label: "SA20", emoji: "🇿🇦" },
  { id: "bbl", label: "BBL", emoji: "🏆" },
  { id: "wbbl", label: "WBBL", emoji: "👑" },
];

export const LEAGUE_GROUPS: { label: string; leagues: LeagueId[] }[] = [
  { label: "Men's Leagues", leagues: ["ipl", "hundred", "sa20", "bbl"] },
  { label: "Women's Leagues", leagues: ["wpl", "wbbl"] },
];
