/**
 * Official IPL Player Regulations (2025–27 cycle)
 * Sources: IPLT20 GC announcement, BCCI auction handbook
 */

export const MAX_FRANCHISES = 10;
export const TOTAL_PURSE = 12000; // ₹120 Cr in lakhs
export const MAX_SQUAD_SIZE = 25;
export const MIN_SQUAD_SIZE = 18;
export const MAX_OVERSEAS = 8;
export const MAX_RETENTIONS = 6; // Retentions + RTM combined max 6
export const MAX_CAPPED_RETENTIONS = 5;
export const MAX_UNCAPPED_RETENTIONS = 2;

/** Flex retention: custom prices, any player from pool */
export const FLEX_MAX_CAPPED_RETENTIONS = 4;
export const FLEX_MAX_UNCAPPED_RETENTIONS = 2;

/** Minimum base price from IPL 2025 mega auction onwards */
export const MIN_BASE_PRICE_LAKHS = 30;

/** Capped retention purse deductions by slot order (1st–5th capped retained) */
export const RETENTION_COSTS_CAPPED = [1800, 1400, 1100, 1800, 1400]; // ₹18/14/11/18/14 Cr
export const RETENTION_COST_UNCAPPED = 400; // ₹4 Cr per uncapped (max 2)

export const RETENTION_SLOT_LABELS = [
  "1st capped — ₹18 Cr",
  "2nd capped — ₹14 Cr",
  "3rd capped — ₹11 Cr",
  "4th capped — ₹18 Cr",
  "5th capped — ₹14 Cr",
];

/** Mega auction record high (reference) */
export const MEGA_AUCTION_RECORD_BID_LAKHS = 2700;

export const TIMER_INITIAL = 15;
export const TIMER_BID_RESET = 5;
export const TIMER_MAX = 15;
export const RTM_TIMER = 15;
export const RETENTION_TIMER = 180;
export const ROUND2_DISCOUNT = 0.9; // Accelerated round — unsold at 90% base

export const SET_ORDER_PREFIXES = ["M", "BA", "AL", "WK", "FA", "SP", "UBA", "UAL", "UWK", "UFA", "USP"];

/**
 * Official IPL incremental bid slabs (BCCI 2025 mega auction handbook):
 * - Up to ₹1 Cr     → +₹5 L
 * - ₹1 Cr – ₹2 Cr   → +₹10 L
 * - ₹2 Cr – ₹5 Cr   → +₹20 L
 * - ₹5 Cr and above → +₹25 L
 */
export function calculateBidIncrement(currentBidLakhs: number): number {
  if (currentBidLakhs < 100) return 5;
  if (currentBidLakhs < 200) return 10;
  if (currentBidLakhs < 500) return 20;
  return 25;
}

export function calculateNextBid(currentBidLakhs: number): number {
  return currentBidLakhs + calculateBidIncrement(currentBidLakhs);
}

export function getBidIncrementLabel(currentBidLakhs: number): string {
  if (currentBidLakhs < 100) return "Up to ₹1 Cr: +₹5 L per bid";
  if (currentBidLakhs < 200) return "₹1–2 Cr: +₹10 L per bid";
  if (currentBidLakhs < 500) return "₹2–5 Cr: +₹20 L per bid";
  return "₹5 Cr+: +₹25 L per bid";
}

export function isRetentionMode(mode: string): boolean {
  return mode === "custom_retention" || mode === "flex_retention";
}

export function isRtmAllowed(mode: string): boolean {
  return mode === "mega" || isRetentionMode(mode);
}

export function validateRtmCapLimits(
  team: { retainedPlayers: { isCapped: boolean; country: string }[]; rtmAcquisitions?: { isCapped: boolean; country: string }[] },
  player: { isCapped: boolean; country: string },
): string | null {
  const rtmAcq = team.rtmAcquisitions || [];
  const retained = team.retainedPlayers;
  const cappedTotal = retained.filter((p) => p.isCapped).length + rtmAcq.filter((p) => p.isCapped).length;
  const uncappedIndianTotal =
    retained.filter((p) => !p.isCapped && p.country === "India").length
    + rtmAcq.filter((p) => !p.isCapped && p.country === "India").length;

  if (player.isCapped && cappedTotal + 1 > MAX_CAPPED_RETENTIONS) {
    return `Max ${MAX_CAPPED_RETENTIONS} capped players (retentions + RTM combined)`;
  }
  if (!player.isCapped && player.country === "India" && uncappedIndianTotal + 1 > MAX_UNCAPPED_RETENTIONS) {
    return `Max ${MAX_UNCAPPED_RETENTIONS} uncapped Indian players (retentions + RTM combined)`;
  }
  return null;
}

export function getCombinedRtmQuotaRemaining(retainedCount: number, rtmCards: number): number {
  return rtmCards;
}

export function getInitialRtmCards(mode: string, retainedCount: number): number {
  if (!isRtmAllowed(mode)) return 0;
  return Math.max(0, MAX_RETENTIONS - retainedCount);
}

