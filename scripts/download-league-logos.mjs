#!/usr/bin/env node
/**
 * Download official logos for WPL and The Hundred teams.
 * Usage: node scripts/download-league-logos.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

const LOGOS = {
  wpl: {
    WMI: ["https://upload.wikimedia.org/wikipedia/en/c/cf/Mumbai_Indians_Logo.svg"],
    WRCB: ["https://upload.wikimedia.org/wikipedia/en/2/2a/Royal_Challengers_Bengaluru_Logo.svg"],
    WDC: ["https://upload.wikimedia.org/wikipedia/en/2/2f/Delhi_Capitals_Logo.svg"],
    GG: ["https://upload.wikimedia.org/wikipedia/en/1/1f/Gujarat_Giants_logo.svg"],
    UPW: ["https://upload.wikimedia.org/wikipedia/en/8/8a/UP_Warriorz_Logo.svg"],
  },
  hundred: {
    BPH: ["https://upload.wikimedia.org/wikipedia/en/5/5c/Birmingham_Phoenix_logo.svg"],
    LNS: ["https://upload.wikimedia.org/wikipedia/en/5/5e/London_Spirit_logo.svg"],
    MNR: ["https://upload.wikimedia.org/wikipedia/en/e/e4/Manchester_Originals_logo.svg"],
    NOS: ["https://upload.wikimedia.org/wikipedia/en/3/3a/Northern_Superchargers_logo.svg"],
    OVI: ["https://upload.wikimedia.org/wikipedia/en/5/5f/Oval_Invincibles_logo.svg"],
    SOB: ["https://upload.wikimedia.org/wikipedia/en/c/c5/Southern_Brave_logo.svg"],
    TRT: ["https://upload.wikimedia.org/wikipedia/en/4/4c/Trent_Rockets_logo.svg"],
    WEF: ["https://upload.wikimedia.org/wikipedia/en/9/9e/Welsh_Fire_logo.svg"],
  },
};

function fallbackSvg(id, primary, secondary, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="${primary}" stroke="${secondary}" stroke-width="3"/>
  <text x="50" y="58" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="22" fill="${secondary}">${label}</text>
</svg>`;
}

const FALLBACK = {
  wpl: { WMI: ["#004BA0", "#D1AB3E", "MI"], WRCB: ["#EC1C24", "#2B2A29", "RCB"], WDC: ["#004C93", "#EF1B23", "DC"], GG: ["#1B458F", "#E87722", "GG"], UPW: ["#00843D", "#FDB913", "UPW"] },
  hundred: { BPH: ["#E40046", "#000", "BPH"], LNS: ["#00843D", "#FFF", "LNS"], MNR: ["#1D428A", "#C8102E", "MNR"], NOS: ["#0085CA", "#7AC143", "NOS"], OVI: ["#000", "#E40046", "OVI"], SOB: ["#C8102E", "#000", "SOB"], TRT: ["#00843D", "#FFF", "TRT"], WEF: ["#E40046", "#FFD100", "WEF"] },
};

async function download(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > 200 ? buf : null;
}

async function main() {
  const outRoot = join(__dir, "..", "public", "logos");
  for (const [league, teams] of Object.entries(LOGOS)) {
    const dir = join(outRoot, league);
    mkdirSync(dir, { recursive: true });
    const manifest = {};
    for (const [id, urls] of Object.entries(teams)) {
      let saved = false;
      for (const url of urls) {
        try {
          const buf = await download(url);
          if (buf) {
            writeFileSync(join(dir, `${id}.svg`), buf);
            console.log(`✓ ${league}/${id}.svg`);
            manifest[id] = `/logos/${league}/${id}.svg`;
            saved = true;
            break;
          }
        } catch (e) { console.log(`  fail ${id}: ${e.message}`); }
      }
      if (!saved) {
        const [p, s, l] = FALLBACK[league][id];
        writeFileSync(join(dir, `${id}.svg`), fallbackSvg(id, p, s, l));
        manifest[id] = `/logos/${league}/${id}.svg`;
        console.log(`~ ${league}/${id}.svg (fallback)`);
      }
    }
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  }
  console.log("\nDone.");
}

main().catch(console.error);
