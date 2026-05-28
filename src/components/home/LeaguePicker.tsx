"use client";

import { LeagueId } from "@/lib/types";
import { LEAGUE_GROUPS, LEAGUE_TABS, getLeagueConfig } from "@/data/leagueRegistry";
import { isLegendMode } from "@/lib/constants";
import { AuctionMode } from "@/lib/types";

interface LeaguePickerProps {
  selectedLeague: LeagueId;
  selectedMode: AuctionMode;
  onSelectLeague: (id: LeagueId) => void;
}

export default function LeaguePicker({ selectedLeague, selectedMode, onSelectLeague }: LeaguePickerProps) {
  const legendLocked = isLegendMode(selectedMode);
  const tabMap = Object.fromEntries(LEAGUE_TABS.map((t) => [t.id, t]));

  return (
    <div className="shrink-0 space-y-2">
      {LEAGUE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold px-1 mb-1.5">
            {group.label}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {group.leagues.map((id) => {
              const tab = tabMap[id];
              const cfg = getLeagueConfig(id);
              const selected = selectedLeague === id;
              const disabled = legendLocked && id !== "ipl";
              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectLeague(id)}
                  className={`league-card text-left ${selected ? "league-card-selected" : "league-card-unselected"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <span className="text-lg">{tab.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`font-bold text-xs ${selected ? "text-ipl-gold" : "text-white"}`}>
                      {tab.label}
                    </div>
                    <div className="text-[9px] text-gray-500 truncate">{cfg.tagline}</div>
                  </div>
                  {selected && <span className="text-ipl-gold text-xs">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
