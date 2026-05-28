#!/usr/bin/env node
/**
 * Download franchise logos via IPL CDN, Wikipedia API, and branded SVG fallbacks.
 * Usage: npm run download-all-logos
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, "..", "public", "logos");
const WIKI_UA = "IPLAuctionBot/1.0 (local dev; contact: dev@localhost) Node.js";
const FETCH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const IPL = {
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
    "https://upload.wikimedia.org/wikipedia/en/2/2f/Delhi_Capitals_Logo.svg",
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
    "https://upload.wikimedia.org/wikipedia/en/6/6d/Kings_XI_Punjab_Logo.svg",
  ],
  RR: [
    "https://assets.ccbp.in/frontend/react-js/rr-logo-img.png",
    "https://upload.wikimedia.org/wikipedia/en/6/60/Rajasthan_Royals_Logo.svg",
  ],
  GT: ["https://upload.wikimedia.org/wikipedia/en/0/09/Gujarat_Titans_Logo.svg"],
  LSG: ["https://upload.wikimedia.org/wikipedia/en/a/a9/Lucknow_Super_Giants_Logo.svg"],
};

/** Wikipedia File: page names (lowercase logo.svg pattern works for most BBL/Hundred) */
const WIKI_FILE = {
  hundred: {
    BPH: "Birmingham_Phoenix_logo.svg",
    LNS: "London_Spirit_logo.svg",
    MNR: "Manchester_Originals_logo.svg",
    NOS: "Northern_Superchargers_logo.svg",
    OVI: "Oval_Invincibles_logo.svg",
    SOB: "Southern_Brave_logo.svg",
    TRT: "Trent_Rockets_logo.svg",
    WEF: "Welsh_Fire_logo.svg",
  },
  bbl: {
    BH: "Brisbane_Heat_logo.svg",
    HH: "Hobart_Hurricanes_logo.svg",
    MS: "Melbourne_Stars_logo.svg",
    PS: "Perth_Scorchers_logo.svg",
    SS: "Sydney_Sixers_logo.svg",
    AS: "Adelaide_Strikers_logo.svg",
    MR: "Melbourne_Renegades_logo.svg",
    ST: "Sydney_Thunder_logo.svg",
  },
  sa20: {
    DSG: "Durban_Super_Giants_logo.svg",
    PC: "Pretoria_Capitals_logo.svg",
    PR: "Paarl_Royals_logo.svg",
    SEC: "Sunrisers_Eastern_Cape_logo.svg",
    MICT: "MI_Cape_Town_logo.svg",
    JSK: "Joburg_Super_Kings_logo.svg",
  },
};

/** Brand colors for SVG fallbacks [primary, secondary, label] */
const BRAND = {
  hundred: {
    BPH: ["#E40046", "#000", "BPH"],
    LNS: ["#00843D", "#FFF", "LNS"],
    MNR: ["#1D428A", "#C8102E", "MNR"],
    NOS: ["#0085CA", "#7AC143", "NOS"],
    OVI: ["#000", "#E40046", "OVI"],
    SOB: ["#C8102E", "#000", "SOB"],
    TRT: ["#00843D", "#FFF", "TRT"],
    WEF: ["#E40046", "#FFD100", "WEF"],
    EDI: ["#003366", "#C4A000", "EDI"],
    BRI: ["#003087", "#E40046", "BRI"],
  },
  sa20: {
    JSK: ["#FDB913", "#004B87", "JSK"],
    SEC: ["#FF6600", "#1A1A1A", "SEC"],
    MICT: ["#004BA0", "#FFD700", "MICT"],
    DSG: ["#0066CC", "#FFF", "DSG"],
    PR: ["#E40046", "#000", "PR"],
    PC: ["#00A3E0", "#1A1A1A", "PC"],
    LIO: ["#C8102E", "#FFD100", "LIO"],
    TIT: ["#00843D", "#FFF", "TIT"],
    WAR: ["#582C83", "#00AEEF", "WAR"],
    KNI: ["#E40046", "#1A1A1A", "KNI"],
  },
  bbl: {
    BH: ["#00AEEF", "#F7941D", "BH"],
    HH: ["#582C83", "#00B5E2", "HH"],
    MS: ["#00B5E2", "#1A1A1A", "MS"],
    PS: ["#FF6600", "#1A1A1A", "PS"],
    SS: ["#E40046", "#1A1A1A", "SS"],
    AS: ["#0085CA", "#1A1A1A", "AS"],
    MR: ["#E40046", "#1A1A1A", "MR"],
    ST: ["#8DC63F", "#582C83", "ST"],
    GC: ["#FFD100", "#00843D", "GC"],
    TS: ["#00843D", "#FFD100", "TS"],
  },
  wbbl: {
    BH: ["#00AEEF", "#F7941D", "BH"],
    HH: ["#582C83", "#00B5E2", "HH"],
    MS: ["#00B5E2", "#1A1A1A", "MS"],
    PS: ["#FF6600", "#1A1A1A", "PS"],
    SS: ["#E40046", "#1A1A1A", "SS"],
    AS: ["#0085CA", "#1A1A1A", "AS"],
    MR: ["#E40046", "#1A1A1A", "MR"],
    ST: ["#8DC63F", "#582C83", "ST"],
    GC: ["#FFD100", "#00843D", "GC"],
    TS: ["#00843D", "#FFD100", "TS"],
  },
};

