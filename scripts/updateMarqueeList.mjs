/**
 * Updates Marquee (BA1) to top 35 IPL mega-auction tier players.
 * Based on IPL 2025 official marquee + elite 2 Cr / top-sold talent across roles.
 *
 * Run: node scripts/updateMarqueeList.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "../src/data/players.json");

/** Top 35 — batting, bowling, AR, WK (IPL mega auction tier) */
export const MARQUEE_PLAYER_IDS = [
  // Official IPL 2025 marquee (12)
  "P468", // Shreyas Iyer
  "P521", // Rishabh Pant
  "P476", // Arshdeep Singh
  "P505", // Jos Buttler
  "P511", // Kagiso Rabada
  "P434", // Mitchell Starc
  "P423", // KL Rahul
  "P475", // Yuzvendra Chahal
  "P538", // Mohammed Shami
  "P512", // Mohammed Siraj
  "P011", // Liam Livingstone
  "P005", // David Miller
  // Elite batters & stars
  "P406", // Virat Kohli
  "P386", // Rohit Sharma
  "P501", // Shubman Gill
  "P389", // Suryakumar Yadav
  "P001", // Devon Conway
  "P003", // Cameron Green
  "P077", // Steve Smith
  "P370", // Ruturaj Gaikwad
  "P453", // Travis Head
  // All-rounders
  "P388", // Hardik Pandya
  "P499", // Ravindra Jadeja
  "P010", // Venkatesh Iyer
  "P013", // Rachin Ravindra
  "P008", // Wanindu Hasaranga
  "P454", // Abhishek Sharma
  "P500", // Sam Curran
  "P528", // Mitchell Marsh
  // Bowlers
  "P387", // Jasprit Bumrah
  "P029", // Matheesha Pathirana
  "P030", // Ravi Bishnoi
  "P473", // Marco Jansen
  // Wicketkeepers
  "P409", // Phil Salt
  "P457", // Heinrich Klaasen
];

const MARQUEE_SET = "BA1";
const MARQUEE_CATEGORY = "Marquee Players";
const MARQUEE_BASE_PRICE = 20_000_000; // ₹2 Cr — mega auction top bracket

const ROLE_FALLBACK_SET = {
  BATTER: "BA2",
  "ALL-ROUNDER": "AL1",
  WICKETKEEPER: "WK1",
  BOWLER: "FA1",
};

const ROLE_CATEGORY = {
  BATTER: "Batters",
  "ALL-ROUNDER": "All-Rounders",
  WICKETKEEPER: "Wicket-Keepers",
  BOWLER: "Fast Bowlers",
};

function isSpinner(p) {
  const style = (p.bowlingStyle || "").toLowerCase();
  return style.includes("spin") || style.includes("leg") || style.includes("off") || style.includes("orthodox");
}

function fallbackSet(p) {
  if (p.role === "BOWLER" && isSpinner(p)) return "SP1";
  return ROLE_FALLBACK_SET[p.role] || "BA2";
}

function fallbackCategory(p, set) {
  if (set.startsWith("SP")) return "Spin Bowlers";
  if (set.startsWith("FA")) return "Fast Bowlers";
  return ROLE_CATEGORY[p.role] || "Batters";
}

const data = JSON.parse(fs.readFileSync(PLAYERS_PATH, "utf-8"));
const marqueeSet = new Set(MARQUEE_PLAYER_IDS);

if (marqueeSet.size !== 35) {
  console.error(`Expected 35 marquee IDs, got ${marqueeSet.size}`);
  process.exit(1);
}

const byId = new Map(data.players.map((p) => [p.id, p]));
const missing = MARQUEE_PLAYER_IDS.filter((id) => !byId.has(id));
if (missing.length) {
  console.error("Missing player IDs:", missing.join(", "));
  process.exit(1);
}

let promoted = 0;
let demoted = 0;

for (const p of data.players) {
  if (marqueeSet.has(p.id)) {
    p.set = MARQUEE_SET;
    p.category = MARQUEE_CATEGORY;
    p.basePrice = MARQUEE_BASE_PRICE;
    promoted++;
  } else if (p.set === MARQUEE_SET) {
    const newSet = fallbackSet(p);
    p.set = newSet;
    p.category = fallbackCategory(p, newSet);
    demoted++;
  }
}

fs.writeFileSync(PLAYERS_PATH, JSON.stringify(data, null, 2) + "\n");

const marqueePlayers = MARQUEE_PLAYER_IDS.map((id) => byId.get(id));
const roleCounts = {};
for (const p of marqueePlayers) {
  roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
}

console.log(`Marquee updated: ${promoted} in BA1, ${demoted} moved out of BA1`);
console.log("Role mix:", roleCounts);
console.log(
  "Marquee:",
  marqueePlayers.map((p) => p.name).join(", "),
);
