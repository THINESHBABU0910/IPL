import { Player, BidResult } from "../lib/types";
import {
  calculateBidIncrement, calculateNextBid, getOverseasBidCapLakhs,
  TIMER_BID_RESET, ROUND2_DISCOUNT, formatPrice, validateRtmCapLimits,
  isLegendMode, LEGEND_SET_ORDER_PREFIXES,
} from "../lib/iplRules";
import { calculateNextBidForLeague, formatLeaguePrice } from "../lib/leagueRules";
import { getRoomRules, getRoomLeague } from "./leagueHelpers";
import {
  buildSetQueues, pickRandomFromSets, countPoolRemaining, flattenQueues,
} from "../lib/auctionPool";
import type { Room } from "./gameState";

function applyRound2Discount(room: Room, player: Player): Player {
  const rules = getRoomRules(room);
  const basePriceLakhs = Math.max(
    rules.minBasePriceLakhs,
    Math.round(player.basePriceLakhs * rules.round2Discount),
  );
  return {
    ...player,
    basePriceLakhs,
    basePrice: basePriceLakhs * 100000,
    displayPrice: formatLeaguePrice(basePriceLakhs, getRoomLeague(room)),
  };
}

function syncRemainingPool(room: Room): void {
  if (room.poolMeta) {
    room.auction.remainingPool = flattenQueues(room.poolMeta);
  }
}

function getSetOrderPrefixes(room: Room): readonly string[] | undefined {
  return isLegendMode(room.mode) ? LEGEND_SET_ORDER_PREFIXES : getRoomRules(room).setOrderPrefixes;
}

export function presentNextPlayer(room: Room): Player | null {
  const { auction } = room;

  if (!room.poolMeta || countPoolRemaining(room.poolMeta) === 0) {
    if (auction.round === 1 && auction.unsoldPlayers.length > 0) {
      auction.round = 2;
      const discounted = auction.unsoldPlayers.map((p) => applyRound2Discount(room, p));
      room.poolMeta = buildSetQueues(discounted, `${room.id}-round2-${Date.now()}`, getSetOrderPrefixes(room));
      auction.unsoldPlayers = [];
      syncRemainingPool(room);
    } else {
      return null;
    }
  }

  if (!room.poolMeta) return null;

  const result = pickRandomFromSets(room.poolMeta);
  if (!result) {
    if (auction.round === 1 && auction.unsoldPlayers.length > 0) {
      auction.round = 2;
      const discounted = auction.unsoldPlayers.map((p) => applyRound2Discount(room, p));
      room.poolMeta = buildSetQueues(discounted, `${room.id}-round2-${Date.now()}`, getSetOrderPrefixes(room));
      auction.unsoldPlayers = [];
      syncRemainingPool(room);
      return presentNextPlayer(room);
    }
    return null;
  }

  room.poolMeta = result.meta;
  syncRemainingPool(room);

  const player = result.player;
  auction.currentPlayer = player;
  auction.currentBid = player.basePriceLakhs;
  auction.currentBidder = null;
  auction.nextBidAmount = player.basePriceLakhs;
  auction.timerSeconds = room.bidTimerSeconds;
  auction.currentSetName = player.set;
  auction.isRTM = false;
  auction.rtmTeamId = null;
  auction.rtmPrice = 0;
  auction.rtmPhase = "none";
  auction.rtmWinningBidder = null;
  auction.rtmEscalatedPrice = 0;
  auction.rtmRaiseUsed = false;
  auction.bidHistory = [];

  return player;
}

