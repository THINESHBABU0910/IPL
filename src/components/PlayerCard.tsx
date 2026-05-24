"use client";

import { Player } from "@/lib/types";
import { motion } from "framer-motion";

const ROLE_COLORS: Record<string, string> = {
  BATTER: "#3b82f6",
  BOWLER: "#ef4444",
  "ALL-ROUNDER": "#8b5cf6",
  WICKETKEEPER: "#22c55e",
};

const ROLE_LABELS: Record<string, string> = {
  BATTER: "Batter",
  BOWLER: "Bowler",
  "ALL-ROUNDER": "All-Rounder",
  WICKETKEEPER: "Wicketkeeper",
};

interface PlayerCardProps {
  player: Player;
  compact?: boolean;
}

export default function PlayerCard({ player, compact = false }: PlayerCardProps) {
  const roleColor = ROLE_COLORS[player.role] || "#6b7280";

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg bg-black/30 border border-ipl-border/40">
        <div
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border"
          style={{ borderColor: roleColor, backgroundColor: roleColor + "15" }}
        >
          {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{player.name}</div>
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] px-1 rounded" style={{ backgroundColor: roleColor + "25", color: roleColor }}>
              {ROLE_LABELS[player.role]?.slice(0, 3) || player.role}
            </span>
            {player.isOverseas && <span className="text-[9px] text-blue-300">OS</span>}
            <span className="text-[10px] text-gray-500 truncate">{player.country}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] text-gray-500">Base</div>
          <div className="text-sm font-bold text-ipl-gold">{player.displayPrice}</div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key={player.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 w-full max-w-sm text-center"
    >
      {/* Player avatar placeholder */}
      <div
        className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold border-2"
        style={{ borderColor: roleColor, backgroundColor: roleColor + "15" }}
      >
        {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
      </div>

      <h3 className="text-xl font-bold text-white mb-1">{player.name}</h3>

      <div className="flex items-center justify-center gap-2 mb-2">
        <span
          className="px-2 py-0.5 rounded text-xs font-semibold"
          style={{ backgroundColor: roleColor + "25", color: roleColor }}
        >
          {ROLE_LABELS[player.role] || player.role}
        </span>
        {player.isOverseas && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300">
            Overseas
          </span>
        )}
        {!player.isCapped && (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/20 text-purple-300">
            Uncapped
          </span>
        )}
      </div>

      <div className="text-sm text-gray-400 mb-2">
        {player.country} &bull; Age {player.age}
      </div>

      {player.battingStyle && (
        <div className="text-xs text-gray-500">
          {player.battingStyle === "RHB" ? "Right-Hand Bat" : "Left-Hand Bat"}
          {player.bowlingStyle && player.bowlingStyle !== "Unknown" && ` | ${player.bowlingStyle}`}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-ipl-border">
        <span className="text-xs text-gray-500">Base Price</span>
        <div className="text-lg font-bold text-ipl-gold">{player.displayPrice}</div>
      </div>

      {player.previousTeam && player.previousTeam !== "None" && (
        <div className="text-xs text-gray-500 mt-1">
          Previous: {player.previousTeam}
        </div>
      )}
    </motion.div>
  );
}
