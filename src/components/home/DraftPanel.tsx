"use client";

import { DraftGender } from "@/lib/types";
import { DRAFT_GENDER_TABS, getDraftSubtitle } from "@/lib/draftRules";

interface DraftPanelProps {
  draftGender: DraftGender;
  onSelectGender: (g: DraftGender) => void;
}

export default function DraftPanel({ draftGender, onSelectGender }: DraftPanelProps) {
  return (
    <>
      <div className="shrink-0 flex gap-1 p-1 rounded-2xl bg-ipl-card/50 border border-ipl-border/50">
        {DRAFT_GENDER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectGender(tab.id)}
            className={`action-pill flex-1 text-[11px] ${draftGender === tab.id ? "action-pill-active" : "action-pill-inactive"}`}
          >
            <span className="mr-1">{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>
      <p className="shrink-0 text-[10px] text-gray-500 uppercase tracking-wider font-semibold px-1">
        Snake draft · custom teams · 18–25 squad
      </p>
      <div className="ref-card shrink-0 p-4">
        <div className="text-2xl mb-2">🐍</div>
        <div className="font-bold text-ipl-gold text-sm">Multiplayer Snake Draft</div>
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{getDraftSubtitle(draftGender)}</p>
        <ul className="text-[10px] text-gray-500 mt-3 space-y-1 list-disc list-inside">
          <li>10 fantasy team slots — rename, recolor, emoji logos</li>
          <li>No overseas cap · no auction prices</li>
          <li>Re-shuffled snake order each cycle</li>
        </ul>
      </div>
    </>
  );
}
