#!/usr/bin/env node
/**
 * Download IPL team logos — Wikimedia + CCBP CDN fallbacks.
 * Usage: npm run download-logos
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "..", "public", "logos");
mkdirSync(OUT, { recursive: true });

/** Primary: CCBP CDN (reliable PNGs). Fallback: Wikimedia SVG. */
const TEAMS = {
  CSK: [
    "https://assets.ccbp.in/frontend/react-js/csk-logo-img.png",
    "https://upload.wikimedia.org/wikipedia/en/2/2b/Chennai_Super_Kings_Logo.svg",
  ],
  MI: [
    "https://assets.ccbp.in/frontend/react-js/mi-logo-img.png",
    "https://upload.wikimedia.org/wikipedia/en/c/cf/Mumbai_Indians_Logo.svg",
  ],
  RCB: [
    "https://assets.ccbp.in/frontend/react-js/rcb-logo-img.png",
    "https://upload.wikimedia.org/wikipedia/en/2/2a/Royal_Challengers_Bengaluru_Logo.svg",
  ],
  DC: [
    "https://assets.ccbp.in/frontend/react-js/dc-logo-img.png",
    "https://documents.iplt20.com/ipl/DC/Logos/LogoOutline/DCoutline.png",
  ],
  KKR: [
    "https://assets.ccbp.in/frontend/react-js/kkr-logo-img.png",
    "https://upload.wikimedia.org/wikipedia/en/4/4c/Kolkata_Knight_Riders_Logo.svg",
  ],
  SRH: [
    "https://assets.ccbp.in/frontend/react-js/srh-logo-img.png",
    "https://upload.wikimedia.org/wikipedia/en/8/81/Sunrisers_Hyderabad_Logo.svg",
  ],
  PBKS: [
    "https://upload.wikimedia.org/wikipedia/en/d/d4/Punjab_Kings_Logo.svg",
  ],
  RR: [
    "https://assets.ccbp.in/frontend/react-js/rr-logo-img.png",
    "https://upload.wikimedia.org/wikipedia/en/6/60/Rajasthan_Royals_Logo.svg",
  ],
  GT: [
    "https://upload.wikimedia.org/wikipedia/en/0/09/Gujarat_Titans_Logo.svg",
  ],
  LSG: [
    "https://upload.wikimedia.org/wikipedia/en/a/a9/Lucknow_Super_Giants_Logo.svg",
  ],
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

function extFrom(url, ct) {
  if (url.includes(".png") || ct?.includes("png")) return "png";
  if (url.includes(".jpg") || ct?.includes("jpeg")) return "jpg";
  return "svg";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function downloadOne(teamId, urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!res.ok) { console.log(`  skip ${url} → ${res.status}`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) { console.log(`  skip ${url} → too small`); continue; }
      const ext = extFrom(url, res.headers.get("content-type"));
      writeFileSync(join(OUT, `${teamId}.${ext}`), buf);
      console.log(`✓ ${teamId}.${ext} (${buf.length} bytes)`);
      return ext;
    } catch (e) { console.log(`  fail ${url}: ${e.message}`); }
    await sleep(1500);
  }
  return null;
}

async function main() {
  const manifest = {};
  for (const [id, urls] of Object.entries(TEAMS)) {
    console.log(`\n${id}...`);
    const ext = await downloadOne(id, urls);
    manifest[id] = ext ? `/logos/${id}.${ext}` : `/logos/${id}.svg`;
    await sleep(1000);
  }
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("\nDone. manifest.json updated.");
}

main().catch(console.error);
