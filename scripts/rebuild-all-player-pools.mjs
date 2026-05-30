#!/usr/bin/env node
/**
 * Rebuilds all franchise league player pools (real names only) + comprehensive Legend pool.
 * Runs generate-league-players.mjs for WPL/Hundred, then SA20/BBL/WBBL, then legend merge.
 *
 * Usage: node scripts/rebuild-all-player-pools.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { isPlayerOverseasForPool } from "./league-overseas.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dir, "..", "src", "data");

const CATEGORIES = [
  { id: "marquee", name: "Marquee Players", sets: ["M1", "M2", "M3"] },
  { id: "batters", name: "Batters", sets: ["BA1", "BA2", "BA3", "BA4"] },
  { id: "allrounders", name: "All-Rounders", sets: ["AL1", "AL2", "AL3", "AL4"] },
  { id: "wicketkeepers", name: "Wicket-Keepers", sets: ["WK1", "WK2", "WK3"] },
  { id: "fast_bowlers", name: "Fast Bowlers", sets: ["FA1", "FA2", "FA3", "FA4"] },
  { id: "spinners", name: "Spin Bowlers", sets: ["SP1", "SP2", "SP3"] },
  { id: "uncapped", name: "Uncapped", sets: ["UBA1", "UBA2", "UAL1", "UAL2", "UWK1", "UWK2", "UFA1", "UFA2", "USP1", "USP2"] },
];

const LEGEND_CATEGORIES = [
  { id: "ipl_legends", name: "IPL Legends", sets: ["IL1", "IL2", "IL3", "IL4"] },
  { id: "intl_legends", name: "International Legends", sets: ["INT1", "INT2", "INT3", "INT4"] },
  { id: "batters", name: "Legend Batters", sets: ["BA1", "BA2", "BA3", "BA4"] },
  { id: "allrounders", name: "Legend All-Rounders", sets: ["AL1", "AL2", "AL3", "AL4"] },
  { id: "wicketkeepers", name: "Legend Wicket-Keepers", sets: ["WK1", "WK2", "WK3"] },
  { id: "fast_bowlers", name: "Legend Fast Bowlers", sets: ["FA1", "FA2", "FA3", "FA4"] },
  { id: "spinners", name: "Legend Spinners", sets: ["SP1", "SP2", "SP3", "SP4"] },
];

const WPL_TO_IPL_TEAM = { WMI: "MI", WRCB: "RCB", WDC: "DC", GG: "GT", UPW: "LSG" };
const IPL_TEAM_IDS = ["CSK", "MI", "RCB", "DC", "KKR", "SRH", "PBKS", "RR", "GT", "LSG"];

function mk(id, name, country, role, set, previousTeam, opts = {}) {
  const league = opts.league || "ipl";
  const isOverseas = opts.isOverseas ?? isPlayerOverseasForPool(country, league);
  const isCapped = opts.isCapped !== false;
  const baseMap = {
    M1: 200, M2: 200, M3: 200, IL1: 200, IL2: 180, IL3: 160, IL4: 140,
    INT1: 200, INT2: 180, INT3: 160, INT4: 140,
    BA1: 120, BA2: 100, BA3: 75, BA4: 50, AL1: 120, AL2: 100, AL3: 75, AL4: 50,
    WK1: 120, WK2: 100, WK3: 75, FA1: 120, FA2: 100, FA3: 75, FA4: 50,
    SP1: 120, SP2: 100, SP3: 75, SP4: 50,
  };
  const uncapBase = league === "hundred" ? 5 : league === "wpl" || league === "wbbl" ? 10 : 20;
  const basePrice = isCapped ? (baseMap[set] || 75) * 100000 : uncapBase * 100000;
  return {
    id, name, country, role,
    battingStyle: opts.battingStyle || "RHB",
    bowlingStyle: opts.bowlingStyle,
    basePrice, isOverseas, previousTeam: previousTeam || "",
    category: opts.category || setCategory(set),
    set, age: opts.age ?? 28, isCapped,
  };
}

function setCategory(set) {
  if (set.startsWith("IL")) return "IPL Legends";
  if (set.startsWith("INT")) return "International Legends";
  if (set.startsWith("M")) return "Marquee Players";
  if (set.startsWith("BA")) return set.includes("Legend") ? "Legend Batters" : "Batters";
  if (set.startsWith("AL")) return "All-Rounders";
  if (set.startsWith("WK")) return "Wicket-Keepers";
  if (set.startsWith("FA")) return "Fast Bowlers";
  if (set.startsWith("SP")) return "Spin Bowlers";
  return "Uncapped";
}

function writePool(filePath, categories, players) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ categories, players }, null, 2));
  console.log(`  ${path.relative(DATA, filePath)}: ${players.length} players`);
}

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(DATA, rel), "utf-8"));
}

console.log("Step 1: WPL + The Hundred (generate-league-players.mjs)...");
try {
  execSync("node scripts/generate-league-players.mjs", { cwd: path.join(__dir, ".."), stdio: "inherit" });
} catch (e) {
  console.warn("generate-league-players warning:", e.message);
}

function remapWplToIplTeams() {
  const wplPath = path.join(DATA, "leagues", "wpl", "players.json");
  const data = loadJson("leagues/wpl/players.json");
  let idx = 0;
  for (const p of data.players) {
    if (WPL_TO_IPL_TEAM[p.previousTeam]) p.previousTeam = WPL_TO_IPL_TEAM[p.previousTeam];
    else if (!p.previousTeam || !IPL_TEAM_IDS.includes(p.previousTeam)) {
      p.previousTeam = IPL_TEAM_IDS[idx % IPL_TEAM_IDS.length];
      idx++;
    }
  }
  writePool(wplPath, CATEGORIES, data.players);
}
remapWplToIplTeams();

// SA20 / BBL / WBBL — real-name pools only (no placeholders)

function buildPool(prefix, league, teams, marquee, squadEntries, extras) {
  const players = [];
  const seen = new Set();
  let idx = 1;
  function add(name, country, role, set, team, opts = {}) {
    const k = name.toLowerCase().trim();
    if (!name || seen.has(k)) return;
    seen.add(k);
    players.push(mk(`${prefix}${String(idx++).padStart(3, "0")}`, name, country, role, set, team, { league, ...opts }));
  }
  for (const [name, country, role, team] of marquee) add(name, country, role, "M1", team);
  for (const [team, name, country, role] of squadEntries) add(name, country, role, "BA2", team);
  for (const row of extras) {
    const [name, country, role, team, set = "AL2"] = row;
    add(name, country, role, set, team);
  }
  return players;
}

// SA20 full roster (120+ real players)
const SA20_TEAMS = ["JSK", "SEC", "MICT", "DSG", "PR", "PC", "LIO", "TIT", "WAR", "KNI"];
const sa20Marquee = [
  ["Rashid Khan", "Afghanistan", "BOWLER", "MICT"], ["Kagiso Rabada", "South Africa", "BOWLER", "MICT"],
  ["Quinton de Kock", "South Africa", "WICKETKEEPER", "DSG"], ["David Miller", "South Africa", "BATTER", "JSK"],
  ["Marco Jansen", "South Africa", "ALL-ROUNDER", "SEC"], ["Tristan Stubbs", "South Africa", "BATTER", "SEC"],
  ["Dewald Brevis", "South Africa", "BATTER", "MICT"], ["Anrich Nortje", "South Africa", "BOWLER", "PR"],
  ["Aiden Markram", "South Africa", "ALL-ROUNDER", "SEC"], ["Heinrich Klaasen", "South Africa", "WICKETKEEPER", "SEC"],
  ["Lungi Ngidi", "South Africa", "BOWLER", "DSG"], ["Ryan Rickelton", "South Africa", "WICKETKEEPER", "JSK"],
  ["Rassie van der Dussen", "South Africa", "BATTER", "PR"], ["Adam Zampa", "Australia", "BOWLER", "PR"],
  ["Jason Roy", "England", "BATTER", "PC"], ["Faf du Plessis", "South Africa", "BATTER", "JSK"],
  ["Will Jacks", "England", "ALL-ROUNDER", "MICT"], ["Sam Curran", "England", "ALL-ROUNDER", "PR"],
  ["Chris Morris", "South Africa", "ALL-ROUNDER", "PC"], ["Kyle Verreynne", "South Africa", "WICKETKEEPER", "PC"],
  ["Ben Stokes", "England", "ALL-ROUNDER", "MICT"], ["Tim David", "Australia", "BATTER", "MICT"],
];
const sa20Squads = [
  ["JSK", "Faf du Plessis", "South Africa", "BATTER"], ["JSK", "David Miller", "South Africa", "BATTER"],
  ["JSK", "Ryan Rickelton", "South Africa", "WICKETKEEPER"], ["JSK", "George Linde", "South Africa", "ALL-ROUNDER"],
  ["JSK", "Moeen Ali", "England", "ALL-ROUNDER"], ["JSK", "Leus du Plooy", "South Africa", "BATTER"],
  ["JSK", "Nandre Burger", "South Africa", "BOWLER"], ["JSK", "Lutho Sipamla", "South Africa", "BOWLER"],
  ["JSK", "Mitchell van Buuren", "South Africa", "ALL-ROUNDER"], ["JSK", "Kyle Simmonds", "South Africa", "BOWLER"],
  ["SEC", "Aiden Markram", "South Africa", "ALL-ROUNDER"], ["SEC", "Heinrich Klaasen", "South Africa", "WICKETKEEPER"],
  ["SEC", "Marco Jansen", "South Africa", "ALL-ROUNDER"], ["SEC", "Tristan Stubbs", "South Africa", "BATTER"],
  ["SEC", "Tom Curran", "England", "ALL-ROUNDER"], ["SEC", "Craig Overton", "England", "BOWLER"],
  ["SEC", "Daniel Worrall", "Australia", "BOWLER"], ["SEC", "Patrick Kruger", "South Africa", "ALL-ROUNDER"],
  ["SEC", "Adam Rossington", "England", "WICKETKEEPER"], ["SEC", "Ottis Gibson", "South Africa", "BOWLER"],
  ["MICT", "Rashid Khan", "Afghanistan", "BOWLER"], ["MICT", "Kagiso Rabada", "South Africa", "BOWLER"],
  ["MICT", "Dewald Brevis", "South Africa", "BATTER"], ["MICT", "Will Jacks", "England", "ALL-ROUNDER"],
  ["MICT", "Ben Stokes", "England", "ALL-ROUNDER"], ["MICT", "Tim David", "Australia", "BATTER"],
  ["MICT", "George Linde", "South Africa", "ALL-ROUNDER"], ["MICT", "Olly Stone", "England", "BOWLER"],
  ["MICT", "Duan Jansen", "South Africa", "BOWLER"], ["MICT", "Kyle Verreynne", "South Africa", "WICKETKEEPER"],
  ["DSG", "Quinton de Kock", "South Africa", "WICKETKEEPER"], ["DSG", "Lungi Ngidi", "South Africa", "BOWLER"],
  ["DSG", "Jon-Jon Smuts", "South Africa", "ALL-ROUNDER"], ["DSG", "Wiaan Mulder", "South Africa", "ALL-ROUNDER"],
  ["DSG", "Matthew Breetzke", "South Africa", "BATTER"], ["DSG", "Naveen-ul-Haq", "Afghanistan", "BOWLER"],
  ["DSG", "Jason Holder", "West Indies", "ALL-ROUNDER"], ["DSG", "Prenelan Subrayen", "South Africa", "BOWLER"],
  ["DSG", "Junior Dala", "South Africa", "BOWLER"], ["DSG", "Chris McKenzie", "South Africa", "WICKETKEEPER"],
  ["PR", "Anrich Nortje", "South Africa", "BOWLER"], ["PR", "Rassie van der Dussen", "South Africa", "BATTER"],
  ["PR", "Adam Zampa", "Australia", "BOWLER"], ["PR", "Sam Curran", "England", "ALL-ROUNDER"],
  ["PR", "David Wiese", "South Africa", "ALL-ROUNDER"], ["PR", "Bjorn Fortuin", "South Africa", "BOWLER"],
  ["PR", "Evan Jones", "South Africa", "ALL-ROUNDER"], ["PR", "Mitchell Owen", "South Africa", "BOWLER"],
  ["PC", "Jason Roy", "England", "BATTER"], ["PC", "Chris Morris", "South Africa", "ALL-ROUNDER"],
  ["PC", "Kyle Verreynne", "South Africa", "WICKETKEEPER"], ["PC", "Wayne Parnell", "South Africa", "BOWLER"],
  ["PC", "Cameron Delport", "South Africa", "BATTER"], ["PC", "Senuran Muthusamy", "South Africa", "ALL-ROUNDER"],
  ["PC", "Joshua Little", "Ireland", "BOWLER"], ["PC", "Shane Dadswell", "South Africa", "BOWLER"],
];
const sa20Extras = [
  ["Reece Topley", "England", "BOWLER", "PC", "FA2"], ["Liam Livingstone", "England", "ALL-ROUNDER", "JSK", "AL1"],
  ["Dwaine Pretorius", "South Africa", "ALL-ROUNDER", "SEC", "AL2"], ["Tabraiz Shamsi", "South Africa", "BOWLER", "MICT", "SP1"],
  ["Keshav Maharaj", "South Africa", "BOWLER", "DSG", "SP1"], ["Reeza Hendricks", "South Africa", "BATTER", "JSK", "BA1"],
  ["Tony de Zorzi", "South Africa", "BATTER", "DSG", "BA2"], ["Donovan Ferreira", "South Africa", "BATTER", "MICT", "BA2"],
  ["Corbin Bosch", "South Africa", "ALL-ROUNDER", "SEC", "AL2"], ["Wihan Lubbe", "South Africa", "BATTER", "PR", "BA3"],
  ["Sisanda Magala", "South Africa", "BOWLER", "DSG", "FA3"], ["Fred Klaassen", "Netherlands", "BOWLER", "PC", "FA2"],
  ["Roelof van der Merwe", "Netherlands", "ALL-ROUNDER", "JSK", "AL3"], ["Simon Harmer", "South Africa", "BOWLER", "SEC", "SP2"],
  ["Lizaad Williams", "South Africa", "BOWLER", "PR", "FA3"], ["Ernest Kemm", "South Africa", "BOWLER", "PC", "FA3"],
  ["Matthew Hurst", "South Africa", "WICKETKEEPER", "DSG", "WK2"], ["Jordan Cox", "England", "BATTER", "MICT", "BA3"],
  ["Tom Abell", "England", "BATTER", "SEC", "BA3"], ["George Garton", "England", "BOWLER", "PC", "FA2"],
  ["Albie Morkel", "South Africa", "ALL-ROUNDER", "JSK", "AL3"], ["Daryn Dupavillon", "South Africa", "BOWLER", "MICT", "FA3"],
  ["Simon Johnson", "South Africa", "BATTER", "PR", "BA3"], ["Eoin Lewis", "South Africa", "BATTER", "PR", "BA2"],
  ["Lhuan-Dre Pretorius", "South Africa", "BATTER", "JSK", "BA3"], ["Kwena Maphaka", "South Africa", "BOWLER", "MICT", "FA1"],
  ["Gerald Coetzee", "South Africa", "BOWLER", "MICT", "FA1"], ["Ottneil Baartman", "South Africa", "BOWLER", "SEC", "FA2"],
  ["Beuran Hendricks", "South Africa", "BOWLER", "JSK", "FA2"], ["Wayne Madsen", "England", "BATTER", "DSG", "BA1"],
  ["Matthew Boast", "South Africa", "BOWLER", "PR", "FA3"],   ["Musa Ahmed", "South Africa", "BATTER", "PC", "UBA1"],
  ["Rassie van der Dussen", "South Africa", "BATTER", "LIO", "BA2"], ["Dwaine Pretorius", "South Africa", "ALL-ROUNDER", "TIT", "AL2"],
  ["Beuran Hendricks", "South Africa", "BOWLER", "WAR", "FA2"], ["Simon Harmer", "South Africa", "BOWLER", "KNI", "SP1"],
  ["Tony de Zorzi", "South Africa", "BATTER", "LIO", "BA3"], ["Donovan Ferreira", "South Africa", "BATTER", "TIT", "BA2"],
];

// BBL squads (150+)
const BBL_TEAMS = ["BH", "HH", "MS", "PS", "SS", "AS", "MR", "ST", "GC", "TS"];
const bblMarquee = [
  ["Travis Head", "Australia", "BATTER", "AS"], ["Steve Smith", "Australia", "BATTER", "SS"],
  ["Glenn Maxwell", "Australia", "ALL-ROUNDER", "MS"], ["Mitchell Starc", "Australia", "BOWLER", "SS"],
  ["Josh Inglis", "Australia", "WICKETKEEPER", "PS"], ["Matthew Wade", "Australia", "WICKETKEEPER", "HH"],
  ["Marcus Stoinis", "Australia", "ALL-ROUNDER", "PS"], ["Aaron Finch", "Australia", "BATTER", "ST"],
  ["David Warner", "Australia", "BATTER", "SS"], ["Pat Cummins", "Australia", "BOWLER", "SS"],
  ["Mitchell Marsh", "Australia", "ALL-ROUNDER", "PS"], ["Adam Zampa", "Australia", "BOWLER", "MR"],
  ["Kane Richardson", "Australia", "BOWLER", "AS"], ["Jhye Richardson", "Australia", "BOWLER", "PS"],
  ["Sean Abbott", "Australia", "ALL-ROUNDER", "SS"], ["Ashton Agar", "Australia", "ALL-ROUNDER", "PS"],
  ["Tim David", "Australia", "BATTER", "HH"], ["Nathan Ellis", "Australia", "BOWLER", "HH"],
  ["Will Jacks", "England", "ALL-ROUNDER", "MR"], ["Andre Russell", "West Indies", "ALL-ROUNDER", "MR"],
];
const bblSquads = [
  ["BH", "Travis Head", "Australia", "BATTER"], ["BH", "Michael Neser", "Australia", "BOWLER"],
  ["BH", "Xavier Bartlett", "Australia", "BOWLER"], ["BH", "Spencer Johnson", "Australia", "BOWLER"],
  ["BH", "Jimmy Peirson", "Australia", "WICKETKEEPER"], ["BH", "Matt Renshaw", "Australia", "BATTER"],
  ["BH", "Tom Banton", "England", "BATTER"], ["BH", "Mark Steketee", "Australia", "BOWLER"],
  ["BH", "Sam Heazlett", "Australia", "BATTER"], ["BH", "Lachlan Pfeffer", "Australia", "WICKETKEEPER"],
  ["HH", "Matthew Wade", "Australia", "WICKETKEEPER"], ["HH", "Tim David", "Australia", "BATTER"],
  ["HH", "Nathan Ellis", "Australia", "BOWLER"], ["HH", "Riley Meredith", "Australia", "BOWLER"],
  ["HH", "Caleb Jewell", "Australia", "BATTER"], ["HH", "Chris Jordan", "England", "BOWLER"],
  ["HH", "Peter Siddle", "Australia", "BOWLER"], ["HH", "Colin Ackermann", "England", "ALL-ROUNDER"],
  ["HH", "Macalister Wright", "Australia", "BATTER"], ["HH", "Nathan McAndrew", "Australia", "BOWLER"],
  ["MS", "Glenn Maxwell", "Australia", "ALL-ROUNDER"], ["MS", "Marcus Stoinis", "Australia", "ALL-ROUNDER"],
  ["MS", "Adam Zampa", "Australia", "BOWLER"], ["MS", "Hilton Cartwright", "Australia", "ALL-ROUNDER"],
  ["MS", "Tom Rogers", "Australia", "BATTER"], ["MS", "Dan Lawrence", "England", "BATTER"],
  ["MS", "Beau Webster", "Australia", "ALL-ROUNDER"], ["MS", "Brody Couch", "Australia", "ALL-ROUNDER"],
  ["PS", "Josh Inglis", "Australia", "WICKETKEEPER"], ["PS", "Mitchell Marsh", "Australia", "ALL-ROUNDER"],
  ["PS", "Marcus Stoinis", "Australia", "ALL-ROUNDER"], ["PS", "Ashton Agar", "Australia", "ALL-ROUNDER"],
  ["PS", "Jhye Richardson", "Australia", "BOWLER"], ["PS", "Jason Behrendorff", "Australia", "BOWLER"],
  ["PS", "Ashton Turner", "Australia", "BATTER"], ["PS", "Cooper Connolly", "Australia", "ALL-ROUNDER"],
  ["PS", "Lance Morris", "Australia", "BOWLER"], ["PS", "Nick Hobson", "Australia", "BATTER"],
  ["SS", "Steve Smith", "Australia", "BATTER"], ["SS", "David Warner", "Australia", "BATTER"],
  ["SS", "Mitchell Starc", "Australia", "BOWLER"], ["SS", "Pat Cummins", "Australia", "BOWLER"],
  ["SS", "Sean Abbott", "Australia", "ALL-ROUNDER"], ["SS", "Moises Henriques", "Australia", "ALL-ROUNDER"],
  ["SS", "James Vince", "England", "BATTER"], ["SS", "Ben Dwarshuis", "Australia", "BOWLER"],
  ["SS", "Jackson Bird", "Australia", "BOWLER"], ["SS", "Hayden Kerr", "Australia", "ALL-ROUNDER"],
  ["AS", "Travis Head", "Australia", "BATTER"], ["AS", "Kane Richardson", "Australia", "BOWLER"],
  ["AS", "Alex Carey", "Australia", "WICKETKEEPER"], ["AS", "Matt Renshaw", "Australia", "BATTER"],
  ["AS", "Henry Thornton", "Australia", "BOWLER"], ["AS", "Harry Conway", "Australia", "BOWLER"],
  ["AS", "Jamie Overton", "England", "ALL-ROUNDER"], ["AS", "Dwayne Bravo", "West Indies", "ALL-ROUNDER"],
  ["MR", "Will Jacks", "England", "ALL-ROUNDER"], ["MR", "Adam Zampa", "Australia", "BOWLER"],
  ["MR", "Aaron Finch", "Australia", "BATTER"], ["MR", "Andre Russell", "West Indies", "ALL-ROUNDER"],
  ["MR", "Mujeeb Ur Rahman", "Afghanistan", "BOWLER"], ["MR", "Will Sutherland", "Australia", "ALL-ROUNDER"],
  ["MR", "Tom Rogers", "Australia", "BATTER"], ["MR", "Sam Harper", "Australia", "WICKETKEEPER"],
  ["ST", "Aaron Finch", "Australia", "BATTER"], ["ST", "Chris Green", "Australia", "ALL-ROUNDER"],
  ["ST", "Daniel Sams", "Australia", "ALL-ROUNDER"], ["ST", "Chris Jordan", "England", "BOWLER"],
  ["ST", "Jason Sangha", "Australia", "BATTER"], ["ST", "Baxter Holt", "Australia", "WICKETKEEPER"],
  ["ST", "Tanveer Sangha", "Australia", "BOWLER"], ["ST", "Matthew Gilkes", "Australia", "BATTER"],
];
const bblExtras = [
  ["Chris Lynn", "Australia", "BATTER", "MR", "BA1"], ["Nathan Coulter-Nile", "Australia", "BOWLER", "PS", "FA2"],
  ["Andrew Tye", "Australia", "BOWLER", "HH", "FA2"], ["Liam O'Connor", "Australia", "BOWLER", "AS", "FA3"],
  ["Joel Davies", "Australia", "ALL-ROUNDER", "MS", "AL2"], ["Tom Rogers", "Australia", "BATTER", "MR", "BA2"],
  ["Zak Evans", "Australia", "BOWLER", "MR", "FA3"], ["Faf du Plessis", "South Africa", "BATTER", "ST", "BA1"],
  ["Liam Livingstone", "England", "ALL-ROUNDER", "MR", "AL1"], ["Jon Wells", "Australia", "BATTER", "AS", "BA3"],
  ["Ben Manenti", "Australia", "ALL-ROUNDER", "AS", "AL3"], ["Stephen Eskinazi", "England", "BATTER", "PS", "BA3"],
  ["Cameron Bancroft", "Australia", "BATTER", "PS", "BA2"], ["Jake Fraser-McGurk", "Australia", "BATTER", "MR", "BA3"],
  ["Liam Scott", "Australia", "BATTER", "AS", "BA2"], ["Tom Rogers", "Australia", "BATTER", "MS", "BA3"],
  ["Michael Bracewell", "New Zealand", "ALL-ROUNDER", "HH", "AL2"], ["Lockie Ferguson", "New Zealand", "BOWLER", "HH", "FA1"],
  ["Laurie Evans", "England", "BATTER", "PS", "BA2"], ["Joe Burns", "Australia", "BATTER", "BH", "BA3"],
  ["Jordan Silk", "Australia", "BATTER", "SS", "BA3"], ["Callum Ferguson", "Australia", "BATTER", "MR", "BA2"],
  ["Ben Cutting", "Australia", "ALL-ROUNDER", "ST", "AL2"], ["Mitchell Owen", "Australia", "ALL-ROUNDER", "PS", "AL3"],
  ["Tom Curran", "England", "ALL-ROUNDER", "ST", "AL3"], ["Rashid Khan", "Afghanistan", "BOWLER", "MR", "SP1"],
  ["Usman Khawaja", "Australia", "BATTER", "AS", "BA1"], ["Josh Philippe", "Australia", "WICKETKEEPER", "PS", "WK2"],
  ["Sam Harper", "Australia", "WICKETKEEPER", "MR", "WK1"], ["Billy Stanlake", "Australia", "BOWLER", "HH", "FA3"],
  ["Nathan McSween", "Australia", "BOWLER", "BH", "FA3"], ["Tom Henty", "Australia", "BOWLER", "MS", "FA3"],
  ["Liam Hatcher", "Australia", "BOWLER", "ST", "FA2"], ["Tom Rogers", "Australia", "BATTER", "MS", "BA2"],
  ["Cooper Connolly", "Australia", "ALL-ROUNDER", "PS", "AL1"], ["Nick Stevens", "Australia", "ALL-ROUNDER", "BH", "AL3"],
  ["Tom Rogers", "Australia", "BATTER", "MS", "UBA1"],   ["Lachie Ferguson", "New Zealand", "BOWLER", "MR", "FA1"],
  ["Michael Neser", "Australia", "BOWLER", "GC", "FA2"], ["Matt Renshaw", "Australia", "BATTER", "GC", "BA3"],
  ["Spencer Johnson", "Australia", "BOWLER", "TS", "FA3"], ["Caleb Jewell", "Australia", "BATTER", "TS", "BA2"],
];

// WBBL (120+)
const wbblSquads = [
  ["BH-W", "Amelia Kerr", "New Zealand", "ALL-ROUNDER"], ["BH-W", "Heather Knight", "England", "ALL-ROUNDER"],
  ["BH-W", "Grace Harris", "Australia", "ALL-ROUNDER"], ["BH-W", "Jess Jonassen", "Australia", "BOWLER"],
  ["BH-W", "Charlotte Coe", "Australia", "BOWLER"], ["BH-W", "Nikola Carey", "Australia", "ALL-ROUNDER"],
  ["BH-W", "Laura Harris", "Australia", "BATTER"], ["BH-W", "Molly Strano", "Australia", "BOWLER"],
  ["BH-W", "Georgia Redmayne", "Australia", "WICKETKEEPER"], ["BH-W", "Anneke Bosch", "South Africa", "ALL-ROUNDER"],
  ["HH-W", "Hayley Matthews", "West Indies", "ALL-ROUNDER"], ["HH-W", "Phoebe Litchfield", "Australia", "BATTER"],
  ["HH-W", "Nicola Carey", "Australia", "ALL-ROUNDER"], ["HH-W", "Heather Graham", "Australia", "ALL-ROUNDER"],
  ["HH-W", "Rachel Haynes", "Australia", "BATTER"], ["HH-W", "Elyse Villani", "Australia", "BATTER"],
  ["HH-W", "Amy Smith", "Australia", "BOWLER"], ["HH-W", "Maitlan Brown", "Australia", "BOWLER"],
  ["HH-W", "Chloe Pipar", "Australia", "BOWLER"], ["MS-W", "Sophie Ecclestone", "England", "BOWLER"],
  ["MS-W", "Meg Lanning", "Australia", "BATTER"], ["MS-W", "Annabel Sutherland", "Australia", "ALL-ROUNDER"],
  ["MS-W", "Kim Garth", "Ireland", "ALL-ROUNDER"], ["MS-W", "Alice Capsey", "England", "ALL-ROUNDER"],
  ["MS-W", "Erin Burns", "Australia", "ALL-ROUNDER"], ["MS-W", "Nicola Hancock", "Australia", "BOWLER"],
  ["MS-W", "Paris Cotter", "Australia", "ALL-ROUNDER"], ["MS-W", "Olivia Davies", "Australia", "BOWLER"],
  ["MS-W", "Lucy Hamilton", "Australia", "BOWLER"], ["PS-W", "Meg Lanning", "Australia", "BATTER"],
  ["PS-W", "Beth Mooney", "Australia", "WICKETKEEPER"], ["PS-W", "Marizanne Kapp", "South Africa", "ALL-ROUNDER"],
  ["PS-W", "Laura Wolvaardt", "South Africa", "BATTER"], ["PS-W", "Sophie Devine", "New Zealand", "ALL-ROUNDER"],
  ["PS-W", "Amy Edgar", "Australia", "ALL-ROUNDER"], ["PS-W", "Alana King", "Australia", "BOWLER"],
  ["PS-W", "Lilly Mills", "Australia", "BOWLER"], ["PS-W", "Taneale Peschel", "Australia", "BOWLER"],
  ["SS-W", "Alyssa Healy", "Australia", "WICKETKEEPER"], ["SS-W", "Ellyse Perry", "Australia", "ALL-ROUNDER"],
  ["SS-W", "Nat Sciver-Brunt", "England", "ALL-ROUNDER"], ["SS-W", "Ashleigh Gardner", "Australia", "ALL-ROUNDER"],
  ["SS-W", "Lauren Cheatle", "Australia", "BOWLER"], ["SS-W", "Maitlan Brown", "Australia", "BOWLER"],
  ["PS-W", "Meg Lanning", "Australia", "BATTER"], ["PS-W", "Beth Mooney", "Australia", "WICKETKEEPER"],
  ["PS-W", "Marizanne Kapp", "South Africa", "ALL-ROUNDER"], ["PS-W", "Laura Wolvaardt", "South Africa", "BATTER"],
  ["PS-W", "Sophie Devine", "New Zealand", "ALL-ROUNDER"], ["PS-W", "Alana King", "Australia", "BOWLER"],
  ["MR-W", "Ash Gardner", "Australia", "ALL-ROUNDER"], ["MR-W", "Annabel Sutherland", "Australia", "ALL-ROUNDER"],
  ["MR-W", "Deepti Sharma", "India", "ALL-ROUNDER"], ["MR-W", "Tammy Beaumont", "England", "WICKETKEEPER"],
  ["AS-W", "Smriti Mandhana", "India", "BATTER"], ["AS-W", "Tahlia McGrath", "Australia", "ALL-ROUNDER"],
  ["AS-W", "Richa Ghosh", "India", "WICKETKEEPER"], ["AS-W", "Megan Schutt", "Australia", "BOWLER"],
  ["AS-W", "Darcie Brown", "Australia", "BOWLER"], ["HH-W", "Hayley Matthews", "West Indies", "ALL-ROUNDER"],
  ["HH-W", "Phoebe Litchfield", "Australia", "BATTER"], ["HH-W", "Heather Graham", "Australia", "ALL-ROUNDER"],
  ["BH-W", "Amelia Kerr", "New Zealand", "ALL-ROUNDER"], ["BH-W", "Heather Knight", "England", "ALL-ROUNDER"],
  ["BH-W", "Grace Harris", "Australia", "ALL-ROUNDER"], ["BH-W", "Jess Jonassen", "Australia", "BOWLER"],
  ["MS-W", "Sophie Ecclestone", "England", "BOWLER"], ["MS-W", "Kim Garth", "Ireland", "ALL-ROUNDER"],
  ["MS-W", "Alice Capsey", "England", "ALL-ROUNDER"], ["ST-W", "Georgia Wareham", "Australia", "ALL-ROUNDER"],
];
const wbblMarquee = [
  ["Alyssa Healy", "Australia", "WICKETKEEPER", "SS-W"], ["Meg Lanning", "Australia", "BATTER", "PS-W"],
  ["Ellyse Perry", "Australia", "ALL-ROUNDER", "SS-W"], ["Beth Mooney", "Australia", "WICKETKEEPER", "PS-W"],
  ["Ash Gardner", "Australia", "ALL-ROUNDER", "MR-W"], ["Sophie Ecclestone", "England", "BOWLER", "MS-W"],
  ["Nat Sciver-Brunt", "England", "ALL-ROUNDER", "SS-W"], ["Smriti Mandhana", "India", "BATTER", "AS-W"],
  ["Hayley Matthews", "West Indies", "ALL-ROUNDER", "HH-W"], ["Amelia Kerr", "New Zealand", "ALL-ROUNDER", "BH-W"],
];
const wbblExtras = [
  ["Harmanpreet Kaur", "India", "ALL-ROUNDER", "MR-W", "AL1"], ["Shafali Verma", "India", "BATTER", "AS-W", "BA1"],
  ["Jemimah Rodrigues", "India", "BATTER", "PS-W", "BA2"], ["Deepti Sharma", "India", "ALL-ROUNDER", "MR-W", "AL2"],
  ["Renuka Singh", "India", "BOWLER", "AS-W", "FA1"], ["Shabnim Ismail", "South Africa", "BOWLER", "PS-W", "FA2"],
  ["Katherine Brunt", "England", "BOWLER", "BH-W", "FA2"], ["Megan Schutt", "Australia", "BOWLER", "AS-W", "FA3"],
  ["Rajeshwari Gayakwad", "India", "BOWLER", "HH-W", "SP1"], ["Sophie Devine", "New Zealand", "ALL-ROUNDER", "PS-W", "AL3"],
  ["Chamari Athapaththu", "Sri Lanka", "ALL-ROUNDER", "BH-W", "AL2"], ["Deandra Dottin", "West Indies", "ALL-ROUNDER", "SS-W", "AL1"],
  ["Laura Harris", "Australia", "BATTER", "BH-W", "BA3"], ["Elyse Villani", "Australia", "BATTER", "HH-W", "BA2"],
  ["Nicola Carey", "Australia", "ALL-ROUNDER", "HH-W", "AL3"], ["Annabel Sutherland", "Australia", "ALL-ROUNDER", "MR-W", "AL2"],
  ["Issy Wong", "England", "BOWLER", "MS-W", "FA2"], ["Charlie Dean", "England", "BOWLER", "ST-W", "SP2"],
  ["Amy Jones", "England", "WICKETKEEPER", "BH-W", "WK2"], ["Danni Wyatt", "England", "BATTER", "SS-W", "BA2"],
  ["Georgia Adams", "England", "ALL-ROUNDER", "ST-W", "AL2"], ["Freya Kemp", "England", "ALL-ROUNDER", "MS-W", "AL3"],
  ["Maia Bouchier", "England", "BATTER", "BH-W", "BA3"], ["Sophia Dunkley", "England", "ALL-ROUNDER", "PS-W", "AL3"],
  ["Tahlia Vlaeminck", "Australia", "BOWLER", "AS-W", "FA1"], ["Darcie Brown", "Australia", "BOWLER", "AS-W", "FA3"],
  ["Molly Strano", "Australia", "BOWLER", "HH-W", "SP2"], ["Erin Burns", "Australia", "ALL-ROUNDER", "SS-W", "AL3"],
  ["Paris Cotter", "Australia", "ALL-ROUNDER", "MS-W", "AL2"], ["Kate Cross", "England", "BOWLER", "BH-W", "FA3"],
  ["Lauren Bell", "England", "BOWLER", "MR-W", "FA2"],   ["Kristie Gordon", "West Indies", "BOWLER", "ST-W", "SP1"],
  ["Laura Harris", "Australia", "BATTER", "GC-W", "BA3"], ["Molly Strano", "Australia", "BOWLER", "GC-W", "SP2"],
  ["Phoebe Litchfield", "Australia", "BATTER", "TS-W", "BA2"], ["Maitlan Brown", "Australia", "BOWLER", "TS-W", "FA3"],
];

console.log("\nWriting franchise league pools (real players only):");
const sa20Players = buildPool("SP", "sa20", SA20_TEAMS, sa20Marquee, sa20Squads, sa20Extras);
const bblPlayers = buildPool("BP", "bbl", BBL_TEAMS, bblMarquee, bblSquads, bblExtras);
const wbblPlayers = buildPool("WB", "wbbl", [], wbblMarquee, wbblSquads, wbblExtras);
writePool(path.join(DATA, "leagues", "sa20", "players.json"), CATEGORIES, sa20Players);
writePool(path.join(DATA, "leagues", "bbl", "players.json"), CATEGORIES, bblPlayers);
writePool(path.join(DATA, "leagues", "wbbl", "players.json"), CATEGORIES, wbblPlayers);

// ─── LEGEND POOL: all IPL auction players + historical IPL + international greats ───
console.log("\nBuilding comprehensive Legend pool...");

const INTL_HALL_OF_FAME = new Set([
  "brian lara", "viv richards", "garfield sobers", "malcolm marshall", "curtly ambrose", "joel garner",
  "courtney walsh", "wasim akram", "imran khan", "javed miandad", "waqar younis", "inzamam-ul-haq",
  "shane bond", "richard hadlee", "martin crowe", "ian botham", "andrew flintoff", "kevin pietersen",
  "graham gooch", "james anderson", "stuart broad", "allan donald", "shaun pollock", "graeme smith",
  "mark boucher", "herschelle gibbs", "sanath jayasuriya", "aravinda de silva", "chaminda vaas",
  "clive lloyd", "kapil dev", "sunil gavaskar", "ravi shastri", "ian healy", "mark waugh", "steve waugh",
  "dennis lillee", "muttiah muralitharan", "kumar sangakkara", "mahela jayawardene", "jacques kallis",
  "adam gilchrist", "ricky ponting", "matthew hayden", "michael clarke", "shane warne", "brendon mccullum",
  "brett lee", "glenn mcgrath", "matthew hayden", "chris gayle", "curtly ambrose", "courtney walsh",
]);

const IPL_HISTORICAL_ONLY = [
  ["Sachin Tendulkar", "India", "BATTER"], ["Rahul Dravid", "India", "BATTER"], ["Sourav Ganguly", "India", "BATTER"],
  ["VVS Laxman", "India", "BATTER"], ["Virender Sehwag", "India", "BATTER"], ["Gautam Gambhir", "India", "BATTER"],
  ["Yuvraj Singh", "India", "ALL-ROUNDER"], ["Zaheer Khan", "India", "BOWLER"], ["Anil Kumble", "India", "BOWLER"],
  ["Harbhajan Singh", "India", "BOWLER"], ["Praveen Kumar", "India", "BOWLER"], ["Irfan Pathan", "India", "ALL-ROUNDER"],
  ["Parthiv Patel", "India", "WICKETKEEPER"], ["Dinesh Karthik", "India", "WICKETKEEPER"],
  ["Robin Uthappa", "India", "BATTER"], ["Manish Pandey", "India", "BATTER"], ["Naman Ojha", "India", "WICKETKEEPER"],
  ["Pragyan Ojha", "India", "BOWLER"], ["Piyush Chawla", "India", "BOWLER"], ["Amit Mishra", "India", "BOWLER"],
  ["Mohit Sharma", "India", "BOWLER"], ["Ashish Nehra", "India", "BOWLER"], ["Ishant Sharma", "India", "BOWLER"],
  ["Munaf Patel", "India", "BOWLER"], ["Sreesanth", "India", "BOWLER"], ["RP Singh", "India", "BOWLER"],
  ["Lakshmipathy Balaji", "India", "BOWLER"], ["Ajit Agarkar", "India", "BOWLER"], ["Vinay Kumar", "India", "BOWLER"],
  ["Dwayne Smith", "West Indies", "ALL-ROUNDER"], ["Brendon McCullum", "New Zealand", "WICKETKEEPER"],
  ["Nathan McCullum", "New Zealand", "ALL-ROUNDER"], ["Scott Styris", "New Zealand", "ALL-ROUNDER"],
  ["Daniel Vettori", "New Zealand", "BOWLER"], ["Jacob Oram", "New Zealand", "ALL-ROUNDER"],
  ["Grant Elliott", "New Zealand", "ALL-ROUNDER"], ["Ross Taylor", "New Zealand", "BATTER"],
  ["Martin Guptill", "New Zealand", "BATTER"], ["Jesse Ryder", "New Zealand", "BATTER"],
  ["Michael Hussey", "Australia", "BATTER"], ["David Hussey", "Australia", "BATTER"], ["Brad Haddin", "Australia", "WICKETKEEPER"],
  ["Michael Clarke", "Australia", "BATTER"], ["Matthew Hayden", "Australia", "BATTER"], ["Adam Gilchrist", "Australia", "WICKETKEEPER"],
  ["Shane Watson", "Australia", "ALL-ROUNDER"], ["Mitchell Johnson", "Australia", "BOWLER"],
  ["Brett Lee", "Australia", "BOWLER"], ["Glenn McGrath", "Australia", "BOWLER"], ["Jason Gillespie", "Australia", "BOWLER"],
  ["Andrew Symonds", "Australia", "ALL-ROUNDER"], ["James Faulkner", "Australia", "ALL-ROUNDER"],
  ["Paul Collingwood", "England", "ALL-ROUNDER"], ["Kevin Pietersen", "England", "BATTER"],
  ["Eoin Morgan", "England", "BATTER"], ["Ian Bell", "England", "BATTER"], ["Alastair Cook", "England", "BATTER"],
  ["Jonathan Trott", "England", "BATTER"], ["Marcus Trescothick", "England", "BATTER"],
  ["Dwayne Bravo", "West Indies", "ALL-ROUNDER"], ["Kieron Pollard", "West Indies", "ALL-ROUNDER"],
  ["Chris Gayle", "West Indies", "BATTER"], ["Ramnaresh Sarwan", "West Indies", "BATTER"],
  ["Shivnarine Chanderpaul", "West Indies", "BATTER"], ["Brian Lara", "West Indies", "BATTER"],
  ["Muttiah Muralitharan", "Sri Lanka", "BOWLER"], ["Kumar Sangakkara", "Sri Lanka", "WICKETKEEPER"],
  ["Mahela Jayawardene", "Sri Lanka", "BATTER"], ["Lasith Malinga", "Sri Lanka", "BOWLER"],
  ["Tillakaratne Dilshan", "Sri Lanka", "BATTER"], ["Angelo Mathews", "Sri Lanka", "ALL-ROUNDER"],
  ["Shahid Afridi", "Pakistan", "ALL-ROUNDER"], ["Shoaib Akhtar", "Pakistan", "BOWLER"],
  ["Saeed Ajmal", "Pakistan", "BOWLER"], ["Umar Gul", "Pakistan", "BOWLER"],
  ["AB de Villiers", "South Africa", "BATTER"], ["Hashim Amla", "South Africa", "BATTER"],
  ["JP Duminy", "South Africa", "ALL-ROUNDER"], ["Albie Morkel", "South Africa", "ALL-ROUNDER"],
  ["Morne Morkel", "South Africa", "BOWLER"], ["Dale Steyn", "South Africa", "BOWLER"],
  ["Faf du Plessis", "South Africa", "BATTER"], ["Mark Boucher", "South Africa", "WICKETKEEPER"],
];

function normName(n) {
  return n.toLowerCase().replace(/\s+/g, " ").trim();
}

const legendSeen = new Map();

function addLegendSource(player, tier) {
  const key = normName(player.name);
  if (!player.name || legendSeen.has(key)) {
    const existing = legendSeen.get(key);
    if (existing && tier === "intl" && existing.tier === "ipl") existing.tier = "both";
    return;
  }
  legendSeen.set(key, {
    name: player.name,
    country: player.country,
    role: player.role,
    battingStyle: player.battingStyle,
    bowlingStyle: player.bowlingStyle,
    isOverseas: player.isOverseas,
    tier,
  });
}

// 1) All current IPL auction list players (every IPL season participant in 2026 list)
const iplData = loadJson("players.json");
for (const p of iplData.players) {
  addLegendSource(p, p.country === "India" ? "ipl" : "intl");
}

// 2) All players from every franchise league JSON
for (const rel of ["leagues/wpl/players.json", "leagues/hundred/players.json", "leagues/sa20/players.json", "leagues/bbl/players.json", "leagues/wbbl/players.json"]) {
  try {
    for (const p of loadJson(rel).players) addLegendSource(p, INTL_HALL_OF_FAME.has(normName(p.name)) ? "intl" : "ipl");
  } catch { /* skip */ }
}

