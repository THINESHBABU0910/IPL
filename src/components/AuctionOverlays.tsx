"use client";

import { Player, RoomState } from "@/lib/types";
import { calculateNextBidForLeague, formatLeaguePrice } from "@/lib/leagueRules";
import { Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import TeamLogo from "./TeamLogo";

export type RtmOverlayInfo = {
  player: Player;
  teamId: string;
  price: number;
  seconds: number;
  phase?: "offer" | "escalate" | "match";
  winningBidder?: string;
  escalatedPrice?: number;
  raiseUsed?: boolean;
};

interface AuctionOverlaysProps {
  roomState: RoomState;
  socket: Socket;
  myTeamId: string | null;
  soldInfo: { player: Player; teamId: string; price: number } | null;
  unsoldPlayer: Player | null;
  rtmInfo: RtmOverlayInfo | null;
}

export default function AuctionOverlays({
  roomState, socket, myTeamId, soldInfo, unsoldPlayer, rtmInfo,
}: AuctionOverlaysProps) {
  const league = roomState.league ?? "ipl";
  const phase = rtmInfo?.phase || "offer";
  const isRtmTeam = rtmInfo && rtmInfo.teamId === myTeamId;
  const isWinningBidder = rtmInfo?.winningBidder === myTeamId;
  const displayPrice = rtmInfo?.escalatedPrice ?? rtmInfo?.price ?? 0;
  const nextRaise = calculateNextBidForLeague(displayPrice, league);

  return (
    <>
      <AnimatePresence>
        {soldInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-none">
            <div className="text-center px-4">
              <div className="text-5xl font-black text-green-400">SOLD!</div>
              <div className="text-lg text-white font-bold mt-1">{soldInfo.player.name}</div>
              <div className="flex items-center justify-center gap-2 text-base mt-2">
                <TeamLogo teamId={soldInfo.teamId} logoUrl={roomState.teams[soldInfo.teamId]?.logoUrl || ""} shortName={roomState.teams[soldInfo.teamId]?.shortName || ""} size={28} league={league} />
                <span className="text-[#FFD700] font-bold">{formatLeaguePrice(soldInfo.price, league)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {unsoldPlayer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-none">
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
            <div className="ref-card p-5 w-full max-w-sm text-center">
              <div className="text-purple-400 text-xs font-bold uppercase mb-1">
                {phase === "offer" && "Right to Match"}
                {phase === "escalate" && "RTM — Final Raise"}
                {phase === "match" && "RTM — Match Price"}
              </div>
              <div className="text-lg font-bold">{rtmInfo.player.name}</div>
              <div className="text-2xl font-bold text-[#FFD700]">{formatLeaguePrice(displayPrice, league)}</div>
              {phase === "escalate" && !rtmInfo.raiseUsed && (
                <div className="text-xs text-gray-400 mt-1">Raise to {formatLeaguePrice(nextRaise, league)}</div>
              )}
              <div className="text-3xl font-mono font-bold text-red-400 my-3">{rtmInfo.seconds}s</div>

              {phase === "offer" && isRtmTeam && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => socket.emit("use-rtm")} className="flex-1 py-2.5 bg-green-600 rounded-lg font-bold text-sm">USE RTM</button>
                  <button type="button" onClick={() => socket.emit("decline-rtm")} className="flex-1 py-2.5 bg-red-600 rounded-lg font-bold text-sm">DECLINE</button>
                </div>
              )}

              {phase === "escalate" && isWinningBidder && !rtmInfo.raiseUsed && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => socket.emit("rtm-raise")} className="flex-1 py-2.5 bg-[#FFD700] text-black rounded-lg font-bold text-sm">
                    RAISE ({formatLeaguePrice(nextRaise, league)})
                  </button>
                  <button type="button" onClick={() => socket.emit("rtm-skip-raise")} className="flex-1 py-2.5 bg-gray-600 rounded-lg font-bold text-sm">SKIP</button>
                </div>
              )}

              {phase === "match" && isRtmTeam && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => socket.emit("rtm-match")} className="flex-1 py-2.5 bg-green-600 rounded-lg font-bold text-sm">MATCH</button>
                  <button type="button" onClick={() => socket.emit("decline-rtm")} className="flex-1 py-2.5 bg-red-600 rounded-lg font-bold text-sm">PASS</button>
                </div>
              )}

              {phase === "offer" && !isRtmTeam && (
                <p className="text-gray-400 text-sm">Waiting for {roomState.teams[rtmInfo.teamId]?.shortName}...</p>
              )}
              {phase === "escalate" && !isWinningBidder && (
                <p className="text-gray-400 text-sm">
                  {roomState.teams[rtmInfo.winningBidder || ""]?.shortName} gets one final raise
                </p>
              )}
              {phase === "match" && !isRtmTeam && (
                <p className="text-gray-400 text-sm">
                  {roomState.teams[rtmInfo.teamId]?.shortName} must match or pass (card restored if pass)
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
