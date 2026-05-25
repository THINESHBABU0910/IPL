"use client";

import { useState } from "react";

/** Curated GIF URLs (Giphy CDN) — no API key required */
const PRESET_GIFS = [
  { label: "🔥", url: "https://media.giphy.com/media/26BRuo6sKon-oYnBu/giphy.gif" },
  { label: "👏", url: "https://media.giphy.com/media/l0MYt5jPR6QX5Aq2s/giphy.gif" },
  { label: "🏏", url: "https://media.giphy.com/media/3o7aCTPPm4OHfRLSH6/giphy.gif" },
  { label: "😂", url: "https://media.giphy.com/media/13CoXDiaCcGyqQ/giphy.gif" },
  { label: "💰", url: "https://media.giphy.com/media/3o6Zt4HU9qF3VqVq2Y/giphy.gif" },
  { label: "🎉", url: "https://media.giphy.com/media/l0HlBO7eyXASszjkA/giphy.gif" },
  { label: "😱", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif" },
  { label: "🦁", url: "https://media.giphy.com/media/3o7TKSjRrfIPjeiV2w/giphy.gif" },
];

interface GifPickerProps {
  disabled?: boolean;
  onPick: (gifUrl: string) => void;
}

export default function GifPicker({ disabled, onPick }: GifPickerProps) {
  const [open, setOpen] = useState(false);

  if (disabled) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2.5 py-2 rounded-xl border border-[#2A2A2A] text-[10px] font-bold text-gray-300 hover:border-[#FFD700]/40"
      >
        GIF
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute bottom-full left-0 mb-1 z-50 p-2 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] shadow-xl w-56">
            <div className="grid grid-cols-4 gap-1">
              {PRESET_GIFS.map((g) => (
                <button
                  key={g.url}
                  type="button"
                  onClick={() => { onPick(g.url); setOpen(false); }}
                  className="aspect-square rounded-lg overflow-hidden border border-[#2A2A2A] hover:border-[#FFD700]/50"
                  title="Send GIF"
                >
                  <img src={g.url} alt={g.label} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            <p className="text-[9px] text-gray-500 mt-1.5 px-0.5">Or paste a .gif / Giphy link in chat</p>
          </div>
        </>
      )}
    </div>
  );
}

export function isGifMessage(text: string): boolean {
  const t = text.trim();
  if (t.startsWith("gif:")) return true;
  if (/\.gif(\?|$)/i.test(t)) return true;
  if (/giphy\.com\/media|tenor\.com\/view|media\.tenor\.com/i.test(t)) return true;
  return false;
}

export function gifUrlFromMessage(text: string): string | null {
  const t = text.trim();
  if (t.startsWith("gif:")) return t.slice(4).trim();
  if (/^https?:\/\/.+/i.test(t) && isGifMessage(t)) return t;
  return null;
}
