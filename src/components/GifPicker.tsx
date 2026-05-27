"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { GifItem } from "@/lib/gifCatalog";
import {
  getClientGifCache,
  setClientGifCache,
  getClientPrefixCache,
} from "@/lib/gifClientCache";

const GIF_LIMIT = 24;
const DEBOUNCE_MS = 500;
const MIN_SEARCH_LEN = 3;

interface GifPickerProps {
  disabled?: boolean;
  onPick: (gifUrl: string) => void;
  children?: ReactNode;
}

function GifThumb({ item, onPick }: { item: GifItem; onPick: () => void }) {
  const [src, setSrc] = useState(item.preview || item.url);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const tryFallback = useCallback(() => {
    if (src !== item.url) {
      setSrc(item.url);
      setLoaded(false);
      return;
    }
    setFailed(true);
  }, [src, item.url]);

  if (failed) return null;

  return (
    <button
      type="button"
      onClick={onPick}
      className="relative aspect-square rounded-lg overflow-hidden border border-[#2A2A2A] hover:border-[#FFD700]/60 bg-[#111] transition-colors"
      title="Send GIF"
    >
      {!loaded && (
        <span className="absolute inset-0 flex items-center justify-center text-lg animate-pulse">🏏</span>
      )}
      <img
        src={src}
        alt=""
        className={`w-full h-full object-cover ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={tryFallback}
      />
    </button>
  );
}

export default function GifPicker({ disabled, onPick, children }: GifPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const applyResults = useCallback((list: GifItem[], q: string, cached: boolean) => {
    setGifs(list);
    setFromCache(cached);
    setError(list.length ? null : "No GIFs found — try another search");
  }, []);

  const loadGifs = useCallback(async (q: string) => {
    const trimmed = q.trim();

    if (trimmed.length > 0 && trimmed.length < MIN_SEARCH_LEN) {
      const prefix = getClientPrefixCache(trimmed, GIF_LIMIT);
      if (prefix?.length) {
        applyResults(prefix, trimmed, true);
        setError(null);
        return;
      }
      setError(null);
      return;
    }

    const cached = getClientGifCache(trimmed, GIF_LIMIT);
    if (cached) {
      applyResults(cached, trimmed, true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setFromCache(false);

    try {
      const params = new URLSearchParams({ limit: String(GIF_LIMIT) });
      if (trimmed) params.set("q", trimmed);
      const res = await fetch(`/api/gifs/search?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as { results?: GifItem[]; cached?: boolean };
      const list = data.results?.filter((g) => g.url) ?? [];
      setClientGifCache(trimmed, GIF_LIMIT, list);
      applyResults(list, trimmed, !!data.cached);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setGifs([]);
      setError("Could not load GIFs — check connection");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [applyResults]);

  useEffect(() => {
    if (!open) return;
    const delay = query.trim() ? DEBOUNCE_MS : 0;
    const t = setTimeout(() => loadGifs(query), delay);
    return () => clearTimeout(t);
  }, [open, query, loadGifs]);

  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  if (disabled) return <>{children}</>;

  const trimmed = query.trim();
  const waitingForChars = trimmed.length > 0 && trimmed.length < MIN_SEARCH_LEN;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {open && (
        <div className="rounded-xl bg-[#141414] border border-[#FFD700]/25 p-2.5 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search GIFs — cricket, sold, party, lol…"
              className="flex-1 pro-input text-xs py-2.5 border-[#FFD700]/30 focus:border-[#FFD700]/60"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="shrink-0 px-2 py-2 rounded-lg text-[10px] text-gray-400 hover:text-white border border-[#2A2A2A]"
              aria-label="Close GIF picker"
            >
              ✕
            </button>
          </div>

          {waitingForChars && !gifs.length && (
            <p className="text-[10px] text-gray-500 text-center py-2">
              Type {MIN_SEARCH_LEN}+ letters to search…
            </p>
          )}

          {loading && (
            <p className="text-[10px] text-[#FFD700]/80 text-center py-3 animate-pulse">
              Loading from Giphy…
            </p>
          )}

          {!loading && error && !waitingForChars && (
            <p className="text-[10px] text-red-400/90 text-center py-3">{error}</p>
          )}

          {!loading && gifs.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto scrollbar-hide pr-0.5">
              {gifs.map((g) => (
                <GifThumb
                  key={g.id + g.url}
                  item={g}
                  onPick={() => {
                    onPick(g.url);
                    setOpen(false);
                    setQuery("");
                  }}
                />
              ))}
            </div>
          )}

          <p className="text-[9px] text-gray-500 mt-2 text-center">
            {fromCache ? "Cached · " : ""}
            {trimmed ? "Giphy search · tap a GIF to send" : "Trending + cricket · tap to send"}
          </p>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`shrink-0 px-2.5 py-2 rounded-xl border text-[10px] font-bold transition-colors ${
            open
              ? "border-[#FFD700]/60 text-[#FFD700] bg-[#FFD700]/10"
              : "border-[#2A2A2A] text-gray-300 hover:border-[#FFD700]/40"
          }`}
        >
          {open ? "GIF ▲" : "GIF"}
        </button>
        {children}
      </div>
    </div>
  );
}

export function isGifMessage(text: string): boolean {
  const t = text.trim();
  if (t.startsWith("gif:")) return true;
  if (/\.gif(\?|$)/i.test(t)) return true;
  if (/giphy\.com|media\.giphy\.com|tenor\.com|media\.tenor\.com|i\.giphy\.com/i.test(t)) return true;
  return false;
}

export function gifUrlFromMessage(text: string): string | null {
  const t = text.trim();
  if (t.startsWith("gif:")) return t.slice(4).trim();
  if (/^https?:\/\/.+/i.test(t) && isGifMessage(t)) return t;
  return null;
}