// 3) Historical IPL-only greats
for (const [name, country, role] of IPL_HISTORICAL_ONLY) {
  const isIntl = INTL_HALL_OF_FAME.has(normName(name));
  addLegendSource({ name, country, role, isOverseas: isPlayerOverseasForPool(country, "legend"), battingStyle: "RHB" }, isIntl ? "intl" : "ipl");
}

// 4) Extra international legends not yet included
const EXTRA_INTL = [
  ["Viv Richards", "West Indies", "BATTER"], ["Garfield Sobers", "West Indies", "ALL-ROUNDER"],
  ["Malcolm Marshall", "West Indies", "BOWLER"], ["Curtly Ambrose", "West Indies", "BOWLER"],
  ["Wasim Akram", "Pakistan", "BOWLER"], ["Imran Khan", "Pakistan", "ALL-ROUNDER"],
  ["Javed Miandad", "Pakistan", "BATTER"], ["Waqar Younis", "Pakistan", "BOWLER"],
  ["Shane Bond", "New Zealand", "BOWLER"], ["Richard Hadlee", "New Zealand", "BOWLER"],
  ["Ian Botham", "England", "ALL-ROUNDER"], ["Andrew Flintoff", "England", "ALL-ROUNDER"],
  ["Graham Gooch", "England", "BATTER"], ["Allan Donald", "South Africa", "BOWLER"],
  ["Shaun Pollock", "South Africa", "ALL-ROUNDER"], ["Graeme Smith", "South Africa", "BATTER"],
  ["Sanath Jayasuriya", "Sri Lanka", "ALL-ROUNDER"], ["Aravinda de Silva", "Sri Lanka", "BATTER"],
  ["Chaminda Vaas", "Sri Lanka", "BOWLER"], ["Courtney Walsh", "West Indies", "BOWLER"],
  ["Joel Garner", "West Indies", "BOWLER"], ["Clive Lloyd", "West Indies", "BATTER"],
  ["Kapil Dev", "India", "ALL-ROUNDER"], ["Sunil Gavaskar", "India", "BATTER"],
  ["Dennis Lillee", "Australia", "BOWLER"], ["Mark Waugh", "Australia", "BATTER"],
  ["Steve Waugh", "Australia", "BATTER"], ["Ian Healy", "Australia", "WICKETKEEPER"],
  ["Martin Crowe", "New Zealand", "BATTER"], ["Inzamam-ul-Haq", "Pakistan", "BATTER"],
];
for (const [name, country, role] of EXTRA_INTL) {
  addLegendSource({ name, country, role, isOverseas: isPlayerOverseasForPool(country, "legend"), battingStyle: "RHB" }, "intl");
}