export function processBid(room: Room, teamId: string): BidResult {
  const { auction } = room;
  const team = room.teams.get(teamId);
  const rules = getRoomRules(room);
  const league = getRoomLeague(room);

  if (!team) return { success: false, reason: "Team not found" };
  if (team.isVacant) return { success: false, reason: "This team is vacant — claim it to bid" };
  if (auction.phase !== "auction" || !auction.currentPlayer)
    return { success: false, reason: "No active auction" };
  if (auction.isPaused)
    return { success: false, reason: "Auction paused" };
  if (auction.currentBidder === teamId)
    return { success: false, reason: "You are already the highest bidder" };

  const bidAmount = auction.currentBidder === null
    ? auction.currentPlayer.basePriceLakhs
    : auction.nextBidAmount;

  const overseasCap = getOverseasBidCapLakhs(room.mode, auction.currentPlayer.isOverseas);
  if (overseasCap !== null && bidAmount > overseasCap) {
    return {
      success: false,
      reason: `Overseas max fee is ${formatLeaguePrice(overseasCap, league)}`,
    };
  }

  if (team.purse < bidAmount)
    return { success: false, reason: "Insufficient purse" };

  const totalPlayers = team.squad.length + team.retainedPlayers.length;
  if (totalPlayers >= rules.maxSquadSize)
    return { success: false, reason: `Squad is full (max ${rules.maxSquadSize})` };

  if (auction.currentPlayer.isOverseas) {
    const overseasCount = [...team.squad, ...team.retainedPlayers]
      .filter((p) => p.isOverseas).length;
    if (overseasCount >= rules.maxOverseas)
      return { success: false, reason: `Overseas limit reached (max ${rules.maxOverseas})` };
  }

  const slotsNeeded = rules.minSquadSize - totalPlayers - 1;
  if (slotsNeeded > 0) {
    const purseAfterBid = team.purse - bidAmount;
    if (purseAfterBid < slotsNeeded * rules.minBasePriceLakhs)
      return { success: false, reason: "Must reserve budget for minimum squad" };
  }

  auction.currentBid = bidAmount;
  auction.currentBidder = teamId;
  auction.nextBidAmount = calculateNextBidForLeague(bidAmount, league);
  auction.timerSeconds = Math.min(auction.timerSeconds + TIMER_BID_RESET, room.bidTimerSeconds + TIMER_BID_RESET);
  auction.bidHistory.push({ teamId, amount: bidAmount, timestamp: Date.now() });

  return { success: true };
}

export function sellPlayer(room: Room): { player: Player; teamId: string; price: number } | null {
  const { auction } = room;
  if (!auction.currentPlayer || !auction.currentBidder) return null;

  const team = room.teams.get(auction.currentBidder);
  if (!team) return null;

  const player = auction.currentPlayer;
  const price = auction.currentBid;
  const buyerId = auction.currentBidder;

  team.squad.push(player);
  team.purse -= price;
  auction.soldPlayers.push({ player, teamId: buyerId, price });

  auction.rtmPrice = price;
  auction.currentPlayer = null;
  auction.currentBid = 0;
  auction.currentBidder = null;

  return { player, teamId: buyerId, price };
}

export function markUnsold(room: Room): Player | null {
  const { auction } = room;
  if (!auction.currentPlayer) return null;

  const player = auction.currentPlayer;
  auction.unsoldPlayers.push(player);
  auction.currentPlayer = null;
  auction.currentBid = 0;
  auction.currentBidder = null;
  auction.rtmPrice = 0;

  return player;
}

export function checkRTM(room: Room, player: Player, buyerTeamId: string, salePrice: number): string | null {
  if (room.mode === "legend") return null;
  const prevTeam = player.previousTeam;
  if (!prevTeam || prevTeam === "None" || prevTeam === buyerTeamId) return null;

  const team = room.teams.get(prevTeam);
  if (!team || team.rtmCards <= 0) return null;

  const capErr = validateRtmCapLimits(team, player);
  if (capErr) return null;

  const rules = getRoomRules(room);
  const totalPlayers = team.squad.length + team.retainedPlayers.length;
  if (totalPlayers >= rules.maxSquadSize) return null;
  if (team.purse < salePrice) return null;

  if (player.isOverseas) {
    const overseasCount = [...team.squad, ...team.retainedPlayers].filter((p) => p.isOverseas).length;
    if (overseasCount >= rules.maxOverseas) return null;
  }

  return prevTeam;
}

function getPendingSale(room: Room) {
  const sold = room.auction.soldPlayers;
  return sold.length ? sold[sold.length - 1] : null;
}

function updatePendingSalePrice(room: Room, newPrice: number): boolean {
  const sale = getPendingSale(room);
  if (!sale) return false;
  const buyer = room.teams.get(sale.teamId);
  if (!buyer) return false;
  const diff = newPrice - sale.price;
  if (diff > 0 && buyer.purse < diff) return false;
  buyer.purse -= diff;
  sale.price = newPrice;
  return true;
}