export function getOverseasBidCapLakhs(_mode: string, _isOverseas: boolean): number | null {
  return null;
}

export function normalizePriceLakhs(value: unknown): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : 0;
}

export function validateFlexRetentions(
  players: { id: string; isCapped: boolean; isOverseas: boolean }[],
  prices: Record<string, number>,
): string | null {
  if (players.length > MAX_RETENTIONS) return `Maximum ${MAX_RETENTIONS} retentions allowed`;
  const capped = players.filter((p) => p.isCapped).length;
  const uncapped = players.filter((p) => !p.isCapped).length;
  if (capped > FLEX_MAX_CAPPED_RETENTIONS) return `Maximum ${FLEX_MAX_CAPPED_RETENTIONS} capped retentions in flex mode`;
  if (uncapped > FLEX_MAX_UNCAPPED_RETENTIONS) return `Maximum ${FLEX_MAX_UNCAPPED_RETENTIONS} uncapped retentions in flex mode`;
  const overseas = players.filter((p) => p.isOverseas).length;
  if (overseas > MAX_OVERSEAS) return `Maximum ${MAX_OVERSEAS} overseas players in retentions`;
  let total = 0;
  for (const p of players) {
    const price = normalizePriceLakhs(prices[p.id]);
    if (price <= 0) return "Set a price for each retained player";
    if (price > TOTAL_PURSE) return `Max price per player is ${formatPrice(TOTAL_PURSE)}`;
    total += price;
  }
  if (total > TOTAL_PURSE) return "Retention cost exceeds ₹120 Cr purse";
  return null;
}

function hashSeed(seedStr: string): number {
  let seed = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    seed ^= seedStr.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

/** Deterministic index in [0, max) from a seed string */
export function seededRandomInt(max: number, seedStr: string): number {
  if (max <= 0) return 0;
  let seed = hashSeed(seedStr);
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed % max;
}

/** Fisher–Yates shuffle with deterministic seed (unique per room / round) */
export function seededShuffle<T>(items: T[], seedStr: string): T[] {
  const arr = [...items];
  let seed = hashSeed(seedStr);
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function calculateFlexRetentionCost(prices: Record<string, number>, playerIds: string[]): number {
  return playerIds.reduce((sum, id) => sum + normalizePriceLakhs(prices[id]), 0);
}

export function calculateRetentionCost(players: { isCapped: boolean }[]): number {
  let cost = 0;
  let cappedIdx = 0;
  for (const p of players) {
    if (p.isCapped) {
      if (cappedIdx < RETENTION_COSTS_CAPPED.length) {
        cost += RETENTION_COSTS_CAPPED[cappedIdx];
        cappedIdx++;
      }
    } else {
      cost += RETENTION_COST_UNCAPPED;
    }
  }
  return cost;
}

export function validateRetentions(players: { isCapped: boolean; isOverseas: boolean }[]): string | null {
  if (players.length > MAX_RETENTIONS) return `Maximum ${MAX_RETENTIONS} retentions allowed (official IPL rule)`;
  const capped = players.filter((p) => p.isCapped).length;
  const uncapped = players.filter((p) => !p.isCapped).length;
  if (capped > MAX_CAPPED_RETENTIONS) return `Maximum ${MAX_CAPPED_RETENTIONS} capped retentions (Indian & overseas)`;
  if (uncapped > MAX_UNCAPPED_RETENTIONS) return `Maximum ${MAX_UNCAPPED_RETENTIONS} uncapped retentions`;
  const overseas = players.filter((p) => p.isOverseas).length;
  if (overseas > MAX_OVERSEAS) return `Maximum ${MAX_OVERSEAS} overseas players in squad`;
  return null;
}

export function formatPrice(lakhs: number): string {
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    return cr % 1 === 0 ? `${cr} Cr` : `${cr.toFixed(2)} Cr`;
  }
  return `${lakhs} L`;
}

export function sortSetKey(setStr: string): number {
  for (let i = 0; i < SET_ORDER_PREFIXES.length; i++) {
    const prefix = SET_ORDER_PREFIXES[i];
    if (setStr.startsWith(prefix)) {
      const num = parseInt(setStr.slice(prefix.length)) || 0;
      return i * 100 + num;
    }
  }
  return 9999;
}

export const IPL_RULES_SUMMARY = {
  purse: "₹120 Cr per franchise (mega auction cycle)",
  squad: "18–25 players, max 8 overseas",
  retentions: "Up to 6 combined (retentions + RTM). Max 5 capped + 2 uncapped Indian across both",
  rtmProcess: "RTM triggers escalation: winning bidder raises once, then original team must match or pass (card restored if pass)",
  retentionSlabs: "Capped: ₹18/14/11/18/14 Cr by slot · Uncapped: ₹4 Cr each",
  flexRetention: "Pick any players · Custom prices · Max 4 capped + 2 uncapped · Deducted from ₹120 Cr",
  bidIncrements: "₹5L (≤1Cr) · ₹10L (1–2Cr) · ₹20L (2–5Cr) · ₹25L (5Cr+)",
};
