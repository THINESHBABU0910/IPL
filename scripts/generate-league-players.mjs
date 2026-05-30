#!/usr/bin/env node
/**
 * Generate official-style player pools for WPL and The Hundred.
 * Usage: node scripts/generate-league-players.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { isPlayerOverseasForPool } from "./league-overseas.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dir, "..", "src", "data");

const CATEGORIES = [
  { id: "marquee", name: "Marquee Players", sets: ["M1", "M2", "M3"] },
  { id: "batters", name: "Batters", sets: ["BA1", "BA2", "BA3", "BA4"] },
  { id: "allrounders", name: "All-Rounders", sets: ["AL1", "AL2", "AL3", "AL4"] },
  { id: "wicketkeepers", name: "Wicket-Keepers", sets: ["WK1", "WK2", "WK3"] },
  { id: "fast_bowlers", name: "Fast Bowlers", sets: ["FA1", "FA2", "FA3", "FA4"] },
  { id: "spinners", name: "Spin Bowlers", sets: ["SP1", "SP2", "SP3"] },
  { id: "uncapped", name: "Uncapped", sets: ["UBA1", "UBA2", "UAL1", "UAL2", "UWK1", "UWK2", "UFA1", "UFA2", "USP1", "USP2"] },
];

function mk(id, name, country, role, set, previousTeam, opts = {}) {
  const league = opts.league || "ipl";
  const isOverseas = opts.isOverseas ?? isPlayerOverseasForPool(country, league);
  const isCapped = opts.isCapped !== false;
  const baseMap = {
    M1: 200, M2: 200, M3: 200, BA1: 150, BA2: 75, BA3: 50, BA4: 50,
    AL1: 150, AL2: 75, AL3: 50, AL4: 50, WK1: 150, WK2: 75, WK3: 50,
    FA1: 150, FA2: 75, FA3: 50, FA4: 50, SP1: 150, SP2: 75, SP3: 50,
  };
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

// Additional real WPL uncapped / squad names
const WPL_UNCAPPED_REAL = [
  ["WP106", "G Kamalini", "India", "WICKETKEEPER", "UWK1"], ["WP107", "Shweta Sehrawat", "India", "BATTER", "UBA1"],
  ["WP108", "Parshavi Chopra", "India", "BOWLER", "USP1"], ["WP109", "Mannat Kashyap", "India", "BOWLER", "USP1"],
  ["WP110", "S Sajana", "India", "ALL-ROUNDER", "UAL1"], ["WP111", "Prerana Mithun", "India", "ALL-ROUNDER", "UAL1"],
  ["WP112", "Simran Shaikh", "India", "ALL-ROUNDER", "UAL1"], ["WP113", "Priya Mishra", "India", "BOWLER", "UFA1"],
  ["WP114", "Sayali Satghare", "India", "BOWLER", "UFA1"], ["WP115", "Bhagya Shree Chavan", "India", "BATTER", "UBA1"],
];
for (const [id, name, country, role, set] of WPL_UNCAPPED_REAL) {
  if (!WPL_PLAYERS.some((p) => p.name === name)) {
    WPL_PLAYERS.push(mk(id, name, country, role, set, "", { league: "wpl", isCapped: set.startsWith("U") ? false : true }));
  }
}

const NAME_ALIASES = {
  "natalie sciver-brunt": "Nat Sciver-Brunt",
  "s mandhana": "Smriti Mandhana",
  "ash gardner": "Ashleigh Gardner",
  "ashleigh gardner": "Ash Gardner",
};

function normPlayerName(name) {
  const k = name.toLowerCase().replace(/\s+/g, " ").trim();
  return NAME_ALIASES[k] || name;
}

function dedupeAndReindex(players, prefix, league) {
  const seen = new Set();
  const out = [];
  for (const p of players) {
    const name = normPlayerName(p.name);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    const set = p.set;
    const isCapped = p.isCapped !== false && !set.startsWith("U");
    out.push(mk(
      `${prefix}${String(out.length + 1).padStart(3, "0")}`,
      name,
      p.country,
      p.role,
      set,
      p.previousTeam || "",
      { league, isCapped, age: p.age, battingStyle: p.battingStyle, bowlingStyle: p.bowlingStyle },
    ));
  }
  return out;
}

// Full WPL 2024–2026 franchise squads (real names only)
const WPL_SQUAD_ROSTER = [
  ["WMI", "Nat Sciver-Brunt", "England", "ALL-ROUNDER"], ["WMI", "Harmanpreet Kaur", "India", "ALL-ROUNDER"],
  ["WMI", "Amelia Kerr", "New Zealand", "ALL-ROUNDER"], ["WMI", "Hayley Matthews", "West Indies", "ALL-ROUNDER"],
  ["WMI", "Yastika Bhatia", "India", "WICKETKEEPER"], ["WMI", "Jemimah Rodrigues", "India", "BATTER"],
  ["WMI", "Issy Wong", "England", "BOWLER"], ["WMI", "Kate Cross", "England", "BOWLER"],
  ["WMI", "Saika Ishaque", "India", "BOWLER"], ["WMI", "Poonam Yadav", "India", "BOWLER"],
  ["WMI", "Arundhati Reddy", "India", "BOWLER"], ["WMI", "Maitlan Brown", "Australia", "BOWLER"],
  ["WMI", "Leah Paul", "Ireland", "ALL-ROUNDER"], ["WMI", "Lizelle Lee", "South Africa", "BATTER"],
  ["WMI", "Parshavi Chopra", "India", "BOWLER"], ["WMI", "Mannat Kashyap", "India", "BOWLER"],
  ["WRCB", "Smriti Mandhana", "India", "BATTER"], ["WRCB", "Ellyse Perry", "Australia", "ALL-ROUNDER"],
  ["WRCB", "Richa Ghosh", "India", "WICKETKEEPER"], ["WRCB", "Renuka Singh", "India", "BOWLER"],
  ["WRCB", "Rajeshwari Gayakwad", "India", "BOWLER"], ["WRCB", "Lauren Bell", "England", "BOWLER"],
  ["WRCB", "Mansi Joshi", "India", "BOWLER"], ["WRCB", "Ekta Bisht", "India", "BOWLER"],
  ["WRCB", "Deepti Sharma", "India", "ALL-ROUNDER"], ["WRCB", "Georgia Adams", "England", "ALL-ROUNDER"],
  ["WRCB", "Maia Bouchier", "England", "BATTER"], ["WRCB", "Freya Kemp", "England", "ALL-ROUNDER"],
  ["WRCB", "Emma Lamb", "England", "BATTER"], ["WRCB", "Shweta Sehrawat", "India", "BATTER"],
  ["WRCB", "Simran Shaikh", "India", "ALL-ROUNDER"], ["WRCB", "Sayali Satghare", "India", "BOWLER"],
  ["WDC", "Meg Lanning", "Australia", "BATTER"], ["WDC", "Marizanne Kapp", "South Africa", "ALL-ROUNDER"],
  ["WDC", "Shafali Verma", "India", "BATTER"], ["WDC", "Radha Yadav", "India", "ALL-ROUNDER"],
  ["WDC", "Alice Capsey", "England", "ALL-ROUNDER"], ["WDC", "Jess Jonassen", "Australia", "BOWLER"],
  ["WDC", "Shabnim Ismail", "South Africa", "BOWLER"], ["WDC", "Poonam Yadav", "India", "BOWLER"],
  ["WDC", "Charlie Dean", "England", "BOWLER"], ["WDC", "Linsey Smith", "England", "BOWLER"],
  ["WDC", "Taniya Bhatia", "India", "WICKETKEEPER"], ["WDC", "Priya Punia", "India", "WICKETKEEPER"],
  ["WDC", "Tara Norris", "England", "BOWLER"], ["WDC", "Veda Krishnamurthy", "India", "BATTER"],
  ["WDC", "Orla Prendergast", "Ireland", "ALL-ROUNDER"], ["WDC", "Gaby Lewis", "Ireland", "ALL-ROUNDER"],
  ["GG", "Ash Gardner", "Australia", "ALL-ROUNDER"], ["GG", "Beth Mooney", "Australia", "WICKETKEEPER"],
  ["GG", "Laura Wolvaardt", "South Africa", "BATTER"], ["GG", "Deepti Sharma", "India", "ALL-ROUNDER"],
  ["GG", "Sneh Rana", "India", "ALL-ROUNDER"], ["GG", "Shikha Pandey", "India", "ALL-ROUNDER"],
  ["GG", "Meghna Singh", "India", "BOWLER"], ["GG", "Megan Schutt", "Australia", "BOWLER"],
  ["GG", "Alana King", "Australia", "BOWLER"], ["GG", "Kristie Gordon", "West Indies", "BOWLER"],
  ["GG", "Deandra Dottin", "West Indies", "ALL-ROUNDER"], ["GG", "Chamari Athapaththu", "Sri Lanka", "ALL-ROUNDER"],
  ["GG", "Sophia Dunkley", "England", "ALL-ROUNDER"], ["GG", "Amy Jones", "England", "WICKETKEEPER"],
  ["GG", "Sune Luus", "South Africa", "ALL-ROUNDER"], ["GG", "Nonkululeko Mlaba", "South Africa", "BOWLER"],
  ["UPW", "Sophie Ecclestone", "England", "BOWLER"], ["UPW", "Alyssa Healy", "Australia", "WICKETKEEPER"],
  ["UPW", "Deepti Sharma", "India", "ALL-ROUNDER"], ["UPW", "Tahlia McGrath", "Australia", "ALL-ROUNDER"],
  ["UPW", "Grace Harris", "Australia", "ALL-ROUNDER"], ["UPW", "Anjali Sarvani", "India", "BOWLER"],
  ["UPW", "Katherine Brunt", "England", "BOWLER"], ["UPW", "Tahlia Vlaeminck", "Australia", "BOWLER"],
  ["UPW", "Chloe Tryon", "South Africa", "ALL-ROUNDER"], ["UPW", "Ayabonga Khaka", "South Africa", "BOWLER"],
  ["UPW", "Shemaine Campbelle", "West Indies", "WICKETKEEPER"], ["UPW", "Shakera Selman", "West Indies", "BOWLER"],
  ["UPW", "Lea Tahuhu", "New Zealand", "BOWLER"], ["UPW", "Harleen Deol", "India", "BATTER"],
  ["UPW", "Devika Vaidya", "India", "ALL-ROUNDER"], ["UPW", "G Kamalini", "India", "WICKETKEEPER"],
  ["UPW", "S Sajana", "India", "ALL-ROUNDER"], ["UPW", "Prerana Mithun", "India", "ALL-ROUNDER"],
  ["UPW", "Priya Mishra", "India", "BOWLER"], ["UPW", "Bhagya Shree Chavan", "India", "BATTER"],
  ["UPW", "Phoebe Litchfield", "Australia", "BATTER"], ["UPW", "Nicola Carey", "Australia", "ALL-ROUNDER"],
  ["UPW", "Heather Graham", "Australia", "ALL-ROUNDER"], ["UPW", "Annabel Sutherland", "Australia", "ALL-ROUNDER"],
  ["UPW", "Danni Wyatt", "England", "BATTER"], ["UPW", "Danielle Gibson", "England", "ALL-ROUNDER"],
  ["UPW", "Kim Garth", "Ireland", "ALL-ROUNDER"], ["UPW", "Heather Knight", "England", "ALL-ROUNDER"],
  ["UPW", "Elyse Villani", "Australia", "BATTER"], ["UPW", "Chinelle Henry", "West Indies", "ALL-ROUNDER"],
];

const SET_BY_ROLE = { BATTER: "BA2", "ALL-ROUNDER": "AL2", WICKETKEEPER: "WK2", BOWLER: "FA2" };
for (const [team, name, country, role] of WPL_SQUAD_ROSTER) {
  if (!WPL_PLAYERS.some((p) => normPlayerName(p.name).toLowerCase() === normPlayerName(name).toLowerCase())) {
    WPL_PLAYERS.push(mk(`WXT${WPL_PLAYERS.length}`, name, country, role, SET_BY_ROLE[role] || "AL2", team, { league: "wpl" }));
  }
}

// WPL auction / domestic pool (2023–2026 participants and eligible players)
const WPL_EXTENDED_POOL = [
  ["Anjali Sarvani", "India", "BOWLER", "UPW"], ["Asha Sobhana", "India", "ALL-ROUNDER", "WRCB"],
  ["Anushka Sharma", "India", "BOWLER", "WRCB"], ["Anusha Bareddy", "India", "BOWLER", "WDC"],
  ["Anusha Kumari", "India", "BOWLER", "GG"], ["Anusha Singh", "India", "BOWLER", "WMI"],
  ["Anushka Sen", "India", "BATTER", "UPW"], ["Anjali Ved", "India", "BOWLER", "WDC"],
  ["Anjum Chopra", "India", "BATTER", "GG"], ["Anju Jain", "India", "WICKETKEEPER", "WMI"],
  ["Ankita Konwar", "India", "BATTER", "WRCB"], ["Ankita Sharma", "India", "BOWLER", "GG"],
  ["Anuja Patil", "India", "BOWLER", "UPW"], ["Anuja Jadhav", "India", "BATTER", "WDC"],
  ["Aparna Mondal", "India", "BOWLER", "WMI"], ["Aparna Rajbhar", "India", "BOWLER", "GG"],
  ["Arundhati Reddy", "India", "BOWLER", "WMI"], ["Bhagya Shree Chavan", "India", "BATTER", "UPW"],
  ["Bhulan Hansdah", "India", "BOWLER", "WDC"], ["D Hemalatha", "India", "ALL-ROUNDER", "GG"],
  ["Dayalan Hemalatha", "India", "ALL-ROUNDER", "GG"], ["Deepti Sharma", "India", "ALL-ROUNDER", "UPW"],
  ["Devika Vaidya", "India", "ALL-ROUNDER", "UPW"], ["Ekta Bisht", "India", "BOWLER", "WRCB"],
  ["G Kamalini", "India", "WICKETKEEPER", "UPW"], ["Geeta Seshu", "India", "BATTER", "WDC"],
  ["Gouher Sultana", "India", "BOWLER", "WMI"], ["Harleen Deol", "India", "BATTER", "UPW"],
  ["Hemalatha Dayalan", "India", "ALL-ROUNDER", "GG"], ["Jasia Akhtar", "India", "BATTER", "WDC"],
  ["Jemimah Rodrigues", "India", "BATTER", "WMI"], ["K Prathyoosha", "India", "WICKETKEEPER", "GG"],
  ["Kanika Ahuja", "India", "ALL-ROUNDER", "WRCB"], ["Kanika Ahuja", "India", "ALL-ROUNDER", "WRCB"],
  ["Laxmi Yadav", "India", "BOWLER", "WDC"], ["Madhuri Khatri", "India", "BATTER", "WMI"],
  ["Mamatha Maben", "India", "ALL-ROUNDER", "GG"], ["Mannat Kashyap", "India", "BOWLER", "UPW"],
  ["Mansi Joshi", "India", "BOWLER", "WRCB"], ["Meghna Singh", "India", "BOWLER", "GG"],
  ["Minnu Mani", "India", "ALL-ROUNDER", "WDC"], ["Mona Meshram", "India", "BATTER", "WMI"],
  ["Nuzhat Parween", "India", "WICKETKEEPER", "WDC"], ["Parshavi Chopra", "India", "BOWLER", "UPW"],
  ["Pooja Vastrakar", "India", "ALL-ROUNDER", "WMI"], ["Poonam Raut", "India", "BATTER", "GG"],
  ["Poonam Yadav", "India", "BOWLER", "WDC"], ["Priya Mishra", "India", "BOWLER", "UPW"],
  ["Priya Punia", "India", "WICKETKEEPER", "WDC"], ["Radha Yadav", "India", "ALL-ROUNDER", "WDC"],
  ["Rajeshwari Gayakwad", "India", "BOWLER", "WRCB"], ["Renuka Singh", "India", "BOWLER", "WRCB"],
  ["Richa Ghosh", "India", "WICKETKEEPER", "WRCB"], ["Saika Ishaque", "India", "BOWLER", "WMI"],
  ["Sayali Satghare", "India", "BOWLER", "WRCB"], ["Shafali Verma", "India", "BATTER", "WDC"],
  ["Shikha Pandey", "India", "ALL-ROUNDER", "GG"], ["Shweta Sehrawat", "India", "BATTER", "WRCB"],
  ["Simran Shaikh", "India", "ALL-ROUNDER", "WRCB"], ["Sneh Rana", "India", "ALL-ROUNDER", "GG"],
  ["S Sajana", "India", "ALL-ROUNDER", "UPW"], ["Smriti Mandhana", "India", "BATTER", "WRCB"],
  ["Taniya Bhatia", "India", "WICKETKEEPER", "WDC"], ["Tara Norris", "England", "BOWLER", "WDC"],
  ["Veda Krishnamurthy", "India", "BATTER", "WDC"], ["Yastika Bhatia", "India", "WICKETKEEPER", "WMI"],
  ["Alice Capsey", "England", "ALL-ROUNDER", "WDC"], ["Amy Jones", "England", "WICKETKEEPER", "GG"],
  ["Charlie Dean", "England", "BOWLER", "WDC"], ["Danielle Gibson", "England", "ALL-ROUNDER", "UPW"],
  ["Danni Wyatt", "England", "BATTER", "UPW"], ["Emma Lamb", "England", "BATTER", "WRCB"],
  ["Freya Kemp", "England", "ALL-ROUNDER", "WRCB"], ["Georgia Adams", "England", "ALL-ROUNDER", "WRCB"],
  ["Heather Knight", "England", "ALL-ROUNDER", "UPW"], ["Issy Wong", "England", "BOWLER", "WMI"],
  ["Kate Cross", "England", "BOWLER", "WMI"], ["Katherine Brunt", "England", "BOWLER", "UPW"],
  ["Lauren Bell", "England", "BOWLER", "WRCB"], ["Linsey Smith", "England", "BOWLER", "WDC"],
  ["Maia Bouchier", "England", "BATTER", "WRCB"], ["Nat Sciver-Brunt", "England", "ALL-ROUNDER", "WMI"],
  ["Sophia Dunkley", "England", "ALL-ROUNDER", "GG"], ["Sophie Ecclestone", "England", "BOWLER", "UPW"],
  ["Alana King", "Australia", "BOWLER", "GG"], ["Annabel Sutherland", "Australia", "ALL-ROUNDER", "UPW"],
  ["Alyssa Healy", "Australia", "WICKETKEEPER", "UPW"], ["Ash Gardner", "Australia", "ALL-ROUNDER", "GG"],
  ["Beth Mooney", "Australia", "WICKETKEEPER", "GG"], ["Darcie Brown", "Australia", "BOWLER", "WRCB"],
  ["Ellyse Perry", "Australia", "ALL-ROUNDER", "WRCB"], ["Elyse Villani", "Australia", "BATTER", "UPW"],
  ["Grace Harris", "Australia", "ALL-ROUNDER", "UPW"], ["Jess Jonassen", "Australia", "BOWLER", "WDC"],
  ["Kim Garth", "Ireland", "ALL-ROUNDER", "UPW"], ["Laura Wolvaardt", "South Africa", "BATTER", "GG"],
  ["Lauren Cheatle", "Australia", "BOWLER", "WRCB"], ["Maitlan Brown", "Australia", "BOWLER", "WMI"],
  ["Marizanne Kapp", "South Africa", "ALL-ROUNDER", "WDC"], ["Meg Lanning", "Australia", "BATTER", "WDC"],
  ["Megan Schutt", "Australia", "BOWLER", "GG"], ["Nicola Carey", "Australia", "ALL-ROUNDER", "UPW"],
  ["Phoebe Litchfield", "Australia", "BATTER", "UPW"], ["Tahlia McGrath", "Australia", "ALL-ROUNDER", "UPW"],
  ["Tahlia Vlaeminck", "Australia", "BOWLER", "UPW"], ["Georgia Wareham", "Australia", "ALL-ROUNDER", "WRCB"],
  ["Heather Graham", "Australia", "ALL-ROUNDER", "UPW"], ["Chamari Athapaththu", "Sri Lanka", "ALL-ROUNDER", "GG"],
  ["Chloe Tryon", "South Africa", "ALL-ROUNDER", "UPW"], ["Ayabonga Khaka", "South Africa", "BOWLER", "UPW"],
  ["Lizelle Lee", "South Africa", "BATTER", "WMI"], ["Nonkululeko Mlaba", "South Africa", "BOWLER", "GG"],
  ["Shabnim Ismail", "South Africa", "BOWLER", "WDC"], ["Sune Luus", "South Africa", "ALL-ROUNDER", "GG"],
  ["Deandra Dottin", "West Indies", "ALL-ROUNDER", "GG"], ["Hayley Matthews", "West Indies", "ALL-ROUNDER", "WMI"],
  ["Chinelle Henry", "West Indies", "ALL-ROUNDER", "WRCB"], ["Shemaine Campbelle", "West Indies", "WICKETKEEPER", "UPW"],
  ["Shakera Selman", "West Indies", "BOWLER", "UPW"], ["Kristie Gordon", "West Indies", "BOWLER", "GG"],
  ["Amelia Kerr", "New Zealand", "ALL-ROUNDER", "WMI"], ["Lea Tahuhu", "New Zealand", "BOWLER", "UPW"],
  ["Leigh Kasperek", "New Zealand", "BOWLER", "WDC"], ["Hannah Rowe", "New Zealand", "ALL-ROUNDER", "GG"],
  ["Brooke Halliday", "New Zealand", "ALL-ROUNDER", "WMI"], ["Frances Mackay", "New Zealand", "ALL-ROUNDER", "WRCB"],
  ["Gaby Lewis", "Ireland", "ALL-ROUNDER", "WDC"], ["Orla Prendergast", "Ireland", "ALL-ROUNDER", "WDC"],
  ["Leah Paul", "Ireland", "ALL-ROUNDER", "WMI"], ["Sarah Bryce", "Scotland", "WICKETKEEPER", "WRCB"],
  ["Kathryn Bryce", "Scotland", "ALL-ROUNDER", "GG"], ["Abtaha Maqsood", "Scotland", "BOWLER", "WRCB"],
  ["Harmanpreet Kaur", "India", "ALL-ROUNDER", "WMI"], ["Deepti Sharma", "India", "ALL-ROUNDER", "UPW"],
  ["Jemimah Rodrigues", "India", "BATTER", "WMI"], ["Shafali Verma", "India", "BATTER", "WDC"],
  ["Richa Ghosh", "India", "WICKETKEEPER", "WRCB"], ["Renuka Singh", "India", "BOWLER", "WRCB"],
  ["Rajeshwari Gayakwad", "India", "BOWLER", "WRCB"], ["Saika Ishaque", "India", "BOWLER", "WMI"],
  ["Parshavi Chopra", "India", "BOWLER", "UPW"], ["Mannat Kashyap", "India", "BOWLER", "UPW"],
  ["G Kamalini", "India", "WICKETKEEPER", "UPW"], ["S Sajana", "India", "ALL-ROUNDER", "UPW"],
  ["Prerana Mithun", "India", "ALL-ROUNDER", "UPW"], ["Priya Mishra", "India", "BOWLER", "UPW"],
  ["Simran Shaikh", "India", "ALL-ROUNDER", "WRCB"], ["Shweta Sehrawat", "India", "BATTER", "WRCB"],
  ["Sayali Satghare", "India", "BOWLER", "WRCB"], ["Bhagya Shree Chavan", "India", "BATTER", "UPW"],
  ["Harleen Deol", "India", "BATTER", "UPW"], ["Devika Vaidya", "India", "ALL-ROUNDER", "UPW"],
  ["Veda Krishnamurthy", "India", "BATTER", "WDC"], ["Priya Punia", "India", "WICKETKEEPER", "WDC"],
  ["Taniya Bhatia", "India", "WICKETKEEPER", "WDC"], ["Radha Yadav", "India", "ALL-ROUNDER", "WDC"],
  ["Alice Capsey", "England", "ALL-ROUNDER", "WDC"], ["Charlie Dean", "England", "BOWLER", "WDC"],
  ["Linsey Smith", "England", "BOWLER", "WDC"], ["Poonam Yadav", "India", "BOWLER", "WDC"],
  ["Ekta Bisht", "India", "BOWLER", "WRCB"], ["Mansi Joshi", "India", "BOWLER", "WRCB"],
  ["Arundhati Reddy", "India", "BOWLER", "WMI"], ["Meghna Singh", "India", "BOWLER", "GG"],
  ["Shikha Pandey", "India", "ALL-ROUNDER", "GG"], ["Sneh Rana", "India", "ALL-ROUNDER", "GG"],
  ["Asha Sobhana", "India", "ALL-ROUNDER", "WRCB"], ["Anjali Sarvani", "India", "BOWLER", "UPW"],
  ["Tara Norris", "England", "BOWLER", "WDC"], ["Kate Cross", "England", "BOWLER", "WMI"],
  ["Issy Wong", "England", "BOWLER", "WMI"], ["Lauren Bell", "England", "BOWLER", "WRCB"],
  ["Katherine Brunt", "England", "BOWLER", "UPW"], ["Sophie Ecclestone", "England", "BOWLER", "UPW"],
  ["Nat Sciver-Brunt", "England", "ALL-ROUNDER", "WMI"], ["Heather Knight", "England", "ALL-ROUNDER", "UPW"],
  ["Danni Wyatt", "England", "BATTER", "UPW"], ["Danielle Gibson", "England", "ALL-ROUNDER", "UPW"],
  ["Emma Lamb", "England", "BATTER", "WRCB"], ["Maia Bouchier", "England", "BATTER", "WRCB"],
  ["Freya Kemp", "England", "ALL-ROUNDER", "WRCB"], ["Georgia Adams", "England", "ALL-ROUNDER", "WRCB"],
  ["Amy Jones", "England", "WICKETKEEPER", "GG"], ["Sophia Dunkley", "England", "ALL-ROUNDER", "GG"],
  ["Sarah Bryce", "Scotland", "WICKETKEEPER", "WRCB"], ["Kim Garth", "Ireland", "ALL-ROUNDER", "UPW"],
  ["Leah Paul", "Ireland", "ALL-ROUNDER", "WMI"], ["Orla Prendergast", "Ireland", "ALL-ROUNDER", "WDC"],
  ["Gaby Lewis", "Ireland", "ALL-ROUNDER", "WDC"], ["Lea Tahuhu", "New Zealand", "BOWLER", "UPW"],
  ["Amelia Kerr", "New Zealand", "ALL-ROUNDER", "WMI"], ["Hayley Matthews", "West Indies", "ALL-ROUNDER", "WMI"],
  ["Deandra Dottin", "West Indies", "ALL-ROUNDER", "GG"], ["Chamari Athapaththu", "Sri Lanka", "ALL-ROUNDER", "GG"],
  ["Marizanne Kapp", "South Africa", "ALL-ROUNDER", "WDC"], ["Laura Wolvaardt", "South Africa", "BATTER", "GG"],
  ["Lizelle Lee", "South Africa", "BATTER", "WMI"], ["Shabnim Ismail", "South Africa", "BOWLER", "WDC"],
  ["Sune Luus", "South Africa", "ALL-ROUNDER", "GG"], ["Nonkululeko Mlaba", "South Africa", "BOWLER", "GG"],
  ["Ayabonga Khaka", "South Africa", "BOWLER", "UPW"], ["Chloe Tryon", "South Africa", "ALL-ROUNDER", "UPW"],
  ["Kristie Gordon", "West Indies", "BOWLER", "GG"], ["Shakera Selman", "West Indies", "BOWLER", "UPW"],
  ["Shemaine Campbelle", "West Indies", "WICKETKEEPER", "UPW"], ["Chinelle Henry", "West Indies", "ALL-ROUNDER", "WRCB"],
  ["Megan Schutt", "Australia", "BOWLER", "GG"], ["Maitlan Brown", "Australia", "BOWLER", "WMI"],
  ["Jess Jonassen", "Australia", "BOWLER", "WDC"], ["Alana King", "Australia", "BOWLER", "GG"],
  ["Tahlia Vlaeminck", "Australia", "BOWLER", "UPW"], ["Darcie Brown", "Australia", "BOWLER", "WRCB"],
  ["Annabel Sutherland", "Australia", "ALL-ROUNDER", "UPW"], ["Nicola Carey", "Australia", "ALL-ROUNDER", "UPW"],
  ["Heather Graham", "Australia", "ALL-ROUNDER", "UPW"], ["Phoebe Litchfield", "Australia", "BATTER", "UPW"],
  ["Tahlia McGrath", "Australia", "ALL-ROUNDER", "UPW"], ["Grace Harris", "Australia", "ALL-ROUNDER", "UPW"],
  ["Elyse Villani", "Australia", "BATTER", "UPW"], ["Georgia Wareham", "Australia", "ALL-ROUNDER", "WRCB"],
  ["Ellyse Perry", "Australia", "ALL-ROUNDER", "WRCB"], ["Ash Gardner", "Australia", "ALL-ROUNDER", "GG"],
  ["Beth Mooney", "Australia", "WICKETKEEPER", "GG"], ["Alyssa Healy", "Australia", "WICKETKEEPER", "UPW"],
  ["Meg Lanning", "Australia", "BATTER", "WDC"], ["Smriti Mandhana", "India", "BATTER", "WRCB"],
  ["Harmanpreet Kaur", "India", "ALL-ROUNDER", "WMI"], ["Yastika Bhatia", "India", "WICKETKEEPER", "WMI"],
  ["Jemimah Rodrigues", "India", "BATTER", "WMI"], ["Shafali Verma", "India", "BATTER", "WDC"],
  // Additional India / overseas auction names
  ["Shikha Shukla", "India", "BOWLER", "WDC"], ["Sabbhineni Meghana", "India", "BATTER", "GG"],
  ["Shafali Verma", "India", "BATTER", "WDC"], ["S Mandal", "India", "BOWLER", "UPW"],
  ["Tanushree Konar", "India", "BOWLER", "WMI"], ["Titas Sadhu", "India", "BOWLER", "GG"],
  ["Uma Chetry", "India", "WICKETKEEPER", "WDC"], ["Yastika Bhatia", "India", "WICKETKEEPER", "WMI"],
  ["Amanjot Kaur", "India", "ALL-ROUNDER", "GG"], ["Anjali Sarvani", "India", "BOWLER", "UPW"],
  ["Anusha Bareddy", "India", "BOWLER", "WDC"], ["Aparna Dhareshwar", "India", "BOWLER", "WRCB"],
  ["Bhulan Hansdah", "India", "BOWLER", "WDC"], ["D Hemalatha", "India", "ALL-ROUNDER", "GG"],
  ["Gouher Sultana", "India", "BOWLER", "WMI"], ["Jasia Akhtar", "India", "BATTER", "WDC"],
  ["Kanika Ahuja", "India", "ALL-ROUNDER", "WRCB"], ["Laxmi Yadav", "India", "BOWLER", "WDC"],
  ["Madhuri Khatri", "India", "BATTER", "WMI"], ["Minnu Mani", "India", "ALL-ROUNDER", "WDC"],
  ["Mona Meshram", "India", "BATTER", "WMI"], ["Nuzhat Parween", "India", "WICKETKEEPER", "WDC"],
  ["Pooja Vastrakar", "India", "ALL-ROUNDER", "WMI"], ["Poonam Raut", "India", "BATTER", "GG"],
  ["Prerana Mithun", "India", "ALL-ROUNDER", "UPW"], ["Priya Mishra", "India", "BOWLER", "UPW"],
  ["Rajeshwari Gayakwad", "India", "BOWLER", "WRCB"], ["Renuka Singh", "India", "BOWLER", "WRCB"],
  ["Richa Ghosh", "India", "WICKETKEEPER", "WRCB"], ["Saika Ishaque", "India", "BOWLER", "WMI"],
  ["Sayali Satghare", "India", "BOWLER", "WRCB"], ["Shweta Sehrawat", "India", "BATTER", "WRCB"],
  ["Simran Shaikh", "India", "ALL-ROUNDER", "WRCB"], ["Sneh Rana", "India", "ALL-ROUNDER", "GG"],
  ["S Sajana", "India", "ALL-ROUNDER", "UPW"], ["Titas Sadhu", "India", "BOWLER", "GG"],
  ["Uma Chetry", "India", "WICKETKEEPER", "WDC"], ["Veda Krishnamurthy", "India", "BATTER", "WDC"],
  ["Amanjot Kaur", "India", "ALL-ROUNDER", "GG"], ["Sabbhineni Meghana", "India", "BATTER", "GG"],
  ["Shikha Shukla", "India", "BOWLER", "WDC"], ["Tanushree Konar", "India", "BOWLER", "WMI"],
  ["Aparna Dhareshwar", "India", "BOWLER", "WRCB"], ["Anusha Bareddy", "India", "BOWLER", "WDC"],
  ["Anusha Kumari", "India", "BOWLER", "GG"], ["Anusha Singh", "India", "BOWLER", "WMI"],
  ["Ankita Konwar", "India", "BATTER", "WRCB"], ["Ankita Sharma", "India", "BOWLER", "GG"],
  ["Anuja Patil", "India", "BOWLER", "UPW"], ["Anuja Jadhav", "India", "BATTER", "WDC"],
  ["Aparna Mondal", "India", "BOWLER", "WMI"], ["Aparna Rajbhar", "India", "BOWLER", "GG"],
  ["Anjum Chopra", "India", "BATTER", "GG"], ["Anju Jain", "India", "WICKETKEEPER", "WMI"],
  ["Anjali Ved", "India", "BOWLER", "WDC"], ["Anushka Sen", "India", "BATTER", "UPW"],
  ["Anushka Sharma", "India", "BOWLER", "WRCB"], ["Asha Sobhana", "India", "ALL-ROUNDER", "WRCB"],
  ["Bhagya Shree Chavan", "India", "BATTER", "UPW"], ["Charlotte Dean", "England", "BOWLER", "WDC"],
  ["Tammy Beaumont", "England", "WICKETKEEPER", "WRCB"], ["Danni Wyatt-Hodge", "England", "BATTER", "UPW"],
  ["Lauren Filer", "England", "BOWLER", "WMI"], ["Eva Gray", "England", "BOWLER", "GG"],
  ["Katie George", "England", "ALL-ROUNDER", "WDC"], ["Emily Arlott", "England", "BOWLER", "WRCB"],
  ["Abtaha Maqsood", "Scotland", "BOWLER", "WRCB"], ["Kathryn Bryce", "Scotland", "ALL-ROUNDER", "GG"],
  ["Leigh Kasperek", "New Zealand", "BOWLER", "WDC"], ["Hannah Rowe", "New Zealand", "ALL-ROUNDER", "GG"],
  ["Brooke Halliday", "New Zealand", "ALL-ROUNDER", "WMI"], ["Frances Mackay", "New Zealand", "ALL-ROUNDER", "WRCB"],
  ["Leah Paul", "Ireland", "ALL-ROUNDER", "WMI"], ["Orla Prendergast", "Ireland", "ALL-ROUNDER", "WDC"],
  ["Gaby Lewis", "Ireland", "ALL-ROUNDER", "WDC"], ["Kim Garth", "Ireland", "ALL-ROUNDER", "UPW"],
  ["Sarah Bryce", "Scotland", "WICKETKEEPER", "WRCB"], ["Sophie Devine", "New Zealand", "ALL-ROUNDER", "GG"],
  ["Rachael Haynes", "Australia", "BATTER", "WRCB"], ["Erin Burns", "Australia", "ALL-ROUNDER", "WRCB"],
  ["Kate Porter", "Australia", "BOWLER", "WRCB"], ["Lauren Cheatle", "Australia", "BOWLER", "WRCB"],
  ["Hayley Silver-Holmes", "Australia", "ALL-ROUNDER", "WRCB"], ["Paris Cotter", "Australia", "ALL-ROUNDER", "WRCB"],
  ["Nicola Hancock", "Australia", "BOWLER", "WRCB"], ["Olivia Davies", "Australia", "BOWLER", "WRCB"],
  ["Lucy Hamilton", "Australia", "BOWLER", "WRCB"], ["Amy Edgar", "Australia", "ALL-ROUNDER", "GG"],
  ["Lilly Mills", "Australia", "BOWLER", "GG"], ["Taneale Peschel", "Australia", "BOWLER", "GG"],
  ["Chloe Pipar", "Australia", "BOWLER", "GG"], ["Sophie Devine", "New Zealand", "ALL-ROUNDER", "GG"],
  ["Bridget Patterson", "Australia", "BATTER", "WRCB"], ["Amanda-Jade Wellington", "Australia", "BOWLER", "WRCB"],
  ["Annie O'Neil", "Australia", "BATTER", "WRCB"], ["Ella Wilson", "Australia", "BATTER", "WRCB"],
  ["Madeline Penna", "Australia", "BOWLER", "WRCB"], ["Erica Gibson", "Australia", "ALL-ROUNDER", "WRCB"],
  ["Carly Leeson", "Australia", "ALL-ROUNDER", "WRCB"], ["Emma Manix-Geeves", "Australia", "BOWLER", "WRCB"],
  ["Sammy-Jo Johnson", "Australia", "ALL-ROUNDER", "WRCB"], ["Hannah Darlington", "Australia", "BOWLER", "WRCB"],
  ["Anika Learoyd", "Australia", "BATTER", "WRCB"], ["Georgia Redmayne", "Australia", "WICKETKEEPER", "WRCB"],
  ["Anneke Bosch", "South Africa", "ALL-ROUNDER", "WRCB"], ["Charlotte Coe", "Australia", "BOWLER", "WRCB"],
  ["Nikola Carey", "Australia", "ALL-ROUNDER", "WRCB"], ["Molly Strano", "Australia", "BOWLER", "WRCB"],
  ["Laura Harris", "Australia", "BATTER", "WRCB"], ["Rachel Haynes", "Australia", "BATTER", "WRCB"],
  ["Amy Smith", "Australia", "BOWLER", "WRCB"], ["Chloe Pipar", "Australia", "BOWLER", "WRCB"],
];
for (const [name, country, role, team] of WPL_EXTENDED_POOL) {
  if (!WPL_PLAYERS.some((p) => normPlayerName(p.name).toLowerCase() === normPlayerName(name).toLowerCase())) {
    WPL_PLAYERS.push(mk(`WXE${WPL_PLAYERS.length}`, name, country, role, SET_BY_ROLE[role] || "AL3", team, { league: "wpl" }));
  }
}

// ─── The Hundred 2025 Men's pool ───
const HUNDRED_TEAMS = ["BPH", "LNS", "MNR", "NOS", "OVI", "SOB", "TRT", "WEF", "EDI", "BRI"];
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

const HUNDRED_MORE = [
  ["Rehan Ahmed", "England", "BOWLER", "OVI"], ["Matt Parkinson", "England", "BOWLER", "NOS"],
  ["Adil Rashid", "England", "BOWLER", "NOS"], ["Jason Roy", "England", "BATTER", "OVI"],
  ["Eoin Morgan", "England", "BATTER", "LNS"], ["Jonny Bairstow", "England", "WICKETKEEPER", "TRT"],
  ["Liam Livingstone", "England", "ALL-ROUNDER", "BPH"], ["Jamie Overton", "England", "ALL-ROUNDER", "SOB"],
  ["Olly Stone", "England", "BOWLER", "LNS"], ["Tom Helm", "England", "BOWLER", "BPH"],
  ["Dan Mousley", "England", "ALL-ROUNDER", "BPH"], ["Jacob Bethell", "England", "ALL-ROUNDER", "BPH"],
  ["Stephen Eskinazi", "England", "BATTER", "LNS"], ["Adam Rossington", "England", "WICKETKEEPER", "MNR"],
  ["Nathan Sowter", "England", "BOWLER", "OVI"], ["Danny Briggs", "England", "BOWLER", "OVI"],
  ["Rory Burns", "England", "BATTER", "OVI"], ["Jordan Cox", "England", "BATTER", "OVI"],
  ["Chris Topley", "England", "BOWLER", "TRT"], ["Luke Wood", "England", "BOWLER", "TRT"],
  ["Tom Kohler-Cadmore", "England", "BATTER", "TRT"], ["Samit Patel", "England", "ALL-ROUNDER", "TRT"],
  ["Luke Fletcher", "England", "BOWLER", "WEF"], ["Dan Douthwaite", "England", "ALL-ROUNDER", "WEF"],
  ["Will Smeed", "England", "BATTER", "BPH"], ["Benny Howell", "England", "ALL-ROUNDER", "BPH"],
];
for (const [name, country, role, team] of HUNDRED_MORE) {
  if (!HUNDRED_PLAYERS.some((p) => p.name === name)) addHundred(name, country, role, "BA3", team);
}

const HUNDRED_FULL_POOL = [
  ["Ben Stokes", "England", "ALL-ROUNDER", "OVI"], ["Jonny Bairstow", "England", "WICKETKEEPER", "TRT"],
  ["Moeen Ali", "England", "ALL-ROUNDER", "BPH"], ["Chris Woakes", "England", "BOWLER", "BPH"],
  ["Dan Lawrence", "England", "BATTER", "LNS"], ["Liam Dawson", "England", "ALL-ROUNDER", "LNS"],
  ["Stephen Eskinazi", "England", "BATTER", "LNS"], ["Phil Salt", "England", "WICKETKEEPER", "MNR"],
  ["Tom Hartley", "England", "BOWLER", "MNR"], ["Richard Gleeson", "England", "BOWLER", "MNR"],
  ["Calvin Harrison", "England", "BATTER", "MNR"], ["Harry Brook", "England", "BATTER", "NOS"],
  ["David Willey", "England", "ALL-ROUNDER", "NOS"], ["Matthew Potts", "England", "BOWLER", "NOS"],
  ["Ben Raine", "England", "ALL-ROUNDER", "NOS"], ["Adam Hose", "England", "BATTER", "NOS"],
  ["Callum Parkinson", "England", "BOWLER", "NOS"], ["Tom Curran", "England", "ALL-ROUNDER", "OVI"],
  ["Will Jacks", "England", "ALL-ROUNDER", "OVI"], ["Jordan Cox", "England", "BATTER", "OVI"],
  ["Rory Burns", "England", "BATTER", "OVI"], ["Donovan Ferreira", "South Africa", "BATTER", "OVI"],
  ["Reece Topley", "England", "BOWLER", "OVI"], ["James Vince", "England", "BATTER", "SOB"],
  ["Tymal Mills", "England", "BOWLER", "SOB"], ["Craig Overton", "England", "ALL-ROUNDER", "SOB"],
  ["Jack Lintott", "England", "BOWLER", "SOB"], ["George Garton", "England", "BOWLER", "SOB"],
  ["Lewis Gregory", "England", "ALL-ROUNDER", "TRT"], ["Luke Wood", "England", "BOWLER", "TRT"],
  ["Tom Kohler-Cadmore", "England", "BATTER", "TRT"], ["Samit Patel", "England", "ALL-ROUNDER", "TRT"],
  ["Tom Banton", "England", "BATTER", "WEF"], ["Glenn Phillips", "New Zealand", "ALL-ROUNDER", "WEF"],
  ["Luke Fletcher", "England", "BOWLER", "WEF"], ["Dan Douthwaite", "England", "ALL-ROUNDER", "WEF"],
  ["Will Smeed", "England", "BATTER", "BPH"], ["Benny Howell", "England", "ALL-ROUNDER", "BPH"],
  ["Jacob Bethell", "England", "ALL-ROUNDER", "BPH"], ["Dan Mousley", "England", "ALL-ROUNDER", "BPH"],
  ["Tom Helm", "England", "BOWLER", "BPH"], ["Olly Stone", "England", "BOWLER", "LNS"],
  ["Zak Crawley", "England", "BATTER", "LNS"], ["Lammonby", "England", "ALL-ROUNDER", "MNR"],
  ["Matthew Breetzke", "South Africa", "BATTER", "NOS"], ["Matthew Hurst", "South Africa", "WICKETKEEPER", "NOS"],
  ["Graham Clark", "England", "BATTER", "NOS"], ["Lyon", "Australia", "BOWLER", "NOS"],
  ["Dawson", "England", "ALL-ROUNDER", "TRT"], ["Ferguson", "New Zealand", "BOWLER", "TRT"],
  ["Wright", "England", "BATTER", "WEF"], ["Hain", "England", "BATTER", "WEF"],
  ["Matt Renshaw", "Australia", "BATTER", "BPH"], ["Usman Khawaja", "Australia", "BATTER", "TRT"],
  ["Marcus Stoinis", "Australia", "ALL-ROUNDER", "WEF"], ["Mitchell Marsh", "Australia", "ALL-ROUNDER", "OVI"],
  ["Chris Lynn", "Australia", "BATTER", "MNR"], ["Aaron Finch", "Australia", "BATTER", "SOB"],
  ["Faf du Plessis", "South Africa", "BATTER", "BPH"], ["Quinton de Kock", "South Africa", "WICKETKEEPER", "TRT"],
  ["Heinrich Klaasen", "South Africa", "BATTER", "MNR"], ["Marco Jansen", "South Africa", "ALL-ROUNDER", "SOB"],
  ["Tabraiz Shamsi", "South Africa", "BOWLER", "NOS"], ["Keshav Maharaj", "South Africa", "BOWLER", "LNS"],
  ["Wanindu Hasaranga", "Sri Lanka", "ALL-ROUNDER", "OVI"], ["Pathum Nissanka", "Sri Lanka", "BATTER", "TRT"],
  ["Mustafizur Rahman", "Bangladesh", "BOWLER", "SOB"], ["Mohammad Amir", "Pakistan", "BOWLER", "BPH"],
  ["Imad Wasim", "Pakistan", "ALL-ROUNDER", "MNR"], ["Shaheen Afridi", "Pakistan", "BOWLER", "LNS"],
  ["Rovman Powell", "West Indies", "ALL-ROUNDER", "WEF"], ["Shimron Hetmyer", "West Indies", "BATTER", "NOS"],
  ["Nicholas Pooran", "West Indies", "WICKETKEEPER", "MNR"], ["Sunil Narine", "West Indies", "ALL-ROUNDER", "TRT"],
  ["Rashid Khan", "Afghanistan", "BOWLER", "LNS"], ["Noor Ahmad", "Afghanistan", "BOWLER", "NOS"],
  ["Naveen-ul-Haq", "Afghanistan", "BOWLER", "OVI"], ["Wanindu Hasaranga", "Sri Lanka", "ALL-ROUNDER", "BPH"],
  ["Matt Henry", "New Zealand", "BOWLER", "SOB"], ["Tim Seifert", "New Zealand", "WICKETKEEPER", "WEF"],
  ["Colin de Grandhomme", "New Zealand", "ALL-ROUNDER", "TRT"], ["Colin Ackermann", "England", "ALL-ROUNDER", "NOS"],
  ["Michael Bracewell", "New Zealand", "ALL-ROUNDER", "BPH"], ["Laurie Evans", "England", "BATTER", "OVI"],
  ["Stephen Eskinazi", "England", "BATTER", "LNS"], ["Adam Rossington", "England", "WICKETKEEPER", "MNR"],
  ["Nathan Sowter", "England", "BOWLER", "OVI"], ["Danny Briggs", "England", "BOWLER", "OVI"],
  ["Chris Topley", "England", "BOWLER", "TRT"], ["Jamie Overton", "England", "ALL-ROUNDER", "WEF"],
  ["Liam Livingstone", "England", "ALL-ROUNDER", "BPH"], ["Jason Roy", "England", "BATTER", "OVI"],
  ["Eoin Morgan", "England", "BATTER", "LNS"], ["Adil Rashid", "England", "BOWLER", "NOS"],
  ["Matt Parkinson", "England", "BOWLER", "NOS"], ["Rehan Ahmed", "England", "BOWLER", "OVI"],
  ["Jonny Bairstow", "England", "WICKETKEEPER", "WEF"], ["Joe Root", "England", "BATTER", "TRT"],
  ["Jos Buttler", "England", "WICKETKEEPER", "MNR"], ["Ben Duckett", "England", "BATTER", "BPH"],
  ["Mark Wood", "England", "BOWLER", "LNS"], ["Chris Jordan", "England", "BOWLER", "SOB"],
  ["Jofra Archer", "England", "BOWLER", "SOB"], ["Sam Curran", "England", "ALL-ROUNDER", "OVI"],
  ["Kagiso Rabada", "South Africa", "BOWLER", "MNR"], ["Lockie Ferguson", "New Zealand", "BOWLER", "MNR"],
  ["Andre Russell", "West Indies", "ALL-ROUNDER", "MNR"], ["David Warner", "Australia", "BATTER", "TRT"],
  ["David Miller", "South Africa", "BATTER", "WEF"], ["Daryl Mitchell", "New Zealand", "ALL-ROUNDER", "LNS"],
  ["Will Jacks", "England", "ALL-ROUNDER", "BPH"], ["Glenn Phillips", "New Zealand", "ALL-ROUNDER", "WEF"],
  ["Sikandar Raza", "Zimbabwe", "ALL-ROUNDER", "MNR"], ["Mahela Jayawardene", "Sri Lanka", "BATTER", "SOB"],
  ["Leus du Plooy", "South Africa", "BATTER", "SOB"], ["Shamar Joseph", "West Indies", "BOWLER", "WEF"],
  ["Adam Milne", "New Zealand", "BOWLER", "BPH"], ["Kyle Jamieson", "New Zealand", "BOWLER", "SOB"],
  ["Sean Abbott", "Australia", "ALL-ROUNDER", "TRT"], ["Kyle Verreynne", "South Africa", "WICKETKEEPER", "NOS"],
  ["Wayne Parnell", "South Africa", "BOWLER", "BPH"], ["Dwaine Pretorius", "South Africa", "ALL-ROUNDER", "MNR"],
  ["Liam Plunkett", "England", "BOWLER", "SOB"], ["Steven Finn", "England", "BOWLER", "LNS"],
  ["Stuart Broad", "England", "BOWLER", "NOS"], ["James Anderson", "England", "BOWLER", "TRT"],
  ["Moeen Ali", "England", "ALL-ROUNDER", "BPH"], ["Jonny Bairstow", "England", "WICKETKEEPER", "TRT"],
  ["Alex Hales", "England", "BATTER", "OVI"], ["Dawid Malan", "England", "BATTER", "NOS"],
  ["Sam Billings", "England", "WICKETKEEPER", "SOB"], ["Liam Dawson", "England", "ALL-ROUNDER", "LNS"],
  ["Matt Coles", "England", "ALL-ROUNDER", "WEF"], ["Luke Wright", "England", "ALL-ROUNDER", "TRT"],
  ["Ravi Bopara", "England", "ALL-ROUNDER", "OVI"], ["Steven Croft", "England", "ALL-ROUNDER", "MNR"],
  ["James Vince", "England", "BATTER", "SOB"], ["Tom Abell", "England", "BATTER", "BPH"],
  ["Will Jacks", "England", "ALL-ROUNDER", "BPH"], ["Jordan Thompson", "England", "ALL-ROUNDER", "NOS"],
  ["Luke Johnson", "England", "BOWLER", "TRT"], ["George Simpson-Hayward", "England", "BOWLER", "BPH"],
  ["Feroze Khokhar", "England", "BATTER", "WEF"], ["Tom Alsop", "England", "WICKETKEEPER", "SOB"],
  ["Finn Allen", "New Zealand", "BATTER", "MNR"], ["Colin Munro", "New Zealand", "BATTER", "TRT"],
  ["Martin Guptill", "New Zealand", "BATTER", "WEF"], ["Tim David", "Australia", "BATTER", "OVI"],
  ["Travis Head", "Australia", "BATTER", "BPH"], ["Steve Smith", "Australia", "BATTER", "TRT"],
  ["Glenn Maxwell", "Australia", "ALL-ROUNDER", "MNR"], ["Pat Cummins", "Australia", "BOWLER", "SOB"],
  ["Mitchell Starc", "Australia", "BOWLER", "LNS"], ["Josh Inglis", "Australia", "WICKETKEEPER", "NOS"],
  ["Matthew Wade", "Australia", "WICKETKEEPER", "OVI"], ["Marcus Stoinis", "Australia", "ALL-ROUNDER", "WEF"],
  ["Aaron Finch", "Australia", "BATTER", "MNR"], ["Chris Lynn", "Australia", "BATTER", "TRT"],
  ["Kane Richardson", "Australia", "BOWLER", "BPH"], ["Jhye Richardson", "Australia", "BOWLER", "SOB"],
  ["Nathan Ellis", "Australia", "BOWLER", "NOS"], ["Riley Meredith", "Australia", "BOWLER", "HH"],
  ["Peter Siddle", "Australia", "BOWLER", "LNS"], ["Jason Behrendorff", "Australia", "BOWLER", "TRT"],
  ["Ashton Turner", "Australia", "BATTER", "WEF"], ["Cooper Connolly", "Australia", "ALL-ROUNDER", "BPH"],
  ["Moises Henriques", "Australia", "ALL-ROUNDER", "SOB"], ["Ben Dwarshuis", "Australia", "BOWLER", "LNS"],
  ["Hayden Kerr", "Australia", "ALL-ROUNDER", "TRT"], ["Alex Carey", "Australia", "WICKETKEEPER", "BPH"],
  ["Jon Wells", "Australia", "BATTER", "MNR"], ["Henry Thornton", "Australia", "BOWLER", "BPH"],
  ["Harry Conway", "Australia", "BOWLER", "LNS"], ["Ben Manenti", "Australia", "ALL-ROUNDER", "SOB"],
  ["Will Sutherland", "Australia", "ALL-ROUNDER", "OVI"], ["Sam Harper", "Australia", "WICKETKEEPER", "WEF"],
  ["Chris Green", "Australia", "ALL-ROUNDER", "TRT"], ["Daniel Sams", "Australia", "ALL-ROUNDER", "NOS"],
  ["Jason Sangha", "Australia", "BATTER", "SOB"], ["Baxter Holt", "Australia", "WICKETKEEPER", "TRT"],
  ["Tanveer Sangha", "Australia", "BOWLER", "SOB"], ["Matthew Gilkes", "Australia", "BATTER", "NOS"],
  ["Cameron Bancroft", "Australia", "BATTER", "BPH"], ["Jake Fraser-McGurk", "Australia", "BATTER", "OVI"],
  ["Jordan Silk", "Australia", "BATTER", "LNS"], ["Callum Ferguson", "Australia", "BATTER", "MNR"],
  ["Ben Cutting", "Australia", "ALL-ROUNDER", "WEF"], ["Michael Neser", "Australia", "BOWLER", "BPH"],
  ["Xavier Bartlett", "Australia", "BOWLER", "BPH"], ["Spencer Johnson", "Australia", "BOWLER", "SOB"],
  ["Jimmy Peirson", "Australia", "WICKETKEEPER", "BPH"], ["Mark Steketee", "Australia", "BOWLER", "TRT"],
  ["Lachlan Pfeffer", "Australia", "WICKETKEEPER", "BPH"], ["Caleb Jewell", "Australia", "BATTER", "NOS"],
  ["Macalister Wright", "Australia", "BATTER", "OVI"], ["Colin Ackermann", "England", "ALL-ROUNDER", "NOS"],
  ["Stephen Eskinazi", "England", "BATTER", "LNS"], ["Dan Lawrence", "England", "BATTER", "LNS"],
  ["Liam Dawson", "England", "ALL-ROUNDER", "LNS"], ["Nathan Sowter", "England", "BOWLER", "OVI"],
  ["Danny Briggs", "England", "BOWLER", "OVI"], ["Rory Burns", "England", "BATTER", "OVI"],
  ["Donovan Ferreira", "South Africa", "BATTER", "OVI"], ["Reece Topley", "England", "BOWLER", "OVI"],
  ["Craig Overton", "England", "ALL-ROUNDER", "SOB"], ["Jack Lintott", "England", "BOWLER", "SOB"],
  ["George Garton", "England", "BOWLER", "SOB"], ["Luke Fletcher", "England", "BOWLER", "WEF"],
  ["Dan Douthwaite", "England", "ALL-ROUNDER", "WEF"], ["Will Smeed", "England", "BATTER", "BPH"],
  ["Benny Howell", "England", "ALL-ROUNDER", "BPH"], ["Jacob Bethell", "England", "ALL-ROUNDER", "BPH"],
  ["Dan Mousley", "England", "ALL-ROUNDER", "BPH"], ["Tom Helm", "England", "BOWLER", "BPH"],
  ["Olly Stone", "England", "BOWLER", "LNS"], ["Zak Crawley", "England", "BATTER", "LNS"],
  ["Tom Hartley", "England", "BOWLER", "MNR"], ["Richard Gleeson", "England", "BOWLER", "MNR"],
  ["Calvin Harrison", "England", "BATTER", "MNR"], ["David Willey", "England", "ALL-ROUNDER", "NOS"],
  ["Matthew Potts", "England", "BOWLER", "NOS"], ["Ben Raine", "England", "ALL-ROUNDER", "NOS"],
  ["Adam Hose", "England", "BATTER", "NOS"], ["Callum Parkinson", "England", "BOWLER", "NOS"],
  ["Graham Clark", "England", "BATTER", "NOS"], ["Matthew Breetzke", "South Africa", "BATTER", "NOS"],
  ["Matthew Hurst", "South Africa", "WICKETKEEPER", "NOS"], ["Jordan Thompson", "England", "ALL-ROUNDER", "NOS"],
  ["Luke Johnson", "England", "BOWLER", "TRT"], ["George Simpson-Hayward", "England", "BOWLER", "BPH"],
  ["Tom Alsop", "England", "WICKETKEEPER", "SOB"], ["Sam Billings", "England", "WICKETKEEPER", "SOB"],
  ["Dawid Malan", "England", "BATTER", "NOS"], ["Alex Hales", "England", "BATTER", "OVI"],
  ["Matt Coles", "England", "ALL-ROUNDER", "WEF"], ["Luke Wright", "England", "ALL-ROUNDER", "TRT"],
  ["Ravi Bopara", "England", "ALL-ROUNDER", "OVI"], ["Steven Croft", "England", "ALL-ROUNDER", "MNR"],
  ["Tom Abell", "England", "BATTER", "BPH"], ["Feroze Khokhar", "England", "BATTER", "WEF"],
];

for (const [name, country, role, team] of HUNDRED_FULL_POOL) {
  if (!HUNDRED_PLAYERS.some((p) => p.name === name)) addHundred(name, country, role, "AL3", team);
}

function writePool(dir, filename, players) {
  mkdirSync(dir, { recursive: true });
  const payload = { categories: CATEGORIES, players };
  writeFileSync(join(dir, filename), JSON.stringify(payload, null, 2));
  console.log(`✓ ${filename}: ${players.length} players`);
}

const WPL_FINAL = dedupeAndReindex(WPL_PLAYERS, "WP", "wpl");
const HUNDRED_FINAL = dedupeAndReindex(HUNDRED_PLAYERS, "HP", "hundred");

writePool(join(DATA, "leagues", "wpl"), "players.json", WPL_FINAL);
writePool(join(DATA, "leagues", "hundred"), "players.json", HUNDRED_FINAL);
console.log("\nDone. SA20/BBL/WBBL: run scripts/rebuild-all-player-pools.mjs");