// Assign sets by tier then role
const ilSets = ["IL1", "IL2", "IL3", "IL4"];
const intSets = ["INT1", "INT2", "INT3", "INT4"];
const roleSets = {
  BATTER: ["BA1", "BA2", "BA3", "BA4"],
  "ALL-ROUNDER": ["AL1", "AL2", "AL3", "AL4"],
  WICKETKEEPER: ["WK1", "WK2", "WK3"],
  BOWLER: ["FA1", "FA2", "FA3", "FA4", "SP1", "SP2", "SP3", "SP4"],
};

const ilPlayers = [];
const intPlayers = [];
const roleBuckets = { BATTER: [], "ALL-ROUNDER": [], WICKETKEEPER: [], BOWLER: [] };
const outNames = new Set();

for (const entry of legendSeen.values()) {
  const n = normName(entry.name);
  if (INTL_HALL_OF_FAME.has(n) && entry.country !== "India") {
    intPlayers.push(entry);
  } else if (entry.country === "India" || entry.tier === "ipl") {
    ilPlayers.push(entry);
  } else if (entry.tier === "intl") {
    intPlayers.push(entry);
  } else {
    (roleBuckets[entry.role] || roleBuckets["ALL-ROUNDER"]).push(entry);
  }
}

let lid = 1;
const legendOut = [];

