"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RoomState } from "@/lib/types";
import { formatLeaguePrice, formatBidRaiseLabel, getBidIncrementForLeague } from "@/lib/leagueRules";
import { getLeagueConfig } from "@/data/leagueRegistry";
import { getSetShortLabel } from "@/data/playerLoader";
import { getPlayerPoolId } from "@/lib/legendRules";
import { Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import TeamLogo from "./TeamLogo";

const ROLE_LABELS: Record<string, string> = {
  BATTER: "Batsman",
  BOWLER: "Bowler",
  "ALL-ROUNDER": "All-Rounder",
  WICKETKEEPER: "Wicketkeeper",
};

function countryCode(country: string): string {
  const map: Record<string, string> = {
    India: "IND", Australia: "AUS", England: "ENG", "South Africa": "SA",
    "New Zealand": "NZ", "West Indies": "WI", Afghanistan: "AFG", Bangladesh: "BAN",
    "Sri Lanka": "SL", Pakistan: "PAK", Netherlands: "NL", "United States": "USA",
  };
  return map[country] || country.slice(0, 3).toUpperCase();
}

function hammerCall(seconds: number): string | null {
  if (seconds === 5) return "ONCE";
  if (seconds === 3) return "TWICE";
  if (seconds === 1) return "FINAL!";
  return null;
}

interface AuctionPlayerStripProps {
  roomState: RoomState;
  myTeamId: string | null;
  isSpectator: boolean;
  socket: Socket;
  timerSeconds: number;
  onOpenPool: () => void;
}

export default function AuctionPlayerStrip({
  roomState, myTeamId, isSpectator, socket, timerSeconds, onOpenPool,
}: AuctionPlayerStripProps) {
  const [bidPending, setBidPending] = useState(false);
  const bidTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const league = roomState.league ?? "ipl";
  const poolId = getPlayerPoolId(league, roomState.mode);
  const totalPurse = getLeagueConfig(league).rules.totalPurse;
  const auction = roomState.auction;
  const myTeam = myTeamId ? roomState.teams[myTeamId] : null;
  const currentPlayer = auction.currentPlayer;
  const isMyBid = auction.currentBidder === myTeamId;
  const nextAmount = auction.currentBidder ? auction.nextBidAmount : (currentPlayer?.basePriceLakhs ?? 0);
  const leadingTeam = auction.currentBidder ? roomState.teams[auction.currentBidder] : null;

  useEffect(() => {
    setBidPending(false);
    if (bidTimeoutRef.current) clearTimeout(bidTimeoutRef.current);
  }, [auction.currentBid, auction.currentBidder]);

  const lotTimer = roomState.bidTimerSeconds ?? 15;
  const auctionActive = roomState.auction.phase === "auction" && !auction.isPaused;
  const canBid = auctionActive && !isSpectator && myTeam && !myTeam.isVacant && currentPlayer && !isMyBid && !bidPending &&
    myTeam.purse >= nextAmount;

  const handleBid = useCallback(() => {
    if (bidPending || isMyBid || !currentPlayer || !auctionActive) return;
    setBidPending(true);
    socket.emit("place-bid");
    bidTimeoutRef.current = setTimeout(() => setBidPending(false), 2000);
  }, [bidPending, isMyBid, currentPlayer, socket, auctionActive]);

  const timerPct = (timerSeconds / lotTimer) * 100;
  const displayPrice = auction.currentBidder ? auction.currentBid : (currentPlayer?.basePriceLakhs ?? 0);
  const callout = hammerCall(timerSeconds);
  const bidIncrement = getBidIncrementForLeague(displayPrice, league);
  const bidLabel = isMyBid
    ? formatBidRaiseLabel(bidIncrement, league)
    : bidPending ? "..." : `BID ${formatLeaguePrice(nextAmount, league)}`;

  if (!currentPlayer) {
    return (
      <div className="shrink-0 ref-card mx-2 mt-1 mb-1">
        <p className="text-center text-gray-400 text-sm py-4">Waiting for next player...</p>
      </div>
    );
  }

  return (
    <div className="shrink-0 ref-card mx-2 mt-1 mb-1 p-0 overflow-hidden">
      <div className="ref-timer-bar mx-0 rounded-none">
        <motion.div className="ref-timer-fill" animate={{ width: `${timerPct}%` }} transition={{ duration: 0.3 }} />
      </div>

      <div className="p-2.5">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="ref-pill ref-pill-orange text-[9px]">{getSetShortLabel(currentPlayer.set, poolId)}</span>
              <span className="ref-pill ref-pill-blue text-[9px]">{ROLE_LABELS[currentPlayer.role] || currentPlayer.role}</span>
              <span className="text-[10px] text-gray-400 border border-[#2A2A2A] rounded px-1">{countryCode(currentPlayer.country)}</span>
              {currentPlayer.isOverseas && <span className="ref-pill ref-pill-purple text-[9px]">OS</span>}
              {auction.isPaused && <span className="ref-pill ref-pill-orange text-[9px]">PAUSED</span>}
            </div>
            <h2 className="text-base font-bold text-white truncate">{currentPlayer.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-black text-[#22C55E]">{formatLeaguePrice(displayPrice, league)}</span>
              {leadingTeam && auction.currentBidder && (
                <TeamLogo
                  teamId={auction.currentBidder}
                  logoUrl={leadingTeam.logoUrl}
                  shortName={leadingTeam.shortName}
                  size={28}
                  league={league}
                />
              )}
              {isMyBid && <span className="text-[10px] text-green-400 font-bold">YOU</span>}
            </div>
          </div>

          {!auction.isPaused && (
            <div className="shrink-0 flex flex-col items-center">
              <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center font-black ${
                timerSeconds <= 3 ? "bg-red-600 text-white" : timerSeconds <= 7 ? "bg-orange-600 text-white" : "bg-red-700/80 text-white"
              }`}>
                <span className="text-2xl leading-none tabular-nums">{timerSeconds}</span>
                <span className="text-[8px] uppercase tracking-wide">sec</span>
              </div>
              <AnimatePresence>
                {callout && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[10px] font-black text-red-400 mt-0.5"
                  >
                    {callout}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 mt-1 border-t border-[#2A2A2A]/60">
          {myTeam && (
            <div className="shrink-0 text-[10px] flex gap-2">
              <span><span className="text-gray-500">Left: </span><span className="text-[#22C55E] font-bold">{formatLeaguePrice(myTeam.purse, league)}</span></span>
              <span><span className="text-gray-500">Spent: </span><span className="text-[#FFD700] font-bold">{formatLeaguePrice(totalPurse - myTeam.purse, league)}</span></span>
            </div>
          )}
          {myTeamId && !isSpectator && (
            <button
              type="button"
              onClick={handleBid}
              disabled={!canBid && !isMyBid}
              className={`ref-bid-btn ml-auto ${isMyBid ? "ref-bid-btn-highest" : ""}`}
            >
              {bidLabel}
            </button>
          )}
          <button type="button" onClick={onOpenPool} className="ref-icon-btn shrink-0" aria-label="Upcoming players">☰</button>
        </div>
      </div>
    </div>
  );
}

export function StickyBidBar({
  roomState, myTeamId, isSpectator, socket, onBid,
}: {
  roomState: RoomState;
  myTeamId: string | null;
  isSpectator: boolean;
  socket: Socket;
  onBid?: () => void;
}) {
  const [bidPending, setBidPending] = useState(false);
  const league = roomState.league ?? "ipl";
  const auction = roomState.auction;
  const myTeam = myTeamId ? roomState.teams[myTeamId] : null;
  const currentPlayer = auction.currentPlayer;
  const isMyBid = auction.currentBidder === myTeamId;
  const nextAmount = auction.currentBidder ? auction.nextBidAmount : (currentPlayer?.basePriceLakhs ?? 0);
  const displayPrice = auction.currentBidder ? auction.currentBid : (currentPlayer?.basePriceLakhs ?? 0);
  const bidIncrement = getBidIncrementForLeague(displayPrice, league);

  const auctionActive = roomState.auction.phase === "auction" && !auction.isPaused;
  const canBid = auctionActive && !isSpectator && myTeam && !myTeam.isVacant && currentPlayer && !isMyBid && !bidPending &&
    myTeam.purse >= nextAmount;

  if (!myTeamId || isSpectator || !currentPlayer || !auctionActive) return null;

  function handleBid() {
    if (!canBid && !isMyBid) return;
    setBidPending(true);
    socket.emit("place-bid");
    onBid?.();
    setTimeout(() => setBidPending(false), 2000);
  }

  return (
    <div className="shrink-0 px-2 pb-1">
      <button
        type="button"
        onClick={handleBid}
        disabled={!canBid && !isMyBid}
        className={`w-full py-3 rounded-xl font-black text-sm ${
          isMyBid
            ? "ref-bid-btn-highest border border-[#FFD700]/50"
            : "ref-bid-btn"
        }`}
      >
        {isMyBid
          ? formatBidRaiseLabel(bidIncrement, league)
          : bidPending
            ? "RAISING..."
            : `BID ${formatLeaguePrice(nextAmount, league)}`}
      </button>
    </div>
  );
}
