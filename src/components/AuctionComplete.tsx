"use client";

import { RoomState } from "@/lib/types";
import { formatPrice, TOTAL_PURSE } from "@/lib/constants";
import { motion } from "framer-motion";
import { Socket } from "socket.io-client";
import TeamLogo from "./TeamLogo";
import SquadTeamAccordion from "./SquadTeamAccordion";

interface AuctionCompleteProps {
  roomState: RoomState;
  socket?: Socket;
  isHost?: boolean;
  myTeamId?: string | null;
  playerName?: string;
}

export default function AuctionComplete({ roomState, socket, isHost, myTeamId, playerName }: AuctionCompleteProps) {
  const teams = Object.entries(roomState.teams);
  const allSold = roomState.auction.soldPlayers;

  const mostExpensive = allSold.length > 0
    ? allSold.reduce((a, b) => (a.price > b.price ? a : b))
    : null;

  const teamSpending = teams.map(([id, team]) => ({
    id,
    team,
    spent: TOTAL_PURSE - team.purse,
    total: team.squad.length + team.retainedPlayers.length,
  }));

  const biggestSpender = teamSpending.length > 0
    ? teamSpending.reduce((a, b) => (a.spent > b.spent ? a : b))
    : null;
  const mostPlayers = teamSpending.length > 0
    ? teamSpending.reduce((a, b) => (a.total > b.total ? a : b))
    : null;

  function exportResults() {
    const blob = new Blob([JSON.stringify(roomState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ipl-auction-${roomState.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-6xl mx-auto px-2 py-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#FFD700] mb-2">
          AUCTION COMPLETE
        </h1>
        <p className="text-gray-400 text-sm">
          IPL 2026 · {allSold.length} players sold · {roomState.auction.unsoldPlayers.length} unsold
        </p>
        {myTeamId && roomState.teams[myTeamId] && (
          <p className="text-sm text-[#FFD700] mt-2">
            Your squad: {roomState.teams[myTeamId].shortName} ·{" "}
            {roomState.teams[myTeamId].squad.length + roomState.teams[myTeamId].retainedPlayers.length} players ·{" "}
            Spent {formatPrice(TOTAL_PURSE - roomState.teams[myTeamId].purse)}
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {mostExpensive && (
          <div className="ref-card p-4 text-center">
            <div className="text-xs text-gray-500 uppercase mb-1">Most Expensive</div>
            <div className="font-bold text-lg">{mostExpensive.player.name}</div>
            <div className="text-[#FFD700] font-bold">{formatPrice(mostExpensive.price)}</div>
            <div className="text-xs text-gray-400">to {roomState.teams[mostExpensive.teamId]?.shortName}</div>
          </div>
        )}
        {biggestSpender && (
          <div className="ref-card p-4 text-center">
            <div className="text-xs text-gray-500 uppercase mb-1">Biggest Spender</div>
            <div className="flex items-center justify-center gap-2">
              <TeamLogo teamId={biggestSpender.team.id} logoUrl={biggestSpender.team.logoUrl} shortName={biggestSpender.team.shortName} size={28} />
              <span className="font-bold text-lg" style={{ color: biggestSpender.team.primaryColor }}>
                {biggestSpender.team.shortName}
              </span>
            </div>
            <div className="text-[#FFD700] font-bold">{formatPrice(biggestSpender.spent)}</div>
          </div>
        )}
        {mostPlayers && (
          <div className="ref-card p-4 text-center">
            <div className="text-xs text-gray-500 uppercase mb-1">Largest Squad</div>
            <div className="flex items-center justify-center gap-2">
              <TeamLogo teamId={mostPlayers.team.id} logoUrl={mostPlayers.team.logoUrl} shortName={mostPlayers.team.shortName} size={28} />
              <span className="font-bold text-lg" style={{ color: mostPlayers.team.primaryColor }}>
                {mostPlayers.team.shortName}
              </span>
            </div>
            <div className="text-white font-bold">{mostPlayers.total} players</div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">All Squads</h2>
        <SquadTeamAccordion
          roomState={roomState}
          myTeamId={myTeamId ?? null}
          playerName={playerName}
          isHost={isHost}
          showActions
        />
      </div>

      <div className="text-center flex flex-wrap justify-center gap-3 pb-4">
        <button type="button" onClick={exportResults}
          className="px-5 py-2.5 bg-purple-700 rounded-xl text-white font-bold text-sm">
          Export Results
        </button>
        {isHost && socket && (
          <button type="button" onClick={() => socket.emit("host-action", { action: "rematch" })}
            className="px-5 py-2.5 bid-btn rounded-xl text-black font-bold text-sm">
            Rematch
          </button>
        )}
        <button type="button" onClick={() => { window.location.href = "/"; }}
          className="px-5 py-2.5 border border-[#2A2A2A] rounded-xl text-white font-bold text-sm">
          New Room
        </button>
      </div>
    </div>
  );
}
