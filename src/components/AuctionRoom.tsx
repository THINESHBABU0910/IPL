"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RoomState, Player } from "@/lib/types";
import { formatPrice, TIMER_INITIAL, getBidIncrementLabel } from "@/lib/constants";
import { Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import PlayerCard from "./PlayerCard";
import BidHistory from "./BidHistory";
import ActivityFeed from "./ActivityFeed";
import TeamLogo from "./TeamLogo";
import FranchiseBidBar from "./FranchiseBidBar";
import TeamStatsTabs from "./TeamStatsTabs";
import AuctionLiveChat from "./AuctionLiveChat";

export type AuctionTabId = "live" | "teams" | "feed";

interface AuctionRoomProps {
  roomState: RoomState;
  myTeamId: string | null;
  isSpectator?: boolean;
  socket: Socket;
  playerName?: string;
  activeTab: AuctionTabId;
  soldInfo: { player: Player; teamId: string; price: number } | null;
  unsoldPlayer: Player | null;
  rtmInfo: { player: Player; teamId: string; price: number; seconds: number } | null;
  rtmUsedInfo: { player: Player; teamId: string; price: number } | null;
}

function hammerCall(seconds: number): string | null {
  if (seconds === 5) return "ONCE";
  if (seconds === 3) return "TWICE";
  if (seconds === 1) return "FINAL!";
  return null;
}

export default function AuctionRoom({
  roomState, myTeamId, isSpectator = false, socket, playerName, activeTab,
  soldInfo, unsoldPlayer, rtmInfo, rtmUsedInfo,
}: AuctionRoomProps) {
  const [timerSeconds, setTimerSeconds] = useState(roomState.auction.timerSeconds);
  const [bidPending, setBidPending] = useState(false);
  const bidTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const auction = roomState.auction;
  const myTeam = myTeamId ? roomState.teams[myTeamId] : null;
  const currentPlayer = auction.currentPlayer;
  const isMyBid = auction.currentBidder === myTeamId;
  const isRTMForMe = rtmInfo && rtmInfo.teamId === myTeamId;
  const nextAmount = auction.currentBidder ? auction.nextBidAmount : (currentPlayer?.basePriceLakhs ?? 0);

  useEffect(() => { setTimerSeconds(auction.timerSeconds); }, [auction.timerSeconds]);

  useEffect(() => {
    const handler = (data: { seconds: number }) => setTimerSeconds(data.seconds);
    socket.on("timer-tick", handler);
    return () => { socket.off("timer-tick", handler); };
  }, [socket]);

  useEffect(() => {
    setBidPending(false);
    if (bidTimeoutRef.current) clearTimeout(bidTimeoutRef.current);
  }, [auction.currentBid, auction.currentBidder]);

  const handleBid = useCallback(() => {
    if (bidPending || isMyBid || !currentPlayer) return;
    setBidPending(true);
    socket.emit("place-bid");
    bidTimeoutRef.current = setTimeout(() => setBidPending(false), 2000);
  }, [bidPending, isMyBid, currentPlayer, socket]);

  const canBid = !isSpectator && myTeam && currentPlayer && !isMyBid && !bidPending && !auction.isPaused &&
    myTeam.purse >= nextAmount;

  const timerColor = timerSeconds <= 3 ? "#ef4444" : timerSeconds <= 7 ? "#f59e0b" : "#22c55e";
  const callout = hammerCall(timerSeconds);

  if (activeTab === "teams") {
    return (
      <div className="panel-fill p-2">
        <TeamStatsTabs roomState={roomState} myTeamId={myTeamId} currentBidder={auction.currentBidder} />
      </div>
    );
  }

  if (activeTab === "feed") {
    return (
      <div className="panel-fill p-2 gap-2 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto glass-card p-2">
          <BidHistory entries={auction.bidHistory} teams={roomState.teams} />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto glass-card p-2">
          <ActivityFeed entries={roomState.activityFeed} />
        </div>
      </div>
    );
  }

  // LIVE tab — single screen, no page scroll
  return (
    <div className="panel-fill px-2 pb-1">
      <div className="flex flex-col h-full min-h-0">
        {/* My team strip */}
        {myTeam && (
          <div className="shrink-0 flex items-center gap-2 py-1.5 px-2 mb-1 rounded-lg bg-ipl-card/60 border border-ipl-border/40">
            <TeamLogo teamId={myTeam.id} logoUrl={myTeam.logoUrl} shortName={myTeam.shortName} size={24} />
            <span className="font-bold text-xs" style={{ color: myTeam.primaryColor }}>{myTeam.shortName}</span>
            <span className="text-[10px] text-ipl-gold font-bold ml-auto">{formatPrice(myTeam.purse)}</span>
            <span className="text-[10px] text-gray-400">{myTeam.squad.length + myTeam.retainedPlayers.length}/25</span>
          </div>
        )}

        {/* Auction stage */}
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-ipl-border/50 bg-gradient-to-b from-ipl-purple/20 to-black/80 p-2 overflow-hidden">
          {/* Top bar: set + timer */}
          <div className="shrink-0 flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-gray-400 truncate max-w-[45%]">{auction.currentSetName || "—"}</span>
            <div className="flex items-center gap-2">
              {auction.isPaused && <span className="text-[9px] text-amber-400 font-bold">PAUSED</span>}
              {callout && <span className="text-[9px] text-red-400 font-bold">{callout}</span>}
              <span className="text-2xl font-mono font-black tabular-nums leading-none" style={{ color: timerColor }}>
                {timerSeconds}
              </span>
            </div>
            <span className="text-[10px] text-gray-500">R{auction.round}</span>
          </div>

          <div className="shrink-0 h-1 bg-ipl-dark rounded-full overflow-hidden mb-1.5">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: timerColor }}
              animate={{ width: `${(timerSeconds / TIMER_INITIAL) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {currentPlayer ? (
            <>
              <div className="shrink-0 mb-1.5">
                <PlayerCard player={currentPlayer} compact />
              </div>

              {/* Bid display */}
              <div className="shrink-0 text-center mb-1">
                <div className="text-[9px] uppercase tracking-wider text-gray-500">
                  {auction.currentBidder ? "Current Bid" : "Base Price"}
                </div>
                <div className="text-3xl font-black text-ipl-gold leading-tight">
                  {formatPrice(auction.currentBid)}
                </div>
                {auction.currentBidder && roomState.teams[auction.currentBidder] && (
                  <div className="flex items-center justify-center gap-1.5 mt-0.5">
                    <TeamLogo
                      teamId={auction.currentBidder}
                      logoUrl={roomState.teams[auction.currentBidder].logoUrl}
                      shortName={roomState.teams[auction.currentBidder].shortName}
                      size={20}
                    />
                    <span className="text-sm font-bold" style={{ color: roomState.teams[auction.currentBidder].primaryColor }}>
                      {roomState.teams[auction.currentBidder].shortName}
                    </span>
                    {isMyBid && <span className="text-[10px] text-green-400">YOU</span>}
                  </div>
                )}
                <div className="text-[10px] text-gray-500 mt-0.5">
                  Next: {formatPrice(nextAmount)} · {getBidIncrementLabel(auction.currentBid || currentPlayer.basePriceLakhs).replace(" per bid", "")}
                </div>
              </div>

              {/* Chat — internal scroll only */}
              <div className="flex-1 min-h-0 flex flex-col justify-end">
                <AuctionLiveChat
                  messages={roomState.chat}
                  activityFeed={roomState.activityFeed}
                  socket={socket}
                  disabled={isSpectator}
                  playerName={playerName}
                  compact
                />
              </div>

              {/* Bid button */}
              {myTeamId && !auction.isPaused && !isSpectator && (
                <button
                  type="button"
                  onClick={handleBid}
                  disabled={!canBid}
                  className={`shrink-0 w-full mt-1.5 py-3 rounded-xl font-black text-base tracking-wide ${
                    isMyBid ? "bg-green-600/80 text-white"
                      : canBid ? "bid-btn text-black"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {isMyBid ? "HIGHEST BIDDER" : bidPending ? "RAISING..." : `RAISE TO ${formatPrice(nextAmount)}`}
                </button>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Next player...</div>
          )}
        </div>

        <FranchiseBidBar roomState={roomState} currentBidder={auction.currentBidder} myTeamId={myTeamId} compact />
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {soldInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 pointer-events-none">
            <div className="text-center px-4">
              <div className="text-5xl font-black text-green-400">SOLD!</div>
              <div className="text-lg text-white font-bold mt-1">{soldInfo.player.name}</div>
              <div className="flex items-center justify-center gap-2 text-base mt-2">
                <TeamLogo teamId={soldInfo.teamId} logoUrl={roomState.teams[soldInfo.teamId]?.logoUrl || ""} shortName={roomState.teams[soldInfo.teamId]?.shortName || ""} size={28} />
                <span className="text-ipl-gold font-bold">{formatPrice(soldInfo.price)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {unsoldPlayer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 pointer-events-none">
            <div className="text-center">
              <div className="text-5xl font-black text-red-400">UNSOLD</div>
              <div className="text-lg text-white mt-2">{unsoldPlayer.name}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rtmInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
            <div className="glass-card p-5 w-full max-w-sm text-center">
              <div className="text-purple-400 text-xs font-bold uppercase mb-1">Right to Match</div>
              <div className="text-lg font-bold">{rtmInfo.player.name}</div>
              <div className="text-2xl font-bold text-ipl-gold">{formatPrice(rtmInfo.price)}</div>
              <div className="text-3xl font-mono font-bold text-red-400 my-3">{rtmInfo.seconds}s</div>
              {isRTMForMe ? (
                <div className="flex gap-2">
                  <button type="button" onClick={() => socket.emit("use-rtm")} className="flex-1 py-2.5 bg-green-600 rounded-lg font-bold text-sm">USE RTM</button>
                  <button type="button" onClick={() => socket.emit("decline-rtm")} className="flex-1 py-2.5 bg-red-600 rounded-lg font-bold text-sm">DECLINE</button>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Waiting for {roomState.teams[rtmInfo.teamId]?.shortName}...</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
