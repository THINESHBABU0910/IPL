"use client";

import { useState } from "react";
import { DraftTeamSlot } from "@/lib/types";

const EMOJI_PRESETS = ["🏏", "⚡", "🔥", "👑", "🦁", "🐯", "🦅", "⭐", "💎", "🎯"];

interface DraftTeamEditorProps {
  slot: DraftTeamSlot;
  canEdit: boolean;
  onSave: (updates: Partial<DraftTeamSlot>) => void;
  compact?: boolean;
}

export default function DraftTeamEditor({ slot, canEdit, onSave, compact }: DraftTeamEditorProps) {
  const [name, setName] = useState(slot.name);
  const [primary, setPrimary] = useState(slot.primaryColor);
  const [secondary, setSecondary] = useState(slot.secondaryColor);
  const [emoji, setEmoji] = useState(slot.logoEmoji || "🏏");

  if (!canEdit) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ background: `linear-gradient(135deg, ${slot.primaryColor}, ${slot.secondaryColor})` }}
        >
          {slot.logoEmoji || slot.shortName.slice(0, 2)}
        </span>
        <span className="font-bold text-sm text-white truncate">{slot.name}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${compact ? "" : "ref-card p-3"}`}>
      <div className="flex items-center gap-2">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border border-white/10"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        >
          {emoji}
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          className="flex-1 pro-input text-sm py-1.5"
          placeholder="Team name"
        />
      </div>
      <div className="flex gap-2">
        <label className="text-[10px] text-gray-500 flex-1">
          Primary
          <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="w-full h-8 rounded mt-0.5" />
        </label>
        <label className="text-[10px] text-gray-500 flex-1">
          Secondary
          <input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} className="w-full h-8 rounded mt-0.5" />
        </label>
      </div>
      <div className="flex gap-1 flex-wrap">
        {EMOJI_PRESETS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmoji(e)}
            className={`w-8 h-8 rounded-lg text-base ${emoji === e ? "ring-2 ring-ipl-gold" : "bg-ipl-card"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSave({ name, primaryColor: primary, secondaryColor: secondary, logoEmoji: emoji })}
        className="w-full py-2 rounded-lg bg-ipl-gold/20 text-ipl-gold text-xs font-bold border border-ipl-gold/40"
      >
        Save branding
      </button>
    </div>
  );
}
