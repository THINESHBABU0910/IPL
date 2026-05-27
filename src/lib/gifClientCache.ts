import type { GifItem } from "./gifCatalog";
import { gifCacheKey, gifCacheTtl } from "./gifSearchCache";

const STORAGE_KEY = "ipl-gif-cache-v1";
const MAX_ENTRIES = 80;

interface CacheEntry {
  results: GifItem[];
  expiresAt: number;
}

const memory = new Map<string, CacheEntry>();

function loadFromSession(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry.expiresAt > now) memory.set(key, entry);
    }
  } catch {
    /* ignore corrupt storage */
  }
}

function persistToSession(): void {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, CacheEntry> = {};
    for (const [key, entry] of memory.entries()) {
      if (entry.expiresAt > Date.now()) obj[key] = entry;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* quota exceeded — memory cache still works */
  }
}

function evictOldestIfNeeded(): void {
  if (memory.size <= MAX_ENTRIES) return;
  const first = memory.keys().next().value;
  if (first) memory.delete(first);
}

let sessionLoaded = false;

function ensureLoaded(): void {
  if (!sessionLoaded) {
    sessionLoaded = true;
    loadFromSession();
  }
}

export function getClientGifCache(q: string, limit: number): GifItem[] | null {
  ensureLoaded();
  const key = gifCacheKey(q, limit);
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    persistToSession();
    return null;
  }
  return entry.results;
}

export function setClientGifCache(q: string, limit: number, results: GifItem[]): void {
  ensureLoaded();
  const key = gifCacheKey(q, limit);
  evictOldestIfNeeded();
  memory.set(key, {
    results,
    expiresAt: Date.now() + gifCacheTtl(q, results.length > 0),
  });
  persistToSession();
}

/** Reuse results from a cached longer query that shares the same prefix. */
export function getClientPrefixCache(q: string, limit: number): GifItem[] | null {
  const trimmed = q.trim().toLowerCase();
  if (trimmed.length < 2) return null;
  ensureLoaded();
  const now = Date.now();
  for (const [key, entry] of memory.entries()) {
    if (entry.expiresAt <= now) continue;
    const [cachedQ] = key.split("|");
    if (cachedQ.startsWith(trimmed) && cachedQ.length > trimmed.length) {
      return entry.results;
    }
  }
  return null;
}
