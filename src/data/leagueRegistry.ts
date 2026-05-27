import type { TeamDef } from "@/lib/types";
import type { LeagueConfig, LeagueId } from "@/lib/leagueTypes";
import { IPL_TEAMS } from "./leagues/ipl/teams";
import { WPL_TEAMS } from "./leagues/wpl/teams";
import { HUNDRED_TEAMS } from "./leagues/hundred/teams";
import { SA20_TEAMS } from "./leagues/sa20/teams";
import { BBL_TEAMS } from "./leagues/bbl/teams";
import { WBBL_TEAMS } from "./leagues/wbbl/teams";

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
  setOrderPrefixes: ["M", "BA", "AL", "WK", "FA", "SP", "UBA", "UAL", "UWK", "UFA", "USP"],
  currencySymbol: "₹",
  purseLabel: "₹120 Cr",
};

const WPL_RULES = {
  maxFranchises: 5,
  totalPurse: 1200,
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
  setOrderPrefixes: ["M", "BA", "AL", "WK", "FA", "SP", "UBA", "UAL", "UWK", "UFA", "USP"],
  currencySymbol: "₹",
  purseLabel: "₹12 Cr",
};

const HUNDRED_RULES = {
  maxFranchises: 8,
  totalPurse: 1100,
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
  setOrderPrefixes: ["M", "BA", "AL", "WK", "FA", "SP", "UBA", "UAL", "UWK", "UFA", "USP"],
  currencySymbol: "£",
  purseLabel: "£1.1M",
};

const SA20_RULES = {
  maxFranchises: 6,
  totalPurse: 3200,
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
  setOrderPrefixes: ["M", "BA", "AL", "WK", "FA", "SP", "UBA", "UAL", "UWK", "UFA", "USP"],
  currencySymbol: "R",
  purseLabel: "R32M",
};

const BBL_RULES = {
  maxFranchises: 8,
  totalPurse: 2000,
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
  setOrderPrefixes: ["M", "BA", "AL", "WK", "FA", "SP", "UBA", "UAL", "UWK", "UFA", "USP"],
  currencySymbol: "A$",
  purseLabel: "A$2M",
};

const WBBL_RULES = {
  maxFranchises: 8,
  totalPurse: 800,
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
  setOrderPrefixes: ["M", "BA", "AL", "WK", "FA", "SP", "UBA", "UAL", "UWK", "UFA", "USP"],
  currencySymbol: "A$",
  purseLabel: "A$800K",
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
    tagline: "165 Players · Live Multiplayer",
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
    tagline: "192 Players · Live Multiplayer",
    teams: HUNDRED_TEAMS,
    rules: HUNDRED_RULES,
    playersFile: "leagues/hundred/players.json",
    teamGridCols: 4,
  },
  sa20: {
    id: "sa20",
    name: "SA20",
    shortLabel: "SA20",
    seasonLabel: "2025",
    tagline: "120+ Players · Draft pool",
    teams: SA20_TEAMS,
    rules: SA20_RULES,
    playersFile: "leagues/sa20/players.json",
    teamGridCols: 3,
  },
  bbl: {
    id: "bbl",
    name: "Big Bash League",
    shortLabel: "BBL",
    seasonLabel: "2025",
    tagline: "150+ Players · Draft pool",
    teams: BBL_TEAMS,
    rules: BBL_RULES,
    playersFile: "leagues/bbl/players.json",
    teamGridCols: 4,
  },
  wbbl: {
    id: "wbbl",
    name: "Women's Big Bash League",
    shortLabel: "WBBL",
    seasonLabel: "2025",
    tagline: "120+ Players · Draft pool",
    teams: WBBL_TEAMS,
    rules: WBBL_RULES,
    playersFile: "leagues/wbbl/players.json",
    teamGridCols: 4,
  },
};

export function getLeagueConfig(league: LeagueId): LeagueConfig {
  return LEAGUE_CONFIGS[league] ?? LEAGUE_CONFIGS.ipl;
}

export function getTeamsForLeague(league: LeagueId): TeamDef[] {
  return getLeagueConfig(league).teams;
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
];
