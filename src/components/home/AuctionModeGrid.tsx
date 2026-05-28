"use client";

import { AuctionMode, LeagueId } from "@/lib/types";
import { getModeSubtitle } from "@/lib/leagueRules";
import { isLegendMode } from "@/lib/constants";
import { AUCTION_MODES } from "./homeConstants";

interface AuctionModeGridProps {
  selectedLeague: LeagueId;
  selectedMode: AuctionMode;
  onSelectMode: (mode: AuctionMode) => void;
}

export default function AuctionModeGrid({
  selectedLeague,
  selectedMode,
  onSelectMode,
}: AuctionModeGridProps) {
  const legendActive = isLegendMode(selectedMode);
  const modes = AUCTION_MODES.filter((m) => {
    if (legendActive) return m.id === "legend";
    if (m.id === "legend") return false;
    if (m.iplOnly && selectedLeague !== "ipl") return false;
    return true;
  });
  const showLegendEntry = !legendActive && selectedLeague === "ipl";

  return (
    <>
      <p className="shrink-0 text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-1">
        Choose auction mode
      </p>
      <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onSelectMode(mode.id)}
            className={`mode-card shrink-0 ${selectedMode === mode.id ? "mode-card-selected" : "mode-card-unselected"}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${mode.accent} opacity-60 pointer-events-none`} />
            <div className="relative flex items-start gap-3">
              <span className="text-2xl animate-float">{mode.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-bold text-sm ${selectedMode === mode.id ? "text-ipl-gold" : "text-white"}`}>
                  {mode.title}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                  {getModeSubtitle(mode.id, selectedLeague)}
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                  selectedMode === mode.id ? "border-ipl-gold bg-ipl-gold" : "border-ipl-border"
                }`}
              >
                {selectedMode === mode.id && <span className="text-black text-[10px] font-black">✓</span>}
              </div>
            </div>
          </button>
        ))}
        {showLegendEntry && (
          <button
            type="button"
            onClick={() => onSelectMode("legend")}
            className="shrink-0 w-full py-2.5 rounded-xl border border-dashed border-ipl-border/80 text-[11px] text-gray-400 hover:text-ipl-gold hover:border-ipl-gold/50 transition-colors"
          >
            ⭐ Legend Auction — IPL all-time greats
          </button>
        )}
        {legendActive && (
          <button
            type="button"
            onClick={() => onSelectMode("mega")}
            className="shrink-0 w-full py-2 text-[11px] text-gray-500 hover:text-white transition-colors"
          >
            ← Back to standard auction modes
          </button>
        )}
      </div>
    </>
  );
}