function pushLegend(e, set, baseLakhs) {
  if (outNames.has(normName(e.name))) return;
  outNames.add(normName(e.name));
  const cat = set.startsWith("IL") ? "IPL Legends" : set.startsWith("INT") ? "International Legends" : setCategory(set);
  legendOut.push(mk(
    `LG${String(lid++).padStart(3, "0")}`,
    e.name, e.country, e.role, set, "",
    { league: "ipl", category: cat, isOverseas: e.isOverseas ?? isPlayerOverseasForPool(e.country, "legend"), battingStyle: e.battingStyle, bowlingStyle: e.bowlingStyle, age: 40 + (lid % 12), isCapped: true },
  ));
  legendOut[legendOut.length - 1].basePrice = baseLakhs * 100000;
}

ilPlayers.forEach((e, i) => pushLegend(e, ilSets[i % ilSets.length], 200 - Math.floor(i / ilSets.length) * 15));
intPlayers.forEach((e, i) => pushLegend(e, intSets[i % intSets.length], 200 - Math.floor(i / intSets.length) * 15));

for (const [role, list] of Object.entries(roleBuckets)) {
  const sets = roleSets[role] || roleSets["ALL-ROUNDER"];
  list.forEach((e, i) => pushLegend(e, sets[i % sets.length], 100));
}