/** RTM team invokes card → winning bidder gets one raise, then RTM team must match */
export function startRtmEscalation(room: Room): { winningBidder: string; price: number } | null {
  const sale = getPendingSale(room);
  if (!sale || !room.auction.currentPlayer) return null;

  room.auction.rtmPhase = "escalate";
  room.auction.rtmWinningBidder = sale.teamId;
  room.auction.rtmEscalatedPrice = sale.price;
  room.auction.rtmRaiseUsed = false;
  room.auction.rtmPrice = sale.price;

  return { winningBidder: sale.teamId, price: sale.price };
}

export function processRtmRaise(room: Room): { success: boolean; newPrice?: number; reason?: string } {
  const { auction } = room;
  if (auction.rtmPhase !== "escalate") return { success: false, reason: "Not in RTM escalation" };
  if (auction.rtmRaiseUsed) return { success: false, reason: "Final raise already used" };

  const base = auction.rtmEscalatedPrice || auction.rtmPrice || 0;
  const newPrice = calculateNextBidForLeague(base, getRoomLeague(room));
  const sale = getPendingSale(room);
  if (!sale) return { success: false, reason: "No pending sale" };

  const buyer = room.teams.get(sale.teamId);
  if (!buyer) return { success: false, reason: "Winning bidder not found" };
  const diff = newPrice - sale.price;
  if (diff > 0 && buyer.purse < diff) return { success: false, reason: "Insufficient purse to raise" };

  if (!updatePendingSalePrice(room, newPrice)) {
    return { success: false, reason: "Could not apply raise" };
  }

  auction.rtmEscalatedPrice = newPrice;
  auction.rtmRaiseUsed = true;
  auction.rtmPrice = newPrice;
  return { success: true, newPrice };
}

export function beginRtmMatchPhase(room: Room): number {
  room.auction.rtmPhase = "match";
  return room.auction.rtmEscalatedPrice || room.auction.rtmPrice || 0;
}

export function completeRtmMatch(room: Room, rtmTeamId: string): { success: boolean; reason?: string; price?: number } {
  const { auction } = room;
  const player = auction.currentPlayer;
  if (!player) return { success: false, reason: "No player in RTM" };

  const price = auction.rtmEscalatedPrice || auction.rtmPrice || 0;
  const team = room.teams.get(rtmTeamId);
  if (!team || team.rtmCards <= 0) return { success: false, reason: "No RTM cards left" };

  const capErr = validateRtmCapLimits(team, player);
  if (capErr) return { success: false, reason: capErr };
  if (team.purse < price) return { success: false, reason: "Insufficient purse to match" };

  const sale = getPendingSale(room);
  if (!sale) return { success: false, reason: "No pending sale" };

  const buyer = room.teams.get(sale.teamId);
  if (buyer) {
    buyer.squad = buyer.squad.filter((p) => p.id !== player.id);
    buyer.purse += sale.price;
  }
  auction.soldPlayers.pop();

  team.squad.push(player);
  team.purse -= price;
  team.rtmCards--;
  if (!team.rtmAcquisitions) team.rtmAcquisitions = [];
  team.rtmAcquisitions.push(player);
  auction.soldPlayers.push({ player, teamId: rtmTeamId, price });

  return { success: true, price };
}

/** RTM team passes on match — winning bidder keeps player, RTM card restored */
export function passRtmMatch(room: Room): { winningBidder: string; price: number } | null {
  const sale = getPendingSale(room);
  if (!sale) return null;
  return { winningBidder: sale.teamId, price: sale.price };
}

export function clearRtmAuctionState(room: Room): void {
  const { auction } = room;
  auction.isRTM = false;
  auction.rtmTeamId = null;
  auction.rtmPhase = "none";
  auction.rtmWinningBidder = null;
  auction.rtmEscalatedPrice = 0;
  auction.rtmRaiseUsed = false;
  auction.rtmPrice = 0;
  auction.rtmTimerSeconds = 0;
  auction.isPaused = false;
  auction.currentPlayer = null;
}

export function getRemainingCount(room: Room): number {
  return countPoolRemaining(room.poolMeta) +
    (room.auction.round === 1 ? room.auction.unsoldPlayers.length : 0);
}