const SA20_IPL_COPY = { JSK: "CSK", MICT: "MI", SEC: "SRH", PR: "RR", DSG: "DC", PC: "GT" };

function extFrom(url, ct) {
  if (url.includes(".png") || ct?.includes("png")) return "png";
  if (url.includes(".jpg") || url.includes(".jpeg") || ct?.includes("jpeg")) return "jpg";
  return "svg";
}

function brandedSvg(id, primary, secondary, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${primary}"/><stop offset="100%" stop-color="${secondary}"/></linearGradient></defs>
  <circle cx="50" cy="50" r="47" fill="url(#g)" stroke="${secondary}" stroke-width="2"/>
  <text x="50" y="56" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="${label.length > 3 ? 14 : 18}" fill="#fff">${label}</text>
</svg>`;
}

const normWikiKey = (s) => s.replace(/^File:/i, "").replace(/ /g, "_").trim();

async function wikiResolve(fileTitles) {
  const out = new Map();
  const chunks = [];
  const titles = [...fileTitles];
  for (let i = 0; i < titles.length; i += 40) chunks.push(titles.slice(i, i + 40));

  for (const chunk of chunks) {
    const param = chunk.map((t) => `File:${t.replace(/ /g, "_")}`).join("|");
    const api = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(param).replace(/%7C/g, "|")}&prop=imageinfo&iiprop=url&format=json`;
    await sleep(1500);
    try {
      const res = await fetch(api, { headers: { "User-Agent": WIKI_UA } });
      const text = await res.text();
      if (!text.startsWith("{")) {
        console.warn("  Wiki API rate limit — waiting 8s...");
        await sleep(8000);
        continue;
      }
      const json = JSON.parse(text);
      for (const page of Object.values(json.query?.pages || {})) {
        if (page.missing || !page.title) continue;
        const url = page.imageinfo?.[0]?.url;
        if (url) out.set(normWikiKey(page.title), url);
      }
    } catch (e) {
      console.warn("  Wiki batch error:", e.message);
    }
  }
  return out;
}

async function fetchBinary(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": FETCH_UA, Accept: "image/*,*/*" },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2500) return null;
  const head = buf.slice(0, 200).toString("utf8");
  if (head.includes("<!DOCTYPE") || head.includes("<html")) return null;
  return { buf, ext: extFrom(url, res.headers.get("content-type")) };
}

async function downloadDirect(urls, outBase) {
  for (const url of urls) {
    try {
      const got = await fetchBinary(url);
      if (!got) continue;
      const finalPath = `${outBase}.${got.ext}`;
      fs.writeFileSync(finalPath, got.buf);
      return { path: finalPath, bytes: got.buf.length };
    } catch {
      /* next */
    }
    await sleep(500);
  }
  return null;
}

function writeBranded(dir, id, brand) {
  const [p, s, l] = brand;
  const file = path.join(dir, `${id}.svg`);
  fs.writeFileSync(file, brandedSvg(id, p, s, l));
  return { path: file, bytes: 0, branded: true };
}

async function downloadIpl() {
  fs.mkdirSync(ROOT, { recursive: true });
  const manifest = {};
  for (const [id, urls] of Object.entries(IPL)) {
    console.log(`IPL ${id}...`);
    let res = await downloadDirect(urls, path.join(ROOT, id));
    if (!res) res = writeBranded(ROOT, id, ["#333", "#fff", id]);
    manifest[id] = `/logos/${path.basename(res.path)}`;
    console.log(res.branded ? `  ~ ${path.basename(res.path)} (branded)` : `  ✓ ${path.basename(res.path)} (${res.bytes}b)`);
    await sleep(400);
  }
  fs.writeFileSync(path.join(ROOT, "manifest.json"), JSON.stringify(manifest, null, 2));
}

