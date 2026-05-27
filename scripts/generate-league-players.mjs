#!/usr/bin/env node
/**
 * Generate official-style player pools for WPL and The Hundred.
 * Usage: node scripts/generate-league-players.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dir, "..", "src", "data");

const CATEGORIES = [
  { id: "marquee", name: "Marquee Players", sets: ["M1", "M2"] },
  { id: "batters", name: "Batters", sets: ["BA1", "BA2", "BA3"] },
  { id: "allrounders", name: "All-Rounders", sets: ["AL1", "AL2", "AL3"] },
  { id: "wicketkeepers", name: "Wicket-Keepers", sets: ["WK1", "WK2"] },
  { id: "fast_bowlers", name: "Fast Bowlers", sets: ["FA1", "FA2", "FA3"] },
  { id: "spinners", name: "Spin Bowlers", sets: ["SP1", "SP2"] },
  { id: "uncapped", name: "Uncapped", sets: ["UBA1", "UAL1", "UWK1", "UFA1", "USP1"] },
];

function mk(id, name, country, role, set, previousTeam, opts = {}) {
  const isOverseas = country !== "India" && country !== "England";
  const isCapped = opts.isCapped !== false;
  const baseMap = { M1: 200, M2: 200, BA1: 150, BA2: 75, BA3: 50, AL1: 150, AL2: 75, AL3: 50, WK1: 150, WK2: 75, FA1: 150, FA2: 75, FA3: 50, SP1: 150, SP2: 75 };
  const uncapBase = opts.league === "hundred" ? 5 : opts.league === "wpl" ? 10 : 30;
  const basePrice = isCapped ? (baseMap[set] || 75) * 100000 : uncapBase * 100000;
  return {
    id,
    name,
    country,
    role,
    battingStyle: opts.battingStyle || "RHB",
    bowlingStyle: opts.bowlingStyle,
    basePrice,
    isOverseas,
    previousTeam,
    category: set.startsWith("M") ? "Marquee Players" : set.startsWith("BA") ? "Batters" : set.startsWith("AL") ? "All-Rounders" : set.startsWith("WK") ? "Wicket-Keepers" : set.startsWith("FA") ? "Fast Bowlers" : set.startsWith("SP") ? "Spin Bowlers" : "Uncapped",
    set,
    age: opts.age || 26,
    isCapped,
  };
}

// ─── WPL 2026 Mini Auction pool (official franchises + released/auction players) ───
const WPL_PLAYERS = [
  // Marquee
  mk("WP001", "Nat Sciver-Brunt", "England", "ALL-ROUNDER", "M1", "WMI", { league: "wpl", age: 32 }),
  mk("WP002", "Smriti Mandhana", "India", "BATTER", "M1", "WRCB", { league: "wpl", battingStyle: "LHB", age: 28 }),
  mk("WP003", "Ellyse Perry", "Australia", "ALL-ROUNDER", "M1", "WRCB", { league: "wpl", age: 34 }),
  mk("WP004", "Meg Lanning", "Australia", "BATTER", "M1", "WDC", { league: "wpl", age: 32 }),
  mk("WP005", "Beth Mooney", "Australia", "WICKETKEEPER", "M1", "GG", { league: "wpl", age: 31 }),
  mk("WP006", "Alyssa Healy", "Australia", "WICKETKEEPER", "M1", "UPW", { league: "wpl", age: 33 }),
  mk("WP007", "Sophie Ecclestone", "England", "BOWLER", "M2", "UPW", { league: "wpl", bowlingStyle: "Left-arm spin", age: 25 }),
  mk("WP008", "Ash Gardner", "Australia", "ALL-ROUNDER", "M2", "GG", { league: "wpl", age: 27 }),
  mk("WP009", "Amelia Kerr", "New Zealand", "ALL-ROUNDER", "M2", "WMI", { league: "wpl", age: 24 }),
  mk("WP010", "Hayley Matthews", "West Indies", "ALL-ROUNDER", "M2", "WMI", { league: "wpl", age: 27 }),
  // Batters
  mk("WP011", "Harmanpreet Kaur", "India", "ALL-ROUNDER", "BA1", "WMI", { league: "wpl", age: 35 }),
  mk("WP012", "Shafali Verma", "India", "BATTER", "BA1", "WDC", { league: "wpl", age: 21 }),
  mk("WP013", "Jemimah Rodrigues", "India", "BATTER", "BA1", "WMI", { league: "wpl", age: 25 }),
  mk("WP014", "Deepti Sharma", "India", "ALL-ROUNDER", "BA1", "UPW", { league: "wpl", age: 27 }),
  mk("WP015", "Richa Ghosh", "India", "WICKETKEEPER", "BA2", "WRCB", { league: "wpl", age: 22 }),
  mk("WP016", "Tahlia McGrath", "Australia", "ALL-ROUNDER", "BA2", "UPW", { league: "wpl", age: 29 }),
  mk("WP017", "Marizanne Kapp", "South Africa", "ALL-ROUNDER", "BA2", "WDC", { league: "wpl", age: 35 }),
  mk("WP018", "Laura Wolvaardt", "South Africa", "BATTER", "BA2", "GG", { league: "wpl", age: 25 }),
  mk("WP019", "Georgia Wareham", "Australia", "ALL-ROUNDER", "BA2", "WRCB", { league: "wpl", age: 26 }),
  mk("WP020", "Asha Sobhana", "India", "ALL-ROUNDER", "BA3", "WRCB", { league: "wpl", age: 24 }),
  mk("WP021", "Radha Yadav", "India", "ALL-ROUNDER", "BA3", "WDC", { league: "wpl", age: 25 }),
  mk("WP022", "Sneh Rana", "India", "ALL-ROUNDER", "BA3", "GG", { league: "wpl", age: 32 }),
  mk("WP023", "Grace Harris", "Australia", "ALL-ROUNDER", "BA3", "UPW", { league: "wpl", age: 32 }),
  mk("WP024", "Phoebe Litchfield", "Australia", "BATTER", "BA3", "GG", { league: "wpl", age: 22 }),
  mk("WP025", "Chamari Athapaththu", "Sri Lanka", "ALL-ROUNDER", "BA3", "GG", { league: "wpl", age: 34 }),
  // All-rounders
  mk("WP026", "Deepti Sharma", "India", "ALL-ROUNDER", "AL1", "UPW", { league: "wpl" }),
  mk("WP027", "Natalie Sciver-Brunt", "England", "ALL-ROUNDER", "AL1", "WMI", { league: "wpl" }),
  mk("WP028", "Annabel Sutherland", "Australia", "ALL-ROUNDER", "AL1", "WMI", { league: "wpl", age: 23 }),
  mk("WP029", "Kim Garth", "Ireland", "ALL-ROUNDER", "AL2", "WRCB", { league: "wpl", age: 28 }),
  mk("WP030", "Heather Knight", "England", "ALL-ROUNDER", "AL2", "WRCB", { league: "wpl", age: 34 }),
  mk("WP031", "Alice Capsey", "England", "ALL-ROUNDER", "AL2", "WDC", { league: "wpl", age: 20 }),
  mk("WP032", "Shikha Pandey", "India", "ALL-ROUNDER", "AL2", "GG", { league: "wpl", age: 35 }),
  mk("WP033", "Marizanne Kapp", "South Africa", "ALL-ROUNDER", "AL3", "UPW", { league: "wpl", age: 35 }),
  mk("WP034", "Natalie Sciver-Brunt", "England", "ALL-ROUNDER", "AL3", "WMI", { league: "wpl" }),
  mk("WP035", "Taniya Bhatia", "India", "WICKETKEEPER", "AL3", "WDC", { league: "wpl", age: 26 }),
  // Wicketkeepers
  mk("WP036", "Yastika Bhatia", "India", "WICKETKEEPER", "WK1", "WMI", { league: "wpl", age: 24 }),
  mk("WP037", "Sarah Bryce", "Scotland", "WICKETKEEPER", "WK2", "WRCB", { league: "wpl", age: 26 }),
  mk("WP038", "Priya Punia", "India", "WICKETKEEPER", "WK2", "WDC", { league: "wpl", age: 28 }),
  // Fast bowlers
  mk("WP039", "Renuka Singh", "India", "BOWLER", "FA1", "WRCB", { league: "wpl", bowlingStyle: "Right-arm medium", age: 29 }),
  mk("WP040", "Tara Norris", "England", "BOWLER", "FA1", "WDC", { league: "wpl", bowlingStyle: "Left-arm fast", age: 30 }),
  mk("WP041", "Meghna Singh", "India", "BOWLER", "FA1", "GG", { league: "wpl", bowlingStyle: "Right-arm medium", age: 28 }),
  mk("WP042", "Anjali Sarvani", "India", "BOWLER", "FA2", "UPW", { league: "wpl", bowlingStyle: "Right-arm medium", age: 27 }),
  mk("WP043", "Kate Cross", "England", "BOWLER", "FA2", "WMI", { league: "wpl", bowlingStyle: "Right-arm fast-medium", age: 33 }),
  mk("WP044", "Lauren Bell", "England", "BOWLER", "FA2", "WRCB", { league: "wpl", bowlingStyle: "Right-arm medium", age: 24 }),
  mk("WP045", "Shabnim Ismail", "South Africa", "BOWLER", "FA3", "WDC", { league: "wpl", bowlingStyle: "Right-arm fast", age: 35 }),
  mk("WP046", "Megan Schutt", "Australia", "BOWLER", "FA3", "GG", { league: "wpl", bowlingStyle: "Right-arm fast-medium", age: 32 }),
  mk("WP047", "Katherine Brunt", "England", "BOWLER", "FA3", "UPW", { league: "wpl", bowlingStyle: "Right-arm fast-medium", age: 39 }),
  // Spinners
  mk("WP048", "Rajeshwari Gayakwad", "India", "BOWLER", "SP1", "WRCB", { league: "wpl", bowlingStyle: "Left-arm spin", age: 33 }),
  mk("WP049", "Saika Ishaque", "India", "BOWLER", "SP1", "WMI", { league: "wpl", bowlingStyle: "Left-arm spin", age: 25 }),
  mk("WP050", "Sophie Ecclestone", "England", "BOWLER", "SP1", "UPW", { league: "wpl", bowlingStyle: "Left-arm spin" }),
  mk("WP051", "Kristie Gordon", "West Indies", "BOWLER", "SP2", "GG", { league: "wpl", bowlingStyle: "Off-spin", age: 23 }),
  mk("WP052", "Linsey Smith", "England", "BOWLER", "SP2", "WDC", { league: "wpl", bowlingStyle: "Left-arm spin", age: 24 }),
  // Uncapped pool
  mk("WP053", "Priya Mishra", "India", "BOWLER", "UFA1", "", { league: "wpl", isCapped: false, bowlingStyle: "Leg-spin", age: 22 }),
  mk("WP054", "Parshavi Chopra", "India", "BOWLER", "UFA1", "", { league: "wpl", isCapped: false, bowlingStyle: "Leg-spin", age: 21 }),
  mk("WP055", "Shweta Sehrawat", "India", "BATTER", "UBA1", "", { league: "wpl", isCapped: false, age: 20 }),
  mk("WP056", "G Kamalini", "India", "WICKETKEEPER", "UWK1", "", { league: "wpl", isCapped: false, age: 16 }),
  mk("WP057", "S Sajana", "India", "ALL-ROUNDER", "UAL1", "", { league: "wpl", isCapped: false, age: 24 }),
  mk("WP058", "Mannat Kashyap", "India", "BOWLER", "USP1", "", { league: "wpl", isCapped: false, bowlingStyle: "Left-arm spin", age: 20 }),
  mk("WP059", "Prerana Mithun", "India", "ALL-ROUNDER", "UAL1", "", { league: "wpl", isCapped: false, age: 23 }),
  mk("WP060", "Simran Shaikh", "India", "ALL-ROUNDER", "UAL1", "", { league: "wpl", isCapped: false, age: 22 }),
];

// Expand WPL to ~165 with additional official-style names
const WPL_EXTRA = [
  ["WP061", "Mansi Joshi", "India", "BOWLER", "FA2", "WRCB"],
  ["WP062", "Poonam Yadav", "India", "BOWLER", "SP2", "WDC"],
  ["WP063", "Ekta Bisht", "India", "BOWLER", "SP2", "GG"],
  ["WP064", "Arundhati Reddy", "India", "BOWLER", "FA3", "WMI"],
  ["WP065", "S Mandhana", "India", "BATTER", "BA2", "WRCB"],
  ["WP066", "Veda Krishnamurthy", "India", "BATTER", "BA3", "WDC"],
  ["WP067", "Harleen Deol", "India", "BATTER", "BA3", "WMI"],
  ["WP068", "Devika Vaidya", "India", "ALL-ROUNDER", "AL3", "GG"],
  ["WP069", "S Mandal", "India", "BOWLER", "FA3", "UPW"],
  ["WP070", "Anushka Sharma", "India", "BOWLER", "SP2", "WRCB"],
  ["WP071", "Georgia Adams", "England", "ALL-ROUNDER", "AL2", "WDC"],
  ["WP072", "Freya Kemp", "England", "ALL-ROUNDER", "AL2", "WRCB"],
  ["WP073", "Issy Wong", "England", "BOWLER", "FA2", "WMI"],
  ["WP074", "Charlie Dean", "England", "BOWLER", "SP2", "WDC"],
  ["WP075", "Maia Bouchier", "England", "BATTER", "BA2", "WRCB"],
  ["WP076", "Amy Jones", "England", "WICKETKEEPER", "WK2", "GG"],
  ["WP077", "Sophia Dunkley", "England", "ALL-ROUNDER", "AL3", "UPW"],
  ["WP078", "Danni Wyatt", "England", "BATTER", "BA2", "WMI"],
  ["WP079", "Danielle Gibson", "England", "ALL-ROUNDER", "AL3", "WDC"],
  ["WP080", "Emma Lamb", "England", "BATTER", "BA3", "WRCB"],
  ["WP081", "Alana King", "Australia", "BOWLER", "SP2", "GG"],
  ["WP082", "Annabel Sutherland", "Australia", "ALL-ROUNDER", "AL2", "WMI"],
  ["WP083", "Darcie Brown", "Australia", "BOWLER", "FA2", "WRCB"],
  ["WP084", "Ashleigh Gardner", "Australia", "ALL-ROUNDER", "AL1", "GG"],
  ["WP085", "Jess Jonassen", "Australia", "BOWLER", "SP1", "WDC"],
  ["WP086", "Tahlia Vlaeminck", "Australia", "BOWLER", "FA2", "UPW"],
  ["WP087", "Maitlan Brown", "Australia", "BOWLER", "FA3", "WMI"],
  ["WP088", "Elyse Villani", "Australia", "BATTER", "BA3", "GG"],
  ["WP089", "Nicola Carey", "Australia", "ALL-ROUNDER", "AL3", "WRCB"],
  ["WP090", "Heather Graham", "Australia", "ALL-ROUNDER", "AL3", "WDC"],
  ["WP091", "Chloe Tryon", "South Africa", "ALL-ROUNDER", "AL2", "UPW"],
  ["WP092", "Sune Luus", "South Africa", "ALL-ROUNDER", "AL3", "GG"],
  ["WP093", "Nonkululeko Mlaba", "South Africa", "BOWLER", "SP2", "WDC"],
  ["WP094", "Ayabonga Khaka", "South Africa", "BOWLER", "FA3", "WRCB"],
  ["WP095", "Lizelle Lee", "South Africa", "BATTER", "BA2", "WMI"],
  ["WP096", "Deandra Dottin", "West Indies", "ALL-ROUNDER", "AL1", "GG"],
  ["WP097", "Hayley Matthews", "West Indies", "ALL-ROUNDER", "AL1", "WMI"],
  ["WP098", "Shemaine Campbelle", "West Indies", "WICKETKEEPER", "WK2", "UPW"],
  ["WP099", "Shakera Selman", "West Indies", "BOWLER", "FA3", "WDC"],
  ["WP100", "Chinelle Henry", "West Indies", "ALL-ROUNDER", "AL3", "WRCB"],
  ["WP101", "Amelia Kerr", "New Zealand", "ALL-ROUNDER", "AL2", "GG"],
  ["WP102", "Lea Tahuhu", "New Zealand", "BOWLER", "FA3", "UPW"],
  ["WP103", "Gaby Lewis", "Ireland", "ALL-ROUNDER", "AL3", "WDC"],
  ["WP104", "Orla Prendergast", "Ireland", "ALL-ROUNDER", "AL3", "WRCB"],
  ["WP105", "Leah Paul", "Ireland", "ALL-ROUNDER", "AL3", "WMI"],
];

for (const [id, name, country, role, set, team] of WPL_EXTRA) {
  WPL_PLAYERS.push(mk(id, name, country, role, set, team, { league: "wpl" }));
}

// Fill to 165 with Indian uncapped
let wpIdx = 106;
while (WPL_PLAYERS.length < 165) {
  const sets = ["UBA1", "UAL1", "UFA1", "UWK1", "USP1"];
  const set = sets[wpIdx % sets.length];
  WPL_PLAYERS.push(mk(
    `WP${String(wpIdx).padStart(3, "0")}`,
    `Uncapped Player ${wpIdx - 105}`,
    "India",
    ["BATTER", "BOWLER", "ALL-ROUNDER", "WICKETKEEPER"][wpIdx % 4],
    set,
    "",
    { league: "wpl", isCapped: false, age: 20 + (wpIdx % 8) },
  ));
  wpIdx++;
}

// ─── The Hundred 2025 Men's pool ───
const HUNDRED_TEAMS = ["BPH", "LNS", "MNR", "NOS", "OVI", "SOB", "TRT", "WEF"];
const HUNDRED_SQUADS = {
  BPH: ["Will Jacks", "Moeen Ali", "Chris Woakes", "Ben Duckett", "Jacob Bethell", "Dan Mousley", "T Ngrabi", "Tom Helm", "Adam Milne", "Kyle Jamieson"],
  LNS: ["Zak Crawley", "Mark Wood", "Daryl Mitchell", "Olly Stone", "Dan Lawrence", "Liam Dawson", "Stephen Eskinazi", "Adam Rossington", "Nathan Sowter", "Rashid Khan"],
  MNR: ["Jos Buttler", "Phil Salt", "Andre Russell", "Kagiso Rabada", "Lockie Ferguson", "Tom Hartley", "Lammonby", "Richard Gleeson", "Calvin Harrison", "Sikandar Raza"],
  NOS: ["Harry Brook", "David Willey", "Matthew Potts", "Ben Raine", "Graham Clark", "Matthew Breetzke", "Matthew Hurst", "Callum Parkinson", "Adam Hose", "Lyon"],
  OVI: ["Sam Curran", "Tom Curran", "Will Jacks", "Jordan Cox", "Rashid Khan", "Danny Briggs", "Nathan Sowter", "Rory Burns", "Donovan Ferreira", "Topley"],
  SOB: ["James Vince", "Chris Jordan", "Jofra Archer", "Tymal Mills", "Mahela Jayawardene", "Leus du Plooy", "Craig Overton", "Jack Lintott", "George Garton", "Kyle Jamieson"],
  TRT: ["Joe Root", "Rashid Khan", "David Warner", "Lewis Gregory", "Samit Patel", "Luke Wood", "Tom Kohler-Cadmore", "Sean Abbott", "Dawson", "Ferguson"],
  WEF: ["Tom Banton", "David Miller", "Glenn Phillips", "Shamar Joseph", "Luke Fletcher", "Dan Douthwaite", "Ferguson", "Wright", "Hain", "Jamie Overton"],
};

const HUNDRED_PLAYERS = [];
let hpIdx = 1;

function addHundred(name, country, role, set, team, opts = {}) {
  HUNDRED_PLAYERS.push(mk(
    `HP${String(hpIdx++).padStart(3, "0")}`,
    name,
    country,
    role,
    set,
    team,
    { league: "hundred", ...opts },
  ));
}

// Marquee internationals
const HUNDRED_MARQUEE = [
  ["Jos Buttler", "England", "WICKETKEEPER", "MNR"],
  ["Rashid Khan", "Afghanistan", "BOWLER", "LNS"],
  ["Kagiso Rabada", "South Africa", "BOWLER", "MNR"],
  ["Jofra Archer", "England", "BOWLER", "SOB"],
  ["David Warner", "Australia", "BATTER", "TRT"],
  ["Andre Russell", "West Indies", "ALL-ROUNDER", "MNR"],
  ["Sam Curran", "England", "ALL-ROUNDER", "OVI"],
  ["Joe Root", "England", "BATTER", "TRT"],
  ["Harry Brook", "England", "BATTER", "NOS"],
  ["Will Jacks", "England", "ALL-ROUNDER", "BPH"],
  ["Phil Salt", "England", "WICKETKEEPER", "MNR"],
  ["Moeen Ali", "England", "ALL-ROUNDER", "BPH"],
  ["Mark Wood", "England", "BOWLER", "LNS"],
  ["Chris Jordan", "England", "BOWLER", "SOB"],
  ["Lockie Ferguson", "New Zealand", "BOWLER", "MNR"],
  ["Glenn Phillips", "New Zealand", "ALL-ROUNDER", "WEF"],
  ["David Miller", "South Africa", "BATTER", "WEF"],
  ["Jamie Overton", "England", "ALL-ROUNDER", "WEF"],
  ["Daryl Mitchell", "New Zealand", "ALL-ROUNDER", "LNS"],
  ["Ben Duckett", "England", "BATTER", "BPH"],
];

for (const [name, country, role, team] of HUNDRED_MARQUEE) {
  addHundred(name, country, role, "M1", team);
}

// Squad players from each franchise
for (const [teamId, names] of Object.entries(HUNDRED_SQUADS)) {
  for (const name of names) {
    if (HUNDRED_PLAYERS.some((p) => p.name === name)) continue;
    const role = name.includes("Woakes") || name.includes("Rabada") ? "BOWLER" : "ALL-ROUNDER";
    addHundred(name, name === "Rashid Khan" ? "Afghanistan" : "England", role, "BA2", teamId);
  }
}

// Additional English county / international pool
const HUNDRED_EXTRA = [
  ["Tom Banton", "England", "BATTER", "WEF"],
  ["James Vince", "England", "BATTER", "SOB"],
  ["Zak Crawley", "England", "BATTER", "LNS"],
  ["Liam Livingstone", "England", "ALL-ROUNDER", "BPH"],
  ["Rehan Ahmed", "England", "BOWLER", "OVI"],
  ["Jamie Overton", "England", "ALL-ROUNDER", "SOB"],
  ["Matt Parkinson", "England", "BOWLER", "NOS"],
  ["Adil Rashid", "England", "BOWLER", "NOS"],
  ["Jonny Bairstow", "England", "WICKETKEEPER", "TRT"],
  ["Jason Roy", "England", "BATTER", "OVI"],
  ["Eoin Morgan", "England", "BATTER", "LNS"],
  ["Jonny Bairstow", "England", "WICKETKEEPER", "WEF"],
  ["Lewis Gregory", "England", "ALL-ROUNDER", "TRT"],
  ["Sean Abbott", "Australia", "ALL-ROUNDER", "TRT"],
  ["Adam Milne", "New Zealand", "BOWLER", "BPH"],
  ["Kyle Jamieson", "New Zealand", "BOWLER", "SOB"],
  ["Shamar Joseph", "West Indies", "BOWLER", "WEF"],
  ["Sikandar Raza", "Zimbabwe", "ALL-ROUNDER", "MNR"],
  ["Mahela Jayawardene", "Sri Lanka", "BATTER", "SOB"],
  ["Leus du Plooy", "South Africa", "BATTER", "SOB"],
];

for (const [name, country, role, team] of HUNDRED_EXTRA) {
  if (HUNDRED_PLAYERS.some((p) => p.name === name)) continue;
  addHundred(name, country, role, "AL2", team);
}

// Fill to 192
while (HUNDRED_PLAYERS.length < 192) {
  const team = HUNDRED_TEAMS[hpIdx % HUNDRED_TEAMS.length];
  const sets = ["BA3", "FA3", "SP2", "UBA1", "UAL1"];
  addHundred(
    `Pool Player ${HUNDRED_PLAYERS.length + 1}`,
    "England",
    ["BATTER", "BOWLER", "ALL-ROUNDER"][hpIdx % 3],
    sets[hpIdx % sets.length],
    team,
    { isCapped: sets[hpIdx % sets.length].startsWith("U") ? false : true },
  );
}

function writePool(dir, filename, players) {
  mkdirSync(dir, { recursive: true });
  const payload = { categories: CATEGORIES, players };
  writeFileSync(join(dir, filename), JSON.stringify(payload, null, 2));
  console.log(`✓ ${filename}: ${players.length} players`);
}

function buildLeaguePool(prefix, leagueKey, teams, marquee, squads, extras, targetCount) {
  const players = [];
  let idx = 1;
  const seen = new Set();

  function add(name, country, role, set, team, opts = {}) {
    if (seen.has(name)) return;
    seen.add(name);
    players.push(mk(
      `${prefix}${String(idx++).padStart(3, "0")}`,
      name,
      country,
      role,
      set,
      team,
      { league: leagueKey, ...opts },
    ));
  }

  for (const [name, country, role, team] of marquee) {
    add(name, country, role, "M1", team);
  }

  for (const [teamId, names] of Object.entries(squads)) {
    for (const name of names) {
      if (seen.has(name)) continue;
      add(name, "Australia", "ALL-ROUNDER", "BA2", teamId);
    }
  }

  for (const [name, country, role, team] of extras) {
    add(name, country, role, "AL2", team);
  }

  const sets = ["BA3", "FA3", "SP2", "UBA1", "UAL1", "UWK1"];
  while (players.length < targetCount) {
    const team = teams[players.length % teams.length];
    const set = sets[players.length % sets.length];
    add(
      `${leagueKey.toUpperCase()} Pool ${players.length + 1}`,
      leagueKey === "sa20" ? "South Africa" : "Australia",
      ["BATTER", "BOWLER", "ALL-ROUNDER", "WICKETKEEPER"][players.length % 4],
      set,
      team,
      { isCapped: !set.startsWith("U"), age: 22 + (players.length % 10) },
    );
  }

  return players;
}

// ─── SA20 2025 pool ───
const SA20_TEAMS = ["JSK", "SEC", "MICT", "DSG", "PR", "PC"];
const SA20_MARQUEE = [
  ["Rashid Khan", "Afghanistan", "BOWLER", "MICT"],
  ["Kagiso Rabada", "South Africa", "BOWLER", "MICT"],
  ["Quinton de Kock", "South Africa", "WICKETKEEPER", "DSG"],
  ["David Miller", "South Africa", "BATTER", "JSK"],
  ["Marco Jansen", "South Africa", "ALL-ROUNDER", "SEC"],
  ["Tristan Stubbs", "South Africa", "BATTER", "SEC"],
  ["Dewald Brevis", "South Africa", "BATTER", "MICT"],
  ["Anrich Nortje", "South Africa", "BOWLER", "PR"],
  ["Aiden Markram", "South Africa", "ALL-ROUNDER", "SEC"],
  ["Heinrich Klaasen", "South Africa", "WICKETKEEPER", "SEC"],
  ["Lungi Ngidi", "South Africa", "BOWLER", "DSG"],
  ["Ryan Rickelton", "South Africa", "WICKETKEEPER", "JSK"],
  ["Rassie van der Dussen", "South Africa", "BATTER", "PR"],
  ["Adam Zampa", "Australia", "BOWLER", "PR"],
  ["Jason Roy", "England", "BATTER", "PC"],
  ["Faf du Plessis", "South Africa", "BATTER", "JSK"],
  ["Will Jacks", "England", "ALL-ROUNDER", "MICT"],
  ["Sam Curran", "England", "ALL-ROUNDER", "PR"],
  ["Chris Morris", "South Africa", "ALL-ROUNDER", "PC"],
  ["Kyle Verreynne", "South Africa", "WICKETKEEPER", "PC"],
];
const SA20_SQUADS = {
  JSK: ["Faf du Plessis", "David Miller", "Ryan Rickelton", "George Linde", "Moeen Ali", "Leus du Plooy", "Nandre Burger", "Kyle Simmonds", "Mitchell van Buuren", "Lutho Sipamla"],
  SEC: ["Aiden Markram", "Heinrich Klaasen", "Marco Jansen", "Tristan Stubbs", "Adam Rossington", "Tom Curran", "Craig Overton", "Ottis Gibson", "Daniel Worrall", "Patrick Kruger"],
  MICT: ["Rashid Khan", "Kagiso Rabada", "Dewald Brevis", "Will Jacks", "Ben Stokes", "Tim David", "George Linde", "Olly Stone", "Duan Jansen", "Kyle Verreynne"],
  DSG: ["Quinton de Kock", "Lungi Ngidi", "Jon-Jon Smuts", "Wiaan Mulder", "Matthew Breetzke", "Naveen-ul-Haq", "Jason Holder", "Prenelan Subrayen", "Chris McKenzie", "Junior Dala"],
  PR: ["Anrich Nortje", "Rassie van der Dussen", "Adam Zampa", "Sam Curran", "David Wiese", "Evan Jones", "Bjorn Fortuin", "Mitchell Owen", "Leroy Modiselle", "Eoin Lewis"],
  PC: ["Jason Roy", "Chris Morris", "Kyle Verreynne", "Wayne Parnell", "Will Jacks", "Cameron Delport", "Senuran Muthusamy", "Eathan Bosch", "Joshua Little", "Shane Dadswell"],
};
const SA20_EXTRA = [
  ["Ben Stokes", "England", "ALL-ROUNDER", "MICT"],
  ["Tim David", "Australia", "BATTER", "MICT"],
  ["Jason Holder", "West Indies", "ALL-ROUNDER", "DSG"],
  ["Naveen-ul-Haq", "Afghanistan", "BOWLER", "DSG"],
  ["Moeen Ali", "England", "ALL-ROUNDER", "JSK"],
  ["George Linde", "South Africa", "ALL-ROUNDER", "JSK"],
  ["Tom Curran", "England", "ALL-ROUNDER", "SEC"],
  ["David Wiese", "South Africa", "ALL-ROUNDER", "PR"],
  ["Wayne Parnell", "South Africa", "BOWLER", "PC"],
  ["Leus du Plooy", "South Africa", "BATTER", "JSK"],
];
const SA20_PLAYERS = buildLeaguePool("SP", "sa20", SA20_TEAMS, SA20_MARQUEE, SA20_SQUADS, SA20_EXTRA, 120);

// ─── BBL 2025 pool ───
const BBL_TEAMS = ["BH", "HH", "MS", "PS", "SS", "AS", "MR", "ST"];
const BBL_MARQUEE = [
  ["Travis Head", "Australia", "BATTER", "AS"],
  ["Steve Smith", "Australia", "BATTER", "SS"],
  ["Glenn Maxwell", "Australia", "ALL-ROUNDER", "MS"],
  ["Mitchell Starc", "Australia", "BOWLER", "SS"],
  ["Josh Inglis", "Australia", "WICKETKEEPER", "PS"],
  ["Matthew Wade", "Australia", "WICKETKEEPER", "HH"],
  ["Marcus Stoinis", "Australia", "ALL-ROUNDER", "PS"],
  ["Aaron Finch", "Australia", "BATTER", "ST"],
  ["David Warner", "Australia", "BATTER", "SS"],
  ["Pat Cummins", "Australia", "BOWLER", "SS"],
  ["Mitchell Marsh", "Australia", "ALL-ROUNDER", "PS"],
  ["Adam Zampa", "Australia", "BOWLER", "MR"],
  ["Chris Lynn", "Australia", "BATTER", "MR"],
  ["Kane Richardson", "Australia", "BOWLER", "AS"],
  ["Jhye Richardson", "Australia", "BOWLER", "PS"],
  ["Sean Abbott", "Australia", "ALL-ROUNDER", "SS"],
  ["Ashton Agar", "Australia", "ALL-ROUNDER", "PS"],
  ["Tim David", "Australia", "BATTER", "HH"],
  ["Nathan Ellis", "Australia", "BOWLER", "HH"],
  ["Will Jacks", "England", "ALL-ROUNDER", "MR"],
];
const BBL_SQUADS = {
  BH: ["Travis Head", "Sam Heazlett", "Michael Neser", "Xavier Bartlett", "Spencer Johnson", "Jimmy Peirson", "Matt Renshaw", "Tom Banton", "Mark Steketee", "Lachie Pfeffer"],
  HH: ["Matthew Wade", "Tim David", "Nathan Ellis", "Riley Meredith", "Caleb Jewell", "Macalister Wright", "Nathan McAndrew", "Peter Siddle", "Chris Jordan", "Colin Ackermann"],
  MS: ["Glenn Maxwell", "Marcus Stoinis", "Adam Zampa", "Hilton Cartwright", "Brody Couch", "Joel Davies", "Tom Rogers", "Dan Lawrence", "Mark Steketee", "Beau Webster"],
  PS: ["Josh Inglis", "Mitchell Marsh", "Marcus Stoinis", "Ashton Agar", "Jhye Richardson", "Jason Behrendorff", "Ashton Turner", "Cooper Connolly", "Lance Morris", "Nick Hobson"],
  SS: ["Steve Smith", "David Warner", "Mitchell Starc", "Pat Cummins", "Sean Abbott", "Moises Henriques", "James Vince", "Ben Dwarshuis", "Jackson Bird", "Hayden Kerr"],
  AS: ["Travis Head", "Kane Richardson", "Alex Carey", "Jon Wells", "Henry Thornton", "Matt Renshaw", "Dwayne Bravo", "Harry Conway", "Ben Manenti", "Jamie Overton"],
  MR: ["Will Jacks", "Adam Zampa", "Chris Lynn", "Aaron Finch", "Andre Russell", "Tom Rogers", "Mujeeb Ur Rahman", "Zak Evans", "Will Sutherland", "Sam Harper"],
  ST: ["Aaron Finch", "Chris Green", "Daniel Sams", "Chris Jordan", "Jason Sangha", "Baxter Holt", "Nathan McAndrew", "Tanveer Sangha", "Chris Tremain", "Matthew Gilkes"],
};
const BBL_EXTRA = [
  ["Alex Carey", "Australia", "WICKETKEEPER", "AS"],
  ["Moises Henriques", "Australia", "ALL-ROUNDER", "SS"],
  ["James Vince", "England", "BATTER", "SS"],
  ["Andre Russell", "West Indies", "ALL-ROUNDER", "MR"],
  ["Mujeeb Ur Rahman", "Afghanistan", "BOWLER", "MR"],
  ["Chris Jordan", "England", "BOWLER", "HH"],
  ["Dan Lawrence", "England", "BATTER", "MS"],
  ["Tom Banton", "England", "BATTER", "BH"],
  ["Chris Green", "Australia", "ALL-ROUNDER", "ST"],
  ["Tanveer Sangha", "Australia", "BOWLER", "ST"],
];
const BBL_PLAYERS = buildLeaguePool("BP", "bbl", BBL_TEAMS, BBL_MARQUEE, BBL_SQUADS, BBL_EXTRA, 150);

// ─── WBBL 2025 pool ───
const WBBL_TEAMS = ["BH-W", "HH-W", "MS-W", "PS-W", "SS-W", "AS-W", "MR-W", "ST-W"];
const WBBL_MARQUEE = [
  ["Alyssa Healy", "Australia", "WICKETKEEPER", "SS-W"],
  ["Meg Lanning", "Australia", "BATTER", "PS-W"],
  ["Ellyse Perry", "Australia", "ALL-ROUNDER", "SS-W"],
  ["Beth Mooney", "Australia", "WICKETKEEPER", "PS-W"],
  ["Ash Gardner", "Australia", "ALL-ROUNDER", "MR-W"],
  ["Sophie Ecclestone", "England", "BOWLER", "MS-W"],
  ["Nat Sciver-Brunt", "England", "ALL-ROUNDER", "SS-W"],
  ["Smriti Mandhana", "India", "BATTER", "AS-W"],
  ["Hayley Matthews", "West Indies", "ALL-ROUNDER", "HH-W"],
  ["Amelia Kerr", "New Zealand", "ALL-ROUNDER", "BH-W"],
  ["Tahlia McGrath", "Australia", "ALL-ROUNDER", "AS-W"],
  ["Phoebe Litchfield", "Australia", "BATTER", "HH-W"],
  ["Annabel Sutherland", "Australia", "ALL-ROUNDER", "MR-W"],
  ["Georgia Wareham", "Australia", "ALL-ROUNDER", "ST-W"],
  ["Marizanne Kapp", "South Africa", "ALL-ROUNDER", "PS-W"],
  ["Laura Wolvaardt", "South Africa", "BATTER", "PS-W"],
  ["Heather Knight", "England", "ALL-ROUNDER", "BH-W"],
  ["Deepti Sharma", "India", "ALL-ROUNDER", "MR-W"],
  ["Richa Ghosh", "India", "WICKETKEEPER", "AS-W"],
  ["Grace Harris", "Australia", "ALL-ROUNDER", "BH-W"],
];
const WBBL_SQUADS = {
  "BH-W": ["Amelia Kerr", "Heather Knight", "Grace Harris", "Jess Jonassen", "Charlotte Coe", "Nikola Carey", "Laura Harris", "Molly Strano", "Georgia Redmayne", "Anneke Bosch"],
  "HH-W": ["Hayley Matthews", "Phoebe Litchfield", "Nicola Carey", "Heather Graham", "Molly Strano", "Rachel Haynes", "Elyse Villani", "Amy Smith", "Maitlan Brown", "Chloe Pipar"],
  "MS-W": ["Sophie Ecclestone", "Meg Lanning", "Annabel Sutherland", "Kim Garth", "Alice Capsey", "Erin Burns", "Nicola Hancock", "Paris Cotter", "Olivia Davies", "Lucy Hamilton"],
  "PS-W": ["Meg Lanning", "Beth Mooney", "Marizanne Kapp", "Laura Wolvaardt", "Sophie Devine", "Amy Edgar", "Chloe Pipar", "Alana King", "Lilly Mills", "Taneale Peschel"],
  "SS-W": ["Alyssa Healy", "Ellyse Perry", "Nat Sciver-Brunt", "Ashleigh Gardner", "Erin Burns", "Kate Porter", "Lauren Cheatle", "Hayley Silver-Holmes", "Maitlan Brown", "Kate Porter"],
  "AS-W": ["Smriti Mandhana", "Tahlia McGrath", "Richa Ghosh", "Darcie Brown", "Bridget Patterson", "Amanda-Jade Wellington", "Annie O'Neil", "Ella Wilson", "Megan Schutt", "Madeline Penna"],
  "MR-W": ["Ash Gardner", "Annabel Sutherland", "Deepti Sharma", "Hayley Matthews", "Tammy Beaumont", "Erica Gibson", "Georgia Wareham", "Carly Leeson", "Nicola Hancock", "Emma Manix-Geeves"],
  "ST-W": ["Georgia Wareham", "Heather Graham", "Sammy-Jo Johnson", "Hannah Darlington", "Anika Learoyd", "Elyse Villani", "Lauren Cheatle", "Kate Porter", "Olivia Davies", "Phoebe Litchfield"],
};
const WBBL_EXTRA = [
  ["Sophie Devine", "New Zealand", "ALL-ROUNDER", "PS-W"],
  ["Jess Jonassen", "Australia", "BOWLER", "BH-W"],
  ["Megan Schutt", "Australia", "BOWLER", "AS-W"],
  ["Amanda-Jade Wellington", "Australia", "BOWLER", "AS-W"],
  ["Kim Garth", "Ireland", "ALL-ROUNDER", "MS-W"],
  ["Alice Capsey", "England", "ALL-ROUNDER", "MS-W"],
  ["Tammy Beaumont", "England", "WICKETKEEPER", "MR-W"],
  ["Elyse Villani", "Australia", "BATTER", "HH-W"],
  ["Lauren Cheatle", "Australia", "BOWLER", "SS-W"],
  ["Darcie Brown", "Australia", "BOWLER", "AS-W"],
];
const WBBL_PLAYERS = buildLeaguePool("WB", "wbbl", WBBL_TEAMS, WBBL_MARQUEE, WBBL_SQUADS, WBBL_EXTRA, 120);

writePool(join(DATA, "leagues", "wpl"), "players.json", WPL_PLAYERS);
writePool(join(DATA, "leagues", "hundred"), "players.json", HUNDRED_PLAYERS);
writePool(join(DATA, "leagues", "sa20"), "players.json", SA20_PLAYERS);
writePool(join(DATA, "leagues", "bbl"), "players.json", BBL_PLAYERS);
writePool(join(DATA, "leagues", "wbbl"), "players.json", WBBL_PLAYERS);
console.log("\nDone.");
