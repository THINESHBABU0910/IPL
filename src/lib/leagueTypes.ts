import type { TeamDef } from "./types";

export type LeagueId = "ipl" | "wpl" | "hundred";

export interface LeagueRules {
  maxFranchises: number;
  totalPurse: number;
  maxSquadSize: number;
  minSquadSize: number;
  maxOverseas: number;
  maxRetentions: number;
  maxCappedRetentions: number;
  maxUncappedRetentions: number;
  flexMaxCappedRetentions: number;
  flexMaxUncappedRetentions: number;
  minBasePriceLakhs: number;
  retentionCostsCapped: number[];
  retentionCostUncapped: number;
  timerInitial: number;
  timerBidReset: number;
  rtmTimer: number;
  retentionTimer: number;
  round2Discount: number;
  setOrderPrefixes: string[];
  /** Display prefix for prices — ₹ for IPL/WPL, £ for The Hundred */
  currencySymbol: string;
  /** Human-readable purse label */
  purseLabel: string;
}

export interface LeagueConfig {
  id: LeagueId;
  name: string;
  shortLabel: string;
  seasonLabel: string;
  tagline: string;
  teams: TeamDef[];
  rules: LeagueRules;
  playersFile: string;
  /** Grid columns for team picker */
  teamGridCols: number;
}

export const LEAGUE_IDS: LeagueId[] = ["ipl", "wpl", "hundred"];

export const DEFAULT_LEAGUE: LeagueId = "ipl";
