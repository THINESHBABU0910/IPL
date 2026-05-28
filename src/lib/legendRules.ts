import type { AuctionMode, LeagueId, PlayerPoolId } from "./types";
import { isLegendMode } from "./iplRules";

export function getPlayerPoolId(league: LeagueId, mode: AuctionMode): PlayerPoolId {
  if (isLegendMode(mode)) return "legend";
  return league;
}

export function validateCreateRoom(league: LeagueId, mode: AuctionMode): string | null {
  if (isLegendMode(mode) && league !== "ipl") {
    return "Legend mode is only available for IPL (10 franchises)";
  }
  return null;
}
