"use client";

import { useState } from "react";
import { RoomState, Player } from "@/lib/types";
import { formatPrice, TOTAL_PURSE } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Socket } from "socket.io-client";
import TeamLogo from "./TeamLogo";

interface AuctionCompleteProps {
  roomState: RoomState;
  socket?: Socket;
  isHost?: boolean;
  myTeamId?: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  BATTER: "#3b82f6",
  BOWLER: "#ef4444",
  "ALL-ROUNDER": "#8b5cf6",
  WICKETKEEPER: "#22c55e",
};

export default function AuctionComplete({ roomState, socket, isHost, myTeamId }: AuctionCompleteProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const teams = Object.entries(roomState.teams);

  // MVP stats
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-ipl-gold via-yellow-300 to-ipl-gold bg-clip-text text-transparent mb-2">
          AUCTION COMPLETE
        </h1>
        <p className="text-gray-400">
          IPL 2026 · {allSold.length} players sold &bull; {roomState.auction.unsoldPlayers.length} unsold
        </p>
        {myTeamId && roomState.teams[myTeamId] && (
          <p className="text-sm text-[#FFD700] mt-2">
            Your squad: {roomState.teams[myTeamId].shortName} ·{" "}
            {roomState.teams[myTeamId].squad.length + roomState.teams[myTeamId].retainedPlayers.length} players ·{" "}
            Spent {formatPrice(TOTAL_PURSE - roomState.teams[myTeamId].purse)}
          </p>
        )}
      </motion.div>

      {/* MVP Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {mostExpensive && (
          <div className="glass-card p-4 text-center">
            <div className="text-xs text-gray-500 uppercase mb-1">Most Expensive</div>
            <div className="font-bold text-lg">{mostExpensive.player.name}</div>
            <div className="text-ipl-gold font-bold">{formatPrice(mostExpensive.price)}</div>
            <div className="text-xs text-gray-400">to {roomState.teams[mostExpensive.teamId]?.shortName}</div>
          </div>
        )}
        {biggestSpender && (
        <div className="glass-card p-4 text-center">
          <div className="text-xs text-gray-500 uppercase mb-1">Biggest Spender</div>
          <div className="flex items-center justify-center gap-2">
            <TeamLogo teamId={biggestSpender.team.id} logoUrl={biggestSpender.team.logoUrl} shortName={biggestSpender.team.shortName} size={28} />
            <span className="font-bold text-lg" style={{ color: biggestSpender.team.primaryColor }}>
              {biggestSpender.team.shortName}
            </span>
          </div>
          <div className="text-ipl-gold font-bold">{formatPrice(biggestSpender.spent)}</div>
        </div>
        )}
        {mostPlayers && (
        <div className="glass-card p-4 text-center">
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

      {/* All teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map(([id, team], index) => {
          const allPlayers = [...team.retainedPlayers, ...team.squad];
          const overseasCount = allPlayers.filter((p) => p.isOverseas).length;
          const spent = TOTAL_PURSE - team.purse;
          const isExpanded = expandedTeam === id;

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedTeam(isExpanded ? null : id)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <TeamLogo teamId={team.id} logoUrl={team.logoUrl} shortName={team.shortName} size={36} />
                  <div className="text-left">
                    <div className="font-bold" style={{ color: team.primaryColor }}>
                      {team.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {allPlayers.length} players &bull; {overseasCount} overseas &bull; {team.ownerName}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-ipl-gold font-bold">{formatPrice(team.purse)}</div>
                  <div className="text-xs text-gray-400">Spent: {formatPrice(spent)}</div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-1">
                      {team.retainedPlayers.map((p) => (
                        <PlayerRow key={p.id} player={p} label="Retained" />
                      ))}
                      {team.squad.map((p) => {
                        const sale = roomState.auction.soldPlayers.find(
                          (s) => s.player.id === p.id && s.teamId === id
                        );
                        return (
                          <PlayerRow
                            key={p.id}
                            player={p}
                            label={sale ? formatPrice(sale.price) : p.displayPrice}
                          />
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="text-center mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={exportResults}
          className="px-6 py-3 bg-ipl-purple rounded-xl text-white font-bold">
          Export Results
        </button>
        {isHost && socket && (
          <button type="button" onClick={() => socket.emit("host-action", { action: "rematch" })}
            className="px-6 py-3 bid-btn rounded-xl text-black font-bold">
            Rematch
          </button>
        )}
        <button type="button" onClick={() => { window.location.href = "/"; }}
          className="px-6 py-3 border border-ipl-border rounded-xl text-white font-bold">
          New Room
        </button>
      </div>
    </div>
  );
}

function PlayerRow({ player, label }: { player: Player; label: string }) {
  const roleColor = ROLE_COLORS[player.role] || "#6b7280";
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-ipl-dark/30 rounded-lg text-sm">
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: roleColor }}
        />
        <span className="font-medium">{player.name}</span>
        {player.isOverseas && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-300">OS</span>
        )}
      </div>
      <span className={`text-xs font-semibold ${label === "Retained" ? "text-green-400" : "text-ipl-gold"}`}>
        {label}
      </span>
    </div>
  );
}