async function downloadLeague(leagueKey, teamIds, wikiMap, brands) {
  const dir = path.join(ROOT, leagueKey);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = {};

  const fileNames = teamIds
    .map((id) => wikiMap[id])
    .filter(Boolean);
  const wikiUrls = await wikiResolve(fileNames);

  for (const id of teamIds) {
    console.log(`${leagueKey}/${id}...`);
    let res = null;

    for (const ext of ["svg", "png", "jpg"]) {
      const existing = path.join(dir, `${id}.${ext}`);
      if (fs.existsSync(existing) && fs.statSync(existing).size > 4000) {
        res = { path: existing, bytes: fs.statSync(existing).size, cached: true };
        break;
      }
    }

    const wikiFile = wikiMap[id];
    const wikiUrl = wikiFile ? wikiUrls.get(normWikiKey(wikiFile)) : null;
    if (!res && wikiUrl) {
      const got = await fetchBinary(wikiUrl);
      if (got) {
        const finalPath = path.join(dir, `${id}.${got.ext}`);
        fs.writeFileSync(finalPath, got.buf);
        res = { path: finalPath, bytes: got.buf.length, wiki: true };
      }
    }

    if (!res && brands[id]) {
      res = writeBranded(dir, id, brands[id]);
    }

    if (res) {
      manifest[id] = `/logos/${leagueKey}/${path.basename(res.path)}`;
      const tag = res.branded ? "branded" : res.cached ? "cached" : res.wiki ? `wiki ${res.bytes}b` : `${res.bytes}b`;
      console.log(`  ✓ ${path.basename(res.path)} (${tag})`);
    } else {
      console.log(`  ✗ ${id}`);
    }
    await sleep(300);
  }

  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

function copyIplAsset(iplId, destDir, destId) {
  for (const ext of ["png", "svg", "jpg"]) {
    const src = path.join(ROOT, `${iplId}.${ext}`);
    if (fs.existsSync(src)) {
      const dest = path.join(destDir, `${destId}.${ext}`);
      fs.copyFileSync(src, dest);
      return `/logos/${path.basename(destDir)}/${destId}.${ext}`;
    }
  }
  return null;
}

function copyIplLogosToWpl() {
  const wplDir = path.join(ROOT, "wpl");
  fs.mkdirSync(wplDir, { recursive: true });
  const manifest = {};
  for (const id of Object.keys(IPL)) {
    const copied = copyIplAsset(id, wplDir, id);
    if (copied) manifest[id] = copied;
  }
  fs.writeFileSync(path.join(wplDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("\nWPL: copied 10 IPL logos");
}

function enrichSa20FromIpl(manifest) {
  const dir = path.join(ROOT, "sa20");
  for (const [saId, iplId] of Object.entries(SA20_IPL_COPY)) {
    const url = copyIplAsset(iplId, dir, saId);
    if (url) {
      manifest[saId] = url;
      console.log(`SA20 ${saId} ← IPL ${iplId}`);
    }
  }
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

const BBL_TO_WBBL = {
  BH: "BH-W", HH: "HH-W", MS: "MS-W", PS: "PS-W", SS: "SS-W",
  AS: "AS-W", MR: "MR-W", ST: "ST-W", GC: "GC-W", TS: "TS-W",
};

function copyBblToWbbl() {
  const bblDir = path.join(ROOT, "bbl");
  const wbblDir = path.join(ROOT, "wbbl");
  fs.mkdirSync(wbblDir, { recursive: true });
  const wbblManifest = {};

  for (const [bblId, wbblId] of Object.entries(BBL_TO_WBBL)) {
    let copied = false;
    for (const ext of ["svg", "png", "jpg"]) {
      const src = path.join(bblDir, `${bblId}.${ext}`);
      if (fs.existsSync(src) && fs.statSync(src).size > 1500) {
        fs.copyFileSync(src, path.join(wbblDir, `${wbblId}.${ext}`));
        wbblManifest[wbblId] = `/logos/wbbl/${wbblId}.${ext}`;
        copied = true;
        break;
      }
    }
    if (!copied && BRAND.wbbl[bblId]) {
      writeBranded(wbblDir, wbblId, BRAND.wbbl[bblId]);
      wbblManifest[wbblId] = `/logos/wbbl/${wbblId}.svg`;
    }
  }

  fs.writeFileSync(path.join(wbblDir, "manifest.json"), JSON.stringify(wbblManifest, null, 2));
  console.log("WBBL: synced from BBL");
}

async function main() {
  console.log("=== IPL logos ===\n");
  await downloadIpl();

  console.log("\n=== League logos (Wikipedia API + fallbacks) ===\n");
  const hundredIds = Object.keys(BRAND.hundred);
  await downloadLeague("hundred", hundredIds, WIKI_FILE.hundred, BRAND.hundred);

  const sa20Ids = Object.keys(BRAND.sa20);
  const sa20Manifest = await downloadLeague("sa20", sa20Ids, WIKI_FILE.sa20, BRAND.sa20);
  enrichSa20FromIpl(sa20Manifest);

  const bblIds = Object.keys(BRAND.bbl);
  await downloadLeague("bbl", bblIds, WIKI_FILE.bbl, BRAND.bbl);

  copyBblToWbbl();
  copyIplLogosToWpl();

  console.log("\nDone — every team has a logo file under public/logos/");
}

main().catch(console.error);