writePool(path.join(DATA, "leagues", "legend", "players.json"), LEGEND_CATEGORIES, legendOut);

const counts = {
  ipl: iplData.players.length,
  wpl: loadJson("leagues/wpl/players.json").players.length,
  hundred: loadJson("leagues/hundred/players.json").players.length,
  sa20: sa20Players.length,
  bbl: bblPlayers.length,
  wbbl: wbblPlayers.length,
  legend: legendOut.length,
};
console.log("\nPlayer counts:", counts);

function updateLeagueRegistryTaglines(c) {
  const registryPath = path.join(DATA, "leagueRegistry.ts");
  let src = fs.readFileSync(registryPath, "utf-8");
  const updates = [
    ["ipl", `${c.ipl} Players · Live Multiplayer`],
    ["wpl", `${c.wpl} Players · Live Multiplayer`],
    ["hundred", `${c.hundred} Players · Mega & Legend modes`],
    ["sa20", `${c.sa20} Players · Live Multiplayer`],
    ["bbl", `${c.bbl} Players · Live Multiplayer`],
    ["wbbl", `${c.wbbl} Players · Live Multiplayer`],
  ];
  for (const [id, tagline] of updates) {
    src = src.replace(
      new RegExp(`(id: "${id}"[\\s\\S]*?tagline: ")[^"]+(")`, "m"),
      `$1${tagline}$2`,
    );
  }
  fs.writeFileSync(registryPath, src);
  console.log("Updated leagueRegistry.ts taglines.");
}

updateLeagueRegistryTaglines(counts);
console.log("\nDone. Restart the server to reload player caches.");
