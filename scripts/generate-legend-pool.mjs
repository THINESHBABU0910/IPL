/**
 * Generates src/data/leagues/legend/players.json
 * Run: node scripts/generate-legend-pool.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "src", "data", "leagues", "legend", "players.json");

const categories = [
  { id: "ipl_legends", name: "IPL Legends", sets: ["IL1", "IL2"] },
  { id: "intl_legends", name: "International Legends", sets: ["INT1", "INT2"] },
  { id: "batters", name: "Legend Batters", sets: ["BA1", "BA2"] },
  { id: "allrounders", name: "Legend All-Rounders", sets: ["AL1", "AL2"] },
  { id: "wicketkeepers", name: "Legend Wicket-Keepers", sets: ["WK1"] },
  { id: "fast_bowlers", name: "Legend Fast Bowlers", sets: ["FA1", "FA2"] },
  { id: "spinners", name: "Legend Spinners", sets: ["SP1", "SP2"] },
];

const OVERSEAS = new Set([
  "Australia", "England", "South Africa", "New Zealand", "West Indies", "Sri Lanka",
  "Pakistan", "Bangladesh", "Zimbabwe", "Afghanistan", "Ireland", "Netherlands",
]);

function entry(name, country, role, set, category, baseLakhs, bowlingStyle) {
  const isOverseas = country !== "India";
  const battingStyle = role === "BOWLER" && name.includes("Left") ? "LHB" : "RHB";
  return {
    name,
    country,
    role,
    battingStyle: role === "BOWLER" || role === "ALL-ROUNDER" ? battingStyle : (name.match(/Gambhir|Yuvraj|Sehwag|Lara|Gilchrist/) ? "LHB" : "RHB"),
    bowlingStyle: bowlingStyle || (role === "BOWLER" || role === "ALL-ROUNDER" ? "Right-arm medium" : undefined),
    basePrice: baseLakhs * 100000,
    isOverseas: OVERSEAS.has(country),
    previousTeam: "",
    category,
    set,
    age: 40 + Math.floor(Math.random() * 15),
    isCapped: true,
  };
}

const pools = [
  { set: "IL1", category: "IPL Legends", base: 200, players: [
    ["Sachin Tendulkar", "India", "BATTER"],
    ["MS Dhoni", "India", "WICKETKEEPER"],
    ["Rahul Dravid", "India", "BATTER"],
    ["Sourav Ganguly", "India", "BATTER"],
    ["Virender Sehwag", "India", "BATTER"],
    ["Yuvraj Singh", "India", "ALL-ROUNDER"],
    ["Gautam Gambhir", "India", "BATTER"],
    ["Zaheer Khan", "India", "BOWLER"],
    ["Harbhajan Singh", "India", "BOWLER"],
    ["Anil Kumble", "India", "BOWLER"],
    ["VVS Laxman", "India", "BATTER"],
    ["Suresh Raina", "India", "BATTER"],
    ["Rohit Sharma", "India", "BATTER"],
    ["Virat Kohli", "India", "BATTER"],
    ["AB de Villiers", "South Africa", "BATTER"],
    ["Chris Gayle", "West Indies", "BATTER"],
    ["David Warner", "Australia", "BATTER"],
    ["Shane Watson", "Australia", "ALL-ROUNDER"],
    ["Lasith Malinga", "Sri Lanka", "BOWLER"],
    ["Dwayne Bravo", "West Indies", "ALL-ROUNDER"],
  ]},
  { set: "IL2", category: "IPL Legends", base: 150, players: [
    ["Brendon McCullum", "New Zealand", "WICKETKEEPER"],
    ["Jacques Kallis", "South Africa", "ALL-ROUNDER"],
    ["Adam Gilchrist", "Australia", "WICKETKEEPER"],
    ["Ricky Ponting", "Australia", "BATTER"],
    ["Matthew Hayden", "Australia", "BATTER"],
    ["Michael Clarke", "Australia", "BATTER"],
    ["Shane Warne", "Australia", "BOWLER"],
    ["Muttiah Muralitharan", "Sri Lanka", "BOWLER"],
    ["Kumar Sangakkara", "Sri Lanka", "WICKETKEEPER"],
    ["Mahela Jayawardene", "Sri Lanka", "BATTER"],
    ["Sunil Narine", "West Indies", "BOWLER"],
    ["Andre Russell", "West Indies", "ALL-ROUNDER"],
    ["Kieron Pollard", "West Indies", "ALL-ROUNDER"],
    ["Faf du Plessis", "South Africa", "BATTER"],
    ["Dale Steyn", "South Africa", "BOWLER"],
    ["Morne Morkel", "South Africa", "BOWLER"],
    ["Glenn Maxwell", "Australia", "ALL-ROUNDER"],
    ["Aaron Finch", "Australia", "BATTER"],
    ["Robin Uthappa", "India", "BATTER"],
    ["Irfan Pathan", "India", "ALL-ROUNDER"],
  ]},
  { set: "INT1", category: "International Legends", base: 200, players: [
    ["Brian Lara", "West Indies", "BATTER"],
    ["Viv Richards", "West Indies", "BATTER"],
    ["Garfield Sobers", "West Indies", "ALL-ROUNDER"],
    ["Malcolm Marshall", "West Indies", "BOWLER"],
    ["Curtly Ambrose", "West Indies", "BOWLER"],
    ["Wasim Akram", "Pakistan", "BOWLER"],
    ["Imran Khan", "Pakistan", "ALL-ROUNDER"],
    ["Inzamam-ul-Haq", "Pakistan", "BATTER"],
    ["Javed Miandad", "Pakistan", "BATTER"],
    ["Waqar Younis", "Pakistan", "BOWLER"],
    ["Shane Bond", "New Zealand", "BOWLER"],
    ["Richard Hadlee", "New Zealand", "BOWLER"],
    ["Martin Crowe", "New Zealand", "BATTER"],
    ["Ian Botham", "England", "ALL-ROUNDER"],
    ["Andrew Flintoff", "England", "ALL-ROUNDER"],
    ["Kevin Pietersen", "England", "BATTER"],
    ["Graham Gooch", "England", "BATTER"],
    ["James Anderson", "England", "BOWLER"],
    ["Stuart Broad", "England", "BOWLER"],
    ["Allan Donald", "South Africa", "BOWLER"],
  ]},
  { set: "INT2", category: "International Legends", base: 150, players: [
    ["Shaun Pollock", "South Africa", "ALL-ROUNDER"],
    ["Graeme Smith", "South Africa", "BATTER"],
    ["AB de Villiers", "South Africa", "WICKETKEEPER"],
    ["Mark Boucher", "South Africa", "WICKETKEEPER"],
    ["Herschelle Gibbs", "South Africa", "BATTER"],
    ["Sanath Jayasuriya", "Sri Lanka", "ALL-ROUNDER"],
    ["Aravinda de Silva", "Sri Lanka", "BATTER"],
    ["Chaminda Vaas", "Sri Lanka", "BOWLER"],
    ["Courtney Walsh", "West Indies", "BOWLER"],
    ["Joel Garner", "West Indies", "BOWLER"],
    ["Clive Lloyd", "West Indies", "BATTER"],
    ["Kapil Dev", "India", "ALL-ROUNDER"],
    ["Sunil Gavaskar", "India", "BATTER"],
    ["Ravi Shastri", "India", "ALL-ROUNDER"],
    ["Dilip Vengsarkar", "India", "BATTER"],
    ["Mohinder Amarnath", "India", "ALL-ROUNDER"],
    ["Ian Healy", "Australia", "WICKETKEEPER"],
    ["Mark Waugh", "Australia", "BATTER"],
    ["Steve Waugh", "Australia", "BATTER"],
    ["Dennis Lillee", "Australia", "BOWLER"],
  ]},
  { set: "BA1", category: "Legend Batters", base: 100, players: [
    ["Hashim Amla", "South Africa", "BATTER"],
    ["Alastair Cook", "England", "BATTER"],
    ["Jonathan Trott", "England", "BATTER"],
    ["Alviro Petersen", "South Africa", "BATTER"],
    ["JP Duminy", "South Africa", "BATTER"],
    ["Tillakaratne Dilshan", "Sri Lanka", "BATTER"],
    ["Upul Tharanga", "Sri Lanka", "BATTER"],
    ["Tamim Iqbal", "Bangladesh", "BATTER"],
    ["Shakib Al Hasan", "Bangladesh", "ALL-ROUNDER"],
    ["Mushfiqur Rahim", "Bangladesh", "WICKETKEEPER"],
    ["Ross Taylor", "New Zealand", "BATTER"],
    ["Nathan Astle", "New Zealand", "BATTER"],
    ["Mark Ramprakash", "England", "BATTER"],
    ["Marcus Trescothick", "England", "BATTER"],
    ["Praveen Amre", "India", "BATTER"],
    ["Naman Ojha", "India", "WICKETKEEPER"],
  ]},
  { set: "BA2", category: "Legend Batters", base: 75, players: [
    ["Manish Pandey", "India", "BATTER"],
    ["Dinesh Karthik", "India", "WICKETKEEPER"],
    ["Parthiv Patel", "India", "WICKETKEEPER"],
    ["Wriddhiman Saha", "India", "WICKETKEEPER"],
    ["Ajinkya Rahane", "India", "BATTER"],
    ["Cheteshwar Pujara", "India", "BATTER"],
    ["Murali Vijay", "India", "BATTER"],
    ["Shikhar Dhawan", "India", "BATTER"],
    ["KL Rahul", "India", "BATTER"],
    ["Mayank Agarwal", "India", "BATTER"],
    ["David Hussey", "Australia", "BATTER"],
    ["Michael Hussey", "Australia", "BATTER"],
    ["Brad Haddin", "Australia", "WICKETKEEPER"],
    ["Paul Collingwood", "England", "ALL-ROUNDER"],
    ["Eoin Morgan", "England", "BATTER"],
  ]},
  { set: "AL1", category: "Legend All-Rounders", base: 100, players: [
    ["Ben Stokes", "England", "ALL-ROUNDER"],
    ["Jos Buttler", "England", "WICKETKEEPER"],
    ["Hardik Pandya", "India", "ALL-ROUNDER"],
    ["Ravindra Jadeja", "India", "ALL-ROUNDER"],
    ["Kieron Pollard", "West Indies", "ALL-ROUNDER"],
    ["Jason Holder", "West Indies", "ALL-ROUNDER"],
    ["Carlos Brathwaite", "West Indies", "ALL-ROUNDER"],
    ["Mitchell Marsh", "Australia", "ALL-ROUNDER"],
    ["Marcus Stoinis", "Australia", "ALL-ROUNDER"],
    ["Daniel Christian", "Australia", "ALL-ROUNDER"],
    ["Sam Curran", "England", "ALL-ROUNDER"],
    ["Chris Woakes", "England", "ALL-ROUNDER"],
    ["Liam Livingstone", "England", "ALL-ROUNDER"],
    ["Thisara Perera", "Sri Lanka", "ALL-ROUNDER"],
    ["Angelo Mathews", "Sri Lanka", "ALL-ROUNDER"],
  ]},
  { set: "AL2", category: "Legend All-Rounders", base: 75, players: [
    ["Yusuf Pathan", "India", "ALL-ROUNDER"],
    ["Stuart Binny", "India", "ALL-ROUNDER"],
    ["Rishi Dhawan", "India", "ALL-ROUNDER"],
    ["Axar Patel", "India", "ALL-ROUNDER"],
    ["Ravichandran Ashwin", "India", "ALL-ROUNDER"],
    ["Jean-Paul Duminy", "South Africa", "ALL-ROUNDER"],
    ["Ryan McLaren", "South Africa", "ALL-ROUNDER"],
    ["Albie Morkel", "South Africa", "ALL-ROUNDER"],
    ["Grant Elliott", "New Zealand", "ALL-ROUNDER"],
    ["Corey Anderson", "New Zealand", "ALL-ROUNDER"],
    ["James Faulkner", "Australia", "ALL-ROUNDER"],
    ["Moeen Ali", "England", "ALL-ROUNDER"],
  ]},
  { set: "WK1", category: "Legend Wicket-Keepers", base: 100, players: [
    ["Jos Buttler", "England", "WICKETKEEPER"],
    ["Quinton de Kock", "South Africa", "WICKETKEEPER"],
    ["Jonny Bairstow", "England", "WICKETKEEPER"],
    ["Alex Carey", "Australia", "WICKETKEEPER"],
    ["Nicholas Pooran", "West Indies", "WICKETKEEPER"],
    ["Rishabh Pant", "India", "WICKETKEEPER"],
    ["Sanju Samson", "India", "WICKETKEEPER"],
    ["Heinrich Klaasen", "South Africa", "WICKETKEEPER"],
    ["Tom Banton", "England", "WICKETKEEPER"],
    ["Tim Seifert", "New Zealand", "WICKETKEEPER"],
  ]},
  { set: "FA1", category: "Legend Fast Bowlers", base: 100, players: [
    ["Jasprit Bumrah", "India", "BOWLER"],
    ["Mohammed Shami", "India", "BOWLER"],
    ["Bhuvneshwar Kumar", "India", "BOWLER"],
    ["Umesh Yadav", "India", "BOWLER"],
    ["Ishant Sharma", "India", "BOWLER"],
    ["Mitchell Starc", "Australia", "BOWLER"],
    ["Pat Cummins", "Australia", "BOWLER"],
    ["Josh Hazlewood", "Australia", "BOWLER"],
    ["Trent Boult", "New Zealand", "BOWLER"],
    ["Tim Southee", "New Zealand", "BOWLER"],
    ["Kagiso Rabada", "South Africa", "BOWLER"],
    ["Anrich Nortje", "South Africa", "BOWLER"],
    ["Jofra Archer", "England", "BOWLER"],
    ["Mark Wood", "England", "BOWLER"],
    ["Kemar Roach", "West Indies", "BOWLER"],
  ]},
  { set: "FA2", category: "Legend Fast Bowlers", base: 75, players: [
    ["Deepak Chahar", "India", "BOWLER"],
    ["Arshdeep Singh", "India", "BOWLER"],
    ["Mohammed Siraj", "India", "BOWLER"],
    ["Shardul Thakur", "India", "BOWLER"],
    ["Nathan Coulter-Nile", "Australia", "BOWLER"],
    ["Andrew Tye", "Australia", "BOWLER"],
    ["Kane Richardson", "Australia", "BOWLER"],
    ["Chris Jordan", "England", "BOWLER"],
    ["Tom Curran", "England", "BOWLER"],
    ["Lungi Ngidi", "South Africa", "BOWLER"],
    ["Alzarri Joseph", "West Indies", "BOWLER"],
    ["Obed McCoy", "West Indies", "BOWLER"],
  ]},
  { set: "SP1", category: "Legend Spinners", base: 100, players: [
    ["R Ashwin", "India", "BOWLER", "Right-arm offbreak"],
    ["Ravindra Jadeja", "India", "BOWLER", "Left-arm orthodox"],
    ["Kuldeep Yadav", "India", "BOWLER", "Left-arm wrist-spin"],
    ["Yuzvendra Chahal", "India", "BOWLER", "Right-arm legbreak"],
    ["Amit Mishra", "India", "BOWLER", "Right-arm legbreak"],
    ["Pragyan Ojha", "India", "BOWLER", "Left-arm orthodox"],
    ["Nathan Lyon", "Australia", "BOWLER", "Right-arm offbreak"],
    ["Adam Zampa", "Australia", "BOWLER", "Right-arm legbreak"],
    ["Rashid Khan", "Afghanistan", "BOWLER", "Right-arm legbreak"],
    ["Mujeeb Ur Rahman", "Afghanistan", "BOWLER", "Right-arm offbreak"],
    ["Adil Rashid", "England", "BOWLER", "Right-arm legbreak"],
    ["Imran Tahir", "South Africa", "BOWLER", "Right-arm legbreak"],
  ]},
  { set: "SP2", category: "Legend Spinners", base: 75, players: [
    ["Piyush Chawla", "India", "BOWLER", "Right-arm legbreak"],
    ["Shahbaz Nadeem", "India", "BOWLER", "Left-arm orthodox"],
    ["Washington Sundar", "India", "BOWLER", "Right-arm offbreak"],
    ["Varun Chakravarthy", "India", "BOWLER", "Right-arm mystery"],
    ["Sunil Narine", "West Indies", "BOWLER", "Right-arm offbreak"],
    ["Samuel Badree", "West Indies", "BOWLER", "Right-arm legbreak"],
    ["Shadab Khan", "Pakistan", "BOWLER", "Right-arm legbreak"],
    ["Saeed Ajmal", "Pakistan", "BOWLER", "Right-arm offbreak"],
    ["Daniel Vettori", "New Zealand", "BOWLER", "Left-arm orthodox"],
    ["Mitchell Santner", "New Zealand", "BOWLER", "Left-arm orthodox"],
  ]},
];

const seen = new Set();
const players = [];
let id = 1;

for (const pool of pools) {
  for (const row of pool.players) {
    const [name, country, role, bowling] = row;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const p = entry(name, country, role, pool.set, pool.category, pool.base, bowling);
    players.push({ id: `LG${String(id++).padStart(3, "0")}`, ...p });
  }
}

const output = { categories, players };
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${players.length} legend players to ${outPath}`);
