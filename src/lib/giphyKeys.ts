/** Round-robin across GIPHY_API_KEY_A / B (100 req/hr each) with legacy GIPHY_API_KEY fallback. */

let roundRobinIndex = 0;

export function getGiphyApiKeys(): string[] {
  return [
    process.env.GIPHY_API_KEY_A,
    process.env.GIPHY_API_KEY_B,
    process.env.GIPHY_API_KEY,
  ].filter((k): k is string => !!k && k.trim().length > 0);
}

export function getNextGiphyApiKey(): string | undefined {
  const keys = getGiphyApiKeys();
  if (!keys.length) return undefined;
  const key = keys[roundRobinIndex % keys.length];
  roundRobinIndex += 1;
  return key;
}

/** Try each key in round-robin order until one succeeds. */
export async function withGiphyKey<T>(
  fn: (apiKey: string) => Promise<T | null>,
): Promise<T | null> {
  const keys = getGiphyApiKeys();
  if (!keys.length) return null;

  const start = roundRobinIndex % keys.length;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(start + i) % keys.length];
    roundRobinIndex += 1;
    try {
      const result = await fn(key);
      if (result !== null) return result;
    } catch {
      /* try next key */
    }
  }
  return null;
}
