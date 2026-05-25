"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RoomState, Player } from "@/lib/types";
import { formatPrice, TIMER_INITIAL, TOTAL_PURSE } from "@/lib/constants";
import { Socket } from "socket.io-client";
import { motion } from "framer-motion";
import { TEAM_MAP } from "@/data/teams";

const ROLE_LABELS: Record<string, string> = {
  BATTER: "Batsman",
  BOWLER: "Bowler",
  "ALL-ROUNDER": "All-Rounder",
  WICKETKEEPER: "Wicketkeeper",
};

function countryCode(country: string): string {
  const map: Record<string, string> = {
    India: "IN", Australia: "AU", England: "EN", "South Africa": "SA",
    "New Zealand": "NZ", "West Indies": "WI", Afghanistan: "AF", Bangladesh: "BD",
    "Sri Lanka": "SL", Pakistan: "PK", Netherlands: "NL", "United States": "US",
  };
  return map[country] || country.slice(0, 2).toUpperCase();
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

  const auction = roomState.auction;
  const myTeam = myTeamId ? roomState.teams[myTeamId] : null;
  const currentPlayer = auction.currentPlayer;
  const isMyBid = auction.currentBidder === myTeamId;
  const nextAmount = auction.currentBidder ? auction.nextBidAmount : (currentPlayer?.basePriceLakhs ?? 0);

  useEffect(() => {
    setBidPending(false);
    if (bidTimeoutRef.current) clearTimeout(bidTimeoutRef.current);
  }, [auction.currentBid, auction.currentBidder]);

  const canBid = !isSpectator && myTeam && currentPlayer && !isMyBid && !bidPending && !auction.isPaused &&
    myTeam.purse >= nextAmount;

  const handleBid = useCallback(() => {
    if (bidPending || isMyBid || !currentPlayer) return;
    setBidPending(true);
    socket.emit("place-bid");
    bidTimeoutRef.current = setTimeout(() => setBidPending(false), 2000);
  }, [bidPending, isMyBid, currentPlayer, socket]);

  const timerPct = (timerSeconds / TIMER_INITIAL) * 100;
  const displayPrice = auction.currentBidder ? auction.currentBid : (currentPlayer?.basePriceLakhs ?? 0);

  if (!currentPlayer) {
    return (
      <div className="shrink-0 ref-card mx-2 mt-1 mb-1">
        <p className="text-center text-gray-400 text-sm py-4">Waiting for next player...</p>
      </div>
    );
  }

  const prevTeam = currentPlayer.previousTeam && currentPlayer.previousTeam !== "None"
    ? TEAM_MAP[currentPlayer.previousTeam] : null;

  return (
    <div className="shrink-0 ref-card mx-2 mt-1 mb-1 p-0 overflow-hidden">
      <div className="ref-timer-bar mx-0 rounded-none">
        <motion.div className="ref-timer-fill" animate={{ width: `${timerPct}%` }} transition={{ duration: 0.3 }} />
      </div>

      <div className="p-2.5 space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="ref-pill ref-pill-blue">{ROLE_LABELS[currentPlayer.role] || currentPlayer.role}</span>
          {currentPlayer.isOverseas && <span className="ref-pill ref-pill-purple">OS</span>}
          <span className="text-[10px] text-gray-400">{countryCode(currentPlayer.country)}</span>
          {prevTeam && (
            <span className="text-[10px] text-gray-500 ml-auto">{prevTeam.shortName}</span>
          )}
          {auction.isPaused && (
            <span className="ref-pill ref-pill-orange ml-auto border border-orange-500/50">PAUSED</span>
          )}
          {!auction.isPaused && (
            <span className="ml-auto text-lg font-mono font-black tabular-nums text-[#F97316]">{timerSeconds}s</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-white truncate flex-1">{currentPlayer.name}</h2>
          <div className="text-right shrink-0">
            <div className="text-[9px] text-gray-500 uppercase">{auction.currentBidder ? "Current" : "Base"}</div>
            <div className="text-lg font-black text-white">{formatPrice(displayPrice)}</div>
          </div>
        </div>

        {auction.currentBidder && roomState.teams[auction.currentBidder] && (
          <div className="text-[10px] text-gray-400">
            Leading: <span className="text-[#FFD700] font-semibold">{roomState.teams[auction.currentBidder].shortName}</span>
            {isMyBid && <span className="text-green-400 ml-1">(YOU)</span>}
          </div>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          {myTeam && (
            <div className="shrink-0 text-[11px] flex gap-2">
              <span>
                <span className="text-gray-500">Left: </span>
                <span className="text-[#22C55E] font-bold">{formatPrice(myTeam.purse)}</span>
              </span>
              <span>
                <span className="text-gray-500">Spent: </span>
                <span className="text-[#FFD700] font-bold">{formatPrice(TOTAL_PURSE - myTeam.purse)}</span>
              </span>
            </div>
          )}
          {myTeamId && !isSpectator && (
            <button
              type="button"
              onClick={handleBid}
              disabled={!canBid && !isMyBid}
              className={`ref-bid-btn ${isMyBid ? "ref-bid-btn-highest" : ""}`}
            >
              {isMyBid ? "HIGHEST" : bidPending ? "..." : `BID ${formatPrice(nextAmount)}`}
            </button>
          )}
          <button type="button" onClick={onOpenPool} className="ref-icon-btn shrink-0" aria-label="Upcoming players">
            ☰
          </button>
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
  const auction = roomState.auction;
  const myTeam = myTeamId ? roomState.teams[myTeamId] : null;
  const currentPlayer = auction.currentPlayer;
  const isMyBid = auction.currentBidder === myTeamId;
  const nextAmount = auction.currentBidder ? auction.nextBidAmount : (currentPlayer?.basePriceLakhs ?? 0);

  const canBid = !isSpectator && myTeam && currentPlayer && !isMyBid && !bidPending && !auction.isPaused &&
    myTeam.purse >= nextAmount;

  if (!myTeamId || isSpectator || !currentPlayer || auction.isPaused) return null;

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
        className={`w-full py-3 rounded-xl font-black text-sm ${isMyBid ? "bg-green-700 text-white" : "bid-btn text-black"}`}
      >
        {isMyBid ? "YOU ARE HIGHEST BIDDER" : bidPending ? "RAISING..." : `RAISE TO ${formatPrice(nextAmount)}`}
      </button>
    </div>
  );
}
