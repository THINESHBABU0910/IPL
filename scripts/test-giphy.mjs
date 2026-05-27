#!/usr/bin/env node
/** Quick Giphy round-robin smoke test — run: node scripts/test-giphy.mjs */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
try {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  console.error("No .env found");
  process.exit(1);
}

const keys = [process.env.GIPHY_API_KEY_A, process.env.GIPHY_API_KEY_B].filter(Boolean);
if (!keys.length) {
  console.error("Missing GIPHY_API_KEY_A / GIPHY_API_KEY_B in .env");
  process.exit(1);
}

async function testKey(label, key, q) {
  const params = new URLSearchParams({ api_key: key, q, limit: "5", rating: "pg" });
  const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params}`);
  const data = await res.json();
  const count = data.data?.length ?? 0;
  console.log(`${label}: HTTP ${res.status} · ${count} GIFs for "${q}"`);
  if (count > 0) {
    const url = data.data[0].images?.downsized?.url || data.data[0].images?.fixed_height?.url;
    console.log(`  sample: ${url?.slice(0, 70)}…`);
  }
  return res.ok && count > 0;
}

let ok = 0;
for (let i = 0; i < keys.length; i++) {
  if (await testKey(`Key ${String.fromCharCode(65 + i)}`, keys[i], "cricket")) ok++;
}
if (await testKey("Trending (Key A)", keys[0], "")) ok++;
else {
  const params = new URLSearchParams({ api_key: keys[0], limit: "5", rating: "pg" });
  const res = await fetch(`https://api.giphy.com/v1/gifs/trending?${params}`);
  const data = await res.json();
  console.log(`Trending: HTTP ${res.status} · ${data.data?.length ?? 0} GIFs`);
  if (res.ok && data.data?.length) ok++;
}

console.log(ok >= 2 ? "\n✓ Giphy keys working" : "\n✗ Giphy test failed");
process.exit(ok >= 2 ? 0 : 1);
