"use client";

import { BidEntry, TeamState } from "@/lib/types";
import { formatPrice } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

interface BidHistoryProps {
  entries: BidEntry[];
  teams: Record<string, TeamState>;
}

export default function BidHistory({ entries, teams }: BidHistoryProps) {
  if (entries.length === 0) return null;

  const reversed = [...entries].reverse().slice(0, 10);

  return (
    <div className="glass-card p-3">
      <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Bid History</h4>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {reversed.map((entry, i) => {
            const team = teams[entry.teamId];
            return (
              <motion.div
                key={`${entry.timestamp}-${entry.teamId}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${
                  i === 0 ? "bg-ipl-gold/10" : "bg-ipl-dark/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {team && (
                    <>
                      <span>{team.logo}</span>
                      <span style={{ color: team.primaryColor }} className="font-semibold">
                        {team.shortName}
                      </span>
                    </>
                  )}
                </div>
                <span className="text-ipl-gold font-semibold">{formatPrice(entry.amount)}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
