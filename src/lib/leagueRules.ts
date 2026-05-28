import type { LeagueId } from "./leagueTypes";
import { getLeagueConfig } from "@/data/leagueRegistry";

/** League-aware price formatting */
export function formatLeaguePrice(lakhs: number, league: LeagueId = "ipl"): string {
  const { rules } = getLeagueConfig(league);
  const currencySymbol = rules.currencySymbol;

  if (league === "hundred") {
    // Internal units: 1 = £1,000
    if (lakhs >= 1000) {
      const m = lakhs / 1000;
      return `${currencySymbol}${m % 1 === 0 ? m : m.toFixed(2)}M`;
    }
    return `${currencySymbol}${lakhs}K`;
  }

  if (league === "sa20") {
    if (lakhs >= 1000) {
      const m = lakhs / 1000;
      return `${currencySymbol}${m % 1 === 0 ? m : m.toFixed(2)}M`;
    }
    if (lakhs >= 100) return `${currencySymbol}${(lakhs / 100).toFixed(1)}M`;
    return `${currencySymbol}${lakhs}K`;
  }

  if (league === "bbl" || league === "wbbl") {
    if (lakhs >= 1000) {
      const m = lakhs / 1000;
      return `${currencySymbol}${m % 1 === 0 ? m : m.toFixed(2)}M`;
    }
    if (lakhs >= 100) return `${currencySymbol}${(lakhs / 100).toFixed(2)}M`;
    return `${currencySymbol}${lakhs}K`;
  }

  // IPL / WPL — INR lakhs and crores
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    return `${currencySymbol}${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  return `${currencySymbol}${lakhs} L`;
}

export function getBidIncrementForLeague(currentBidLakhs: number, league: LeagueId = "ipl"): number {
  if (league === "hundred") {
    if (currentBidLakhs < 50) return 5;
    if (currentBidLakhs < 100) return 10;
    if (currentBidLakhs < 200) return 15;
    return 25;
  }
  if (league === "wpl") {
    if (currentBidLakhs < 50) return 5;
    if (currentBidLakhs < 100) return 10;
    if (currentBidLakhs < 200) return 15;
    return 20;
  }
  if (league === "sa20") {
    if (currentBidLakhs < 50) return 5;
    if (currentBidLakhs < 150) return 10;
    if (currentBidLakhs < 300) return 20;
    return 30;
  }
  if (league === "bbl" || league === "wbbl") {
    if (currentBidLakhs < 50) return 5;
    if (currentBidLakhs < 100) return 10;
    if (currentBidLakhs < 200) return 15;
    return 20;
  }
  // IPL official slabs
  if (currentBidLakhs < 100) return 5;
  if (currentBidLakhs < 200) return 10;
  if (currentBidLakhs < 500) return 20;
  return 25;
}

export function calculateNextBidForLeague(currentBidLakhs: number, league: LeagueId = "ipl"): number {
  return currentBidLakhs + getBidIncrementForLeague(currentBidLakhs, league);
}

/** Label for “you are highest bidder — next raise” button */
export function formatBidRaiseLabel(incrementLakhs: number, league: LeagueId = "ipl"): string {
  return `BID (+${formatLeaguePrice(incrementLakhs, league)})`;
}

export function getLeagueRulesSummary(league: LeagueId): string {
  const cfg = getLeagueConfig(league);
  const r = cfg.rules;
  return `${cfg.rules.purseLabel} purse · ${r.minSquadSize}–${r.maxSquadSize} squad · max ${r.maxOverseas} overseas`;
}

export function getModeSubtitle(mode: string, league: LeagueId): string {
  const cfg = getLeagueConfig(league);
  const purse = cfg.rules.purseLabel;
  switch (mode) {
    case "mega":
      return `Full player pool · RTM enabled · ${purse} purse`;
    case "custom_retention":
      return `Official slabs · Pick squad · RTM after lock`;
    case "flex_retention":
      return `Any player · Your prices · ${purse} purse`;
    case "legend":
      return "IPL franchises · All-time legends · No retention · No RTM";
    default:
      return getLeagueRulesSummary(league);
  }
}

export function calculateRetentionCostForLeague(
  league: LeagueId,
  players: { isCapped: boolean }[],
): number {
  const rules = getLeagueConfig(league).rules;
  let cost = 0;
  let cappedIdx = 0;
  for (const p of players) {
    if (p.isCapped) {
      if (cappedIdx < rules.retentionCostsCapped.length) {
        cost += rules.retentionCostsCapped[cappedIdx];
        cappedIdx++;
      }
    } else {
      cost += rules.retentionCostUncapped;
    }
  }
  return cost;
}

export function validateRetentionsForLeague(
  league: LeagueId,
  players: { isCapped: boolean; isOverseas: boolean }[],
): string | null {
  const rules = getLeagueConfig(league).rules;
  if (players.length > rules.maxRetentions) {
    return `Maximum ${rules.maxRetentions} retentions allowed`;
  }
  const capped = players.filter((p) => p.isCapped).length;
  const uncapped = players.filter((p) => !p.isCapped).length;
  if (capped > rules.maxCappedRetentions) {
    return `Maximum ${rules.maxCappedRetentions} capped retentions`;
  }
  if (uncapped > rules.maxUncappedRetentions) {
    return `Maximum ${rules.maxUncappedRetentions} uncapped retentions`;
  }
  const overseas = players.filter((p) => p.isOverseas).length;
  if (overseas > rules.maxOverseas) {
    return `Maximum ${rules.maxOverseas} overseas players in squad`;
  }
  return null;
}

export function validateFlexRetentionsForLeague(
  league: LeagueId,
  players: { id: string; isCapped: boolean; isOverseas: boolean }[],
  prices: Record<string, number>,
): string | null {
  const rules = getLeagueConfig(league).rules;
  if (players.length > rules.maxRetentions) {
    return `Maximum ${rules.maxRetentions} retentions allowed`;
  }
  const capped = players.filter((p) => p.isCapped).length;
  const uncapped = players.filter((p) => !p.isCapped).length;
  if (capped > rules.flexMaxCappedRetentions) {
    return `Maximum ${rules.flexMaxCappedRetentions} capped retentions in flex mode`;
  }
  if (uncapped > rules.flexMaxUncappedRetentions) {
    return `Maximum ${rules.flexMaxUncappedRetentions} uncapped retentions in flex mode`;
  }
  const overseas = players.filter((p) => p.isOverseas).length;
  if (overseas > rules.maxOverseas) {
    return `Maximum ${rules.maxOverseas} overseas players in retentions`;
  }
  let total = 0;
  for (const p of players) {
    const price = Math.round(Number(prices[p.id]));
    if (!Number.isFinite(price) || price <= 0) return "Set a price for each retained player";
    if (price > rules.totalPurse) return `Max price per player is ${formatLeaguePrice(price, league)}`;
    total += price;
  }
  if (total > rules.totalPurse) {
    return `Retention cost exceeds ${rules.purseLabel} purse`;
  }
  return null;
}

export function getInitialRtmCardsForLeague(
  league: LeagueId,
  mode: string,
  retainedCount: number,
): number {
  const rules = getLeagueConfig(league).rules;
  if (mode === "legend") return 0;
  const allowed = mode === "mega" || mode === "custom_retention" || mode === "flex_retention";
  if (!allowed) return 0;
  return Math.max(0, rules.maxRetentions - retainedCount);
}
