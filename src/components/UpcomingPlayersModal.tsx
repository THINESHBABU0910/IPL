"use client";

import { useMemo, useState } from "react";
import { RoomState, Player } from "@/lib/types";
import { sortSetKey, LEGEND_SET_ORDER_PREFIXES } from "@/lib/constants";
import { getSetShortLabel } from "@/data/playerLoader";
import { getPlayerPoolId } from "@/lib/legendRules";
import { motion, AnimatePresence } from "framer-motion";

const ROLE_LABELS: Record<string, string> = {
  BATTER: "Batsman",
  BOWLER: "Bowler",
  "ALL-ROUNDER": "All-Rounder",
  WICKETKEEPER: "Wicketkeeper",
};

interface UpcomingPlayersModalProps {
  roomState: RoomState;
  open: boolean;
  onClose: () => void;
}

type TabId = "up" | "sold" | "unsold";

function groupBySetOrder(
  players: Player[],
  orderPrefixes?: readonly string[],
): { setName: string; players: Player[] }[] {
  const map = new Map<string, Player[]>();
  for (const p of players) {
    const set = p.set || "Other";
    if (!map.has(set)) map.set(set, []);
    map.get(set)!.push(p);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => sortSetKey(a, orderPrefixes) - sortSetKey(b, orderPrefixes))
    .map(([setName, list]) => ({ setName, players: list }));
}

export default function UpcomingPlayersModal({ roomState, open, onClose }: UpcomingPlayersModalProps) {
  const [tab, setTab] = useState<TabId>("up");
  const league = roomState.league ?? "ipl";
  const poolId = getPlayerPoolId(league, roomState.mode);
  const setPrefixes = poolId === "legend" ? LEGEND_SET_ORDER_PREFIXES : undefined;

  const sold = roomState.auction.soldPlayers.map((s) => s.player);
  const unsold = roomState.auction.unsoldPlayers;

  const grouped = useMemo(() => {
    if (tab === "up") {
      if (roomState.upcomingPreviewBySet?.length) {
        return roomState.upcomingPreviewBySet;
      }
      return groupBySetOrder(roomState.upcomingPreview || [], setPrefixes);
    }
    return groupBySetOrder(tab === "sold" ? sold : unsold, setPrefixes);
  }, [tab, roomState.upcomingPreviewBySet, roomState.upcomingPreview, sold, unsold, setPrefixes]);

  const counts = { up: roomState.poolRemaining, sold: sold.length, unsold: unsold.length };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="w-full max-w-lg max-h-[85dvh] bg-[#1A1A1A] rounded-t-2xl sm:rounded-2xl border border-[#2A2A2A] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
              <h3 className="font-bold text-white">Player Pool</h3>
              <button type="button" onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
            </div>

            <div className="flex gap-1 p-2 border-b border-[#2A2A2A]">
              {(["up", "sold", "unsold"] as TabId[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${
                    tab === t ? "bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/40" : "text-gray-500"
                  }`}
                >
                  {t === "up" ? "Up" : t === "sold" ? "Sold" : "Un"}
                  <span className="px-1.5 py-0.5 rounded-full bg-[#2A2A2A] text-[10px]">{counts[t]}</span>
                </button>
              ))}
            </div>

            {tab === "up" && (
              <div className="mx-3 mt-2 mb-1 px-3 py-2 rounded-lg bg-[#A855F7]/15 border border-[#A855F7]/30 text-[10px] text-purple-200">
                Marquee set has the top 35 players (batters, bowlers & all-rounders). Next player picked at random within each set.
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {grouped.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">No players in this list</p>
              )}
              {grouped.map(({ setName, players }) => (
                <div key={setName}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="ref-pill ref-pill-orange text-[9px]" title={setName}>
                      {getSetShortLabel(setName, poolId)}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{setName}</span>
                    <span className="text-[10px] text-gray-500">{players.length} players</span>
                    {roomState.auction.currentSetName === setName && tab === "up" && (
                      <span className="text-[9px] text-[#F97316] font-bold">LIVE SET</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {players.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A]">
                        <div>
                          <div className="font-semibold text-sm text-white">{p.name}</div>
                          <div className="flex gap-1 mt-0.5">
                            <span className="ref-pill ref-pill-blue text-[8px]">{ROLE_LABELS[p.role] || p.role}</span>
                            {p.isOverseas && <span className="ref-pill ref-pill-purple text-[8px]">OS</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-[#22C55E]">{p.displayPrice}</div>
                          <div className="text-[9px] text-gray-500">Base</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
