import type { GifItem } from "./gifCatalog";

const MAX_ENTRIES = 120;

/** TTL in ms */
export const GIF_CACHE_TTL = {
  trending: 30 * 60 * 1000,
  search: 60 * 60 * 1000,
  empty: 5 * 60 * 1000,
} as const;

export function gifCacheKey(q: string, limit: number): string {
  return `${q.trim().toLowerCase()}|${limit}`;
}

export function gifCacheTtl(q: string, hasResults: boolean): number {
  if (!hasResults) return GIF_CACHE_TTL.empty;
  if (!q.trim()) return GIF_CACHE_TTL.trending;
  return GIF_CACHE_TTL.search;
}

interface CacheEntry {
  results: GifItem[];
  expiresAt: number;
}

const serverCache = new Map<string, CacheEntry>();

function evictOldestIfNeeded(): void {
  if (serverCache.size <= MAX_ENTRIES) return;
  const first = serverCache.keys().next().value;
  if (first) serverCache.delete(first);
}

export function getServerGifCache(key: string): GifItem[] | null {
  const entry = serverCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    serverCache.delete(key);
    return null;
  }
  return entry.results;
}

export function setServerGifCache(key: string, results: GifItem[], ttlMs: number): void {
  evictOldestIfNeeded();
  serverCache.set(key, {
    results,
    expiresAt: Date.now() + ttlMs,
  });
}

export function serverGifCacheStats(): { size: number; keys: string[] } {
  return { size: serverCache.size, keys: [...serverCache.keys()] };
}
