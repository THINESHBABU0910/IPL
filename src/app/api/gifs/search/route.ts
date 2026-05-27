import { NextRequest, NextResponse } from "next/server";
import { GIF_CATALOG, searchGifCatalog, type GifItem } from "@/lib/gifCatalog";
import { withGiphyKey } from "@/lib/giphyKeys";
import {
  gifCacheKey,
  gifCacheTtl,
  getServerGifCache,
  setServerGifCache,
} from "@/lib/gifSearchCache";

export const dynamic = "force-dynamic";

type GiphyImageSet = {
  fixed_height?: { url?: string };
  fixed_height_small?: { url?: string };
  fixed_width_still?: { url?: string };
  downsized?: { url?: string };
  downsized_medium?: { url?: string };
  downsized_small?: { url?: string };
  preview_gif?: { url?: string };
};

function mapGiphyResults(
  items: Array<{ id: string; images?: GiphyImageSet }>,
  tag: string,
): GifItem[] {
  const out: GifItem[] = [];
  for (const g of items) {
    const url =
      g.images?.downsized?.url ||
      g.images?.downsized_medium?.url ||
      g.images?.fixed_height?.url;
    const preview =
      g.images?.fixed_width_still?.url ||
      g.images?.fixed_height_small?.url ||
      g.images?.downsized_small?.url ||
      g.images?.preview_gif?.url ||
      url;
    if (!url) continue;
    out.push({
      id: `giphy-${g.id}`,
      url,
      preview: preview || url,
      tags: [tag],
    });
  }
  return out;
}

async function searchTenor(q: string, limit: number): Promise<GifItem[]> {
  const key = process.env.TENOR_API_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    key,
    q,
    limit: String(limit),
    media_filter: "gif,tinygif",
    contentfilter: "medium",
  });
  const res = await fetch(`https://tenor.googleapis.com/v2/search?${params}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: Array<{
      id: string;
      media_formats?: {
        gif?: { url?: string };
        tinygif?: { url?: string };
      };
    }>;
  };

  const out: GifItem[] = [];
  for (const r of data.results ?? []) {
    const gif = r.media_formats?.gif?.url || r.media_formats?.tinygif?.url;
    const preview = r.media_formats?.tinygif?.url || gif;
    if (!gif) continue;
    out.push({
      id: `tenor-${r.id}`,
      url: gif,
      preview: preview || gif,
      tags: [q],
    });
  }
  return out;
}

async function searchGiphy(q: string, limit: number): Promise<GifItem[]> {
  return (
    (await withGiphyKey(async (apiKey) => {
      const params = new URLSearchParams({
        api_key: apiKey,
        q,
        limit: String(limit),
        rating: "pg",
      });
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`, {
        next: { revalidate: 3600 },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { data?: Array<{ id: string; images?: GiphyImageSet }> };
      const mapped = mapGiphyResults(data.data ?? [], q);
      return mapped.length ? mapped : null;
    })) ?? []
  );
}

async function fetchGiphyTrending(limit: number): Promise<GifItem[]> {
  return (
    (await withGiphyKey(async (apiKey) => {
      const params = new URLSearchParams({
        api_key: apiKey,
        limit: String(limit),
        rating: "pg",
      });
      const res = await fetch(`https://api.giphy.com/v1/gifs/trending?${params}`, {
        next: { revalidate: 1800 },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { data?: Array<{ id: string; images?: GiphyImageSet }> };
      const mapped = mapGiphyResults(data.data ?? [], "trending");
      return mapped.length ? mapped : null;
    })) ?? []
  );
}

function dedupeGifs(items: GifItem[]): GifItem[] {
  const seen = new Set<string>();
  const out: GifItem[] = [];
  for (const item of items) {
    const key = item.id || item.url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchGifResults(q: string, limit: number): Promise<GifItem[]> {
  let results: GifItem[] = [];

  if (!q.length) {
    const half = Math.ceil(limit / 2);
    const [trending, cricket] = await Promise.all([
      fetchGiphyTrending(half),
      searchGiphy("cricket celebration", half),
    ]);
    results = dedupeGifs([...trending, ...cricket]);
  } else if (q.length >= 3) {
    const [giphy, tenor] = await Promise.all([
      searchGiphy(q, limit),
      searchTenor(q, limit),
    ]);
    results = dedupeGifs([...giphy, ...tenor]);
  }

  if (results.length < limit) {
    const local = searchGifCatalog(q || "cricket", limit);
    results = dedupeGifs([...results, ...local]);
  }

  if (!results.length) {
    results = GIF_CATALOG.slice(0, limit);
  }

  return results.slice(0, limit);
}

function cacheControlMaxAge(q: string): number {
  if (!q.trim()) return 1800;
  return 3600;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const limit = Math.min(50, Math.max(8, Number(req.nextUrl.searchParams.get("limit")) || 32));
  const cacheKey = gifCacheKey(q, limit);

  const cached = getServerGifCache(cacheKey);
  if (cached) {
    return NextResponse.json(
      { results: cached, source: "cache", cached: true },
      {
        headers: {
          "Cache-Control": `public, max-age=${cacheControlMaxAge(q)}, s-maxage=3600, stale-while-revalidate=86400`,
          "X-Gif-Cache": "HIT",
        },
      },
    );
  }

  const results = await fetchGifResults(q, limit);
  const ttl = gifCacheTtl(q, results.length > 0);
  setServerGifCache(cacheKey, results, ttl);

  return NextResponse.json(
    {
      results,
      source: results.some((r) => r.id.startsWith("giphy-")) ? "giphy" : "fallback",
      cached: false,
    },
    {
      headers: {
        "Cache-Control": `public, max-age=${cacheControlMaxAge(q)}, s-maxage=3600, stale-while-revalidate=86400`,
        "X-Gif-Cache": "MISS",
      },
    },
  );
}
