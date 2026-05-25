/**
 * Generates src/data/players.json from the official BCCI IPL 2026 auction list PDF
 * Source: https://documents.iplt20.com/bcci/documents/1765197869375_TATA-IPL-2026-Auction-List-8.12.25.pdf
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PDF_URL =
  "https://documents.iplt20.com/bcci/documents/1765197869375_TATA-IPL-2026-Auction-List-8.12.25.pdf";
const LOCAL_PDF_TEXT = path.join(__dirname, "auction-list-2026.txt");

const COUNTRIES = [
  "New Zealand",
  "South Africa",
  "Sri Lanka",
  "West Indies",
  "Afghanistan",
  "Bangladesh",
  "Australia",
  "England",
  "Zimbabwe",
  "Ireland",
  "Malaysia",
  "India",
];

const IPL_TEAMS = new Set([
  "CSK", "MI", "RCB", "DC", "KKR", "SRH", "PBKS", "RR", "GT", "LSG",
]);

const RETENTIONS_2026 = {
  CSK: ["Ruturaj Gaikwad", "MS Dhoni", "Dewald Brevis", "Ayush Mhatre", "Urvil Patel", "Anshul Kamboj", "Jamie Overton", "Ramakrishna Ghosh", "Shivam Dube", "Khaleel Ahmed", "Noor Ahmad", "Mukesh Choudhary", "Nathan Ellis", "Shreyas Gopal", "Gurjapneet Singh", "Sanju Samson"],
  MI: ["Rohit Sharma", "Jasprit Bumrah", "Hardik Pandya", "Suryakumar Yadav", "Tilak Varma", "Mitchell Santner", "Trent Boult", "Deepak Chahar", "Will Jacks", "Ryan Rickelton", "Corbin Bosch", "AM Ghazanfar", "Ashwani Kumar", "Naman Dhir", "Raghu Sharma", "Raj Angad Bawa", "Robin Minz", "Sherfane Rutherford", "Shardul Thakur", "Mayank Markande"],
  RCB: ["Virat Kohli", "Rajat Patidar", "Devdutt Padikkal", "Phil Salt", "Jitesh Sharma", "Krunal Pandya", "Swapnil Singh", "Tim David", "Romario Shepherd", "Jacob Bethell", "Josh Hazlewood", "Yash Dayal", "Bhuvneshwar Kumar", "Nuwan Thushara", "Rasikh Salam", "Abhinandan Singh", "Suyash Sharma"],
  DC: ["KL Rahul", "Karun Nair", "Abishek Porel", "Tristan Stubbs", "Axar Patel", "Sameer Rizvi", "Ashutosh Sharma", "Vipraj Nigam", "Ajay Mandal", "Tripurana Vijay", "Madhav Tiwari", "Mitchell Starc", "T Natarajan", "Mukesh Kumar", "Dushmantha Chameera", "Kuldeep Yadav", "Nitish Rana"],
  KKR: ["Ajinkya Rahane", "Angkrish Raghuvanshi", "Anukul Roy", "Harshit Rana", "Manish Pandey", "Ramandeep Singh", "Rinku Singh", "Rovman Powell", "Sunil Narine", "Umran Malik", "Vaibhav Arora", "Varun Chakaravarthy"],
  SRH: ["Pat Cummins", "Travis Head", "Abhishek Sharma", "Aniket Verma", "Ishan Kishan", "Heinrich Klaasen", "Nitish Kumar Reddy", "Harsh Dubey", "Kamindu Mendis", "Harshal Patel", "Brydon Carse", "Jaydev Unadkat", "Eshan Malinga", "Zeeshan Ansari"],
  PBKS: ["Prabhsimran Singh", "Priyansh Arya", "Shreyas Iyer", "Shashank Singh", "Nehal Wadhera", "Marcus Stoinis", "Azmatullah Omarzai", "Marco Jansen", "Harpreet Brar", "Yuzvendra Chahal", "Arshdeep Singh", "Musheer Khan", "Suryansh Shedge", "Mitchell Owen", "Xavier Bartlett", "Lockie Ferguson", "Vyshak Vijaykumar", "Yash Thakur", "Vishnu Vinod", "Harnoor Pannu", "Pyala Avinash"],
  RR: ["Yashasvi Jaiswal", "Riyan Parag", "Shimron Hetmyer", "Shubham Dubey", "Vaibhav Suryavanshi", "Dhruv Jurel", "Yudhvir Charak", "Jofra Archer", "Tushar Deshpande", "Kwena Maphaka", "Nandre Burger", "Lhuan-Dre Pretorius", "Ravindra Jadeja", "Sam Curran"],
  GT: ["Shubman Gill", "Sai Sudharsan", "Kumar Kushagra", "Anuj Rawat", "Jos Buttler", "Nishant Sindhu", "Washington Sundar", "Arshad Khan", "Shahrukh Khan", "Rahul Tewatia", "Kagiso Rabada", "Mohammed Siraj", "Prasidh Krishna", "Ishant Sharma", "Gurnoor Singh Brar", "Rashid Khan", "Manav Suthar", "Sai Kishore", "Jayant Yadav", "Glenn Phillips"],
  LSG: ["Rishabh Pant", "Ayush Badoni", "Aiden Markram", "Matthew Breetzke", "Himmat Singh", "Abdul Samad", "Nicholas Pooran", "Mitchell Marsh", "Shahbaz Ahmed", "Arshin Kulkarni", "Mayank Yadav", "Avesh Khan", "Mohsin Khan", "Manimaran Siddharth", "Digvesh Rathi", "Prince Yadav", "Akash Singh", "Mohammed Shami", "Arjun Tendulkar"],
};

const NAME_ALIASES = {
  "auqib nabi dar": "auqib dar",
  "surya kumar yadav": "suryakumar yadav",
  "t. natarajan": "t natarajan",
  "vaibhav sooryavanshi": "vaibhav suryavanshi",
  "allah ghazanfar": "am ghazanfar",
  "shahbaz ahamad": "shahbaz ahmed",
  "m. siddharth": "manimaran siddharth",
  "manimaran siddharth": "manimaran siddharth",
  "lhuan-dre pretorius": "lhuan-dre pretorius",
  "donovan ferreira": "donovan ferreira",
};

function normName(name) {
  const n = name.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
  return NAME_ALIASES[n] || n;
}

function setCategory(set, specialism, bowlingStyle) {
  if (set.startsWith("UBA")) return "Uncapped";
  if (set.startsWith("UAL")) return "Uncapped";
  if (set.startsWith("UWK")) return "Uncapped";
  if (set.startsWith("UFA")) return "Uncapped";
  if (set.startsWith("USP")) return "Uncapped";
  if (set.startsWith("M") || set === "BA1") return "Marquee Players";
  if (set.startsWith("BA")) return "Batters";
  if (set.startsWith("AL")) return "All-Rounders";
  if (set.startsWith("WK")) return "Wicket-Keepers";
  if (set.startsWith("FA")) return "Fast Bowlers";
  if (set.startsWith("SP")) return "Spin Bowlers";
  if (specialism === "BATTER") return "Batters";
  if (specialism === "ALL-ROUNDER") return "All-Rounders";
  if (specialism === "WICKETKEEPER") return "Wicket-Keepers";
  const spin = bowlingStyle && /spin|orthodox|unorthodox|leg/i.test(bowlingStyle);
  return spin ? "Spin Bowlers" : "Fast Bowlers";
}

function mapRole(specialism) {
  if (specialism === "WICKETKEEPER") return "WICKETKEEPER";
  if (specialism === "ALL-ROUNDER") return "ALL-ROUNDER";
  if (specialism === "BATTER") return "BATTER";
  return "BOWLER";
}

function parsePlayerLine(line) {
  const m = line.match(/^(\d+)\s+(\d+)\s+([A-Z]+\d+)\s+(.+)$/);
  if (!m) return null;

  const [, sr, , set, rest] = m;
  const capMatch = rest.match(/\s(Capped|Uncapped|Associate)\s+(\d+)\s+([\w\s.-]+)$/);
  if (!capMatch) return null;

  const capStatus = capMatch[1];
  const reservePrice = parseInt(capMatch[2], 10);
  let body = rest.slice(0, capMatch.index).trim();

  // Strip trailing IPL team + games played before cap status
  const teamMatch = body.match(/\s(CSK|MI|RCB|DC|KKR|SRH|PBKS|RR|GT|LSG|\d+)\s+\d+\s*$/);
  if (teamMatch) body = body.slice(0, teamMatch.index).trim();

  // Find country
  let country = null;
  let countryIdx = -1;
  for (const c of COUNTRIES) {
    const idx = body.indexOf(` ${c} `);
    if (idx !== -1) {
      country = c;
      countryIdx = idx;
      break;
    }
    if (body.endsWith(` ${c}`)) {
      country = c;
      countryIdx = body.lastIndexOf(` ${c}`);
      break;
    }
  }
  if (!country) return null;

  const namePart = body.slice(0, countryIdx).trim();
  let afterCountry = body.slice(countryIdx + country.length + 1).trim();

  // Name split: last token is usually surname unless multi-word surname at end of PDF
  const nameTokens = namePart.split(/\s+/);
  let firstName, surname;
  if (nameTokens.length === 1) {
    firstName = nameTokens[0];
    surname = capMatch[3].trim();
  } else {
    surname = nameTokens.pop();
    firstName = nameTokens.join(" ");
    // Handle "De Kock", "Ul Haq" style - check if surname matches end token only
    if (namePart.includes(" De ") || namePart.includes(" Ul ") || namePart.includes(" Al ")) {
      const parts = namePart.split(/\s+/);
      if (parts.length >= 3) {
        surname = parts.slice(-2).join(" ");
        firstName = parts.slice(0, -2).join(" ");
      }
    }
  }

  const fullName = `${firstName} ${surname}`.replace(/\s+/g, " ").trim();

  // Parse DOB and age
  const dobMatch = afterCountry.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(BATTER|ALL-ROUNDER|WICKETKEEPER|BOWLER)\s+(LHB|RHB)(?:\s+(.+))?$/);
  if (!dobMatch) {
    // Try without bowling style tail
    const simple = afterCountry.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(BATTER|ALL-ROUNDER|WICKETKEEPER|BOWLER)\s+(LHB|RHB)/);
    if (!simple) return null;
    afterCountry = afterCountry; // keep
  }

  const dobAgeSpec = afterCountry.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(BATTER|ALL-ROUNDER|WICKETKEEPER|BOWLER)\s+(LHB|RHB)/);
  if (!dobAgeSpec) return null;

  const age = parseInt(dobAgeSpec[2], 10);
  const specialism = dobAgeSpec[3];
  const battingStyle = dobAgeSpec[4];

  let bowlingStyle;
  const afterBat = afterCountry.slice(afterCountry.indexOf(battingStyle) + battingStyle.length).trim();
  if (afterBat && !/^\d/.test(afterBat.split(/\s+/)[0])) {
    bowlingStyle = afterBat.replace(/\s+\d+(\s+\d+)*\s*$/, "").trim() || undefined;
  }

  // IPL 2025 team from original rest
  let previousTeam = "None";
  const origTeam = rest.match(/\s(CSK|MI|RCB|DC|KKR|SRH|PBKS|RR|GT|LSG)\s+\d+\s+(Capped|Uncapped|Associate)/);
  if (origTeam) previousTeam = origTeam[1];

  const isOverseas = country !== "India";
  const isCapped = capStatus === "Capped";

  return {
    sr: parseInt(sr, 10),
    set,
    name: fullName,
    country,
    role: mapRole(specialism),
    battingStyle,
    bowlingStyle: bowlingStyle || undefined,
    basePrice: reservePrice * 100000,
    isOverseas,
    previousTeam,
    category: setCategory(set, specialism, bowlingStyle),
    age,
    isCapped,
  };
}

function extractPdfLines(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\s+\d+\s+[A-Z]+\d+\s+/.test(l));
}

async function loadPdfText() {
  if (fs.existsSync(LOCAL_PDF_TEXT)) {
    return fs.readFileSync(LOCAL_PDF_TEXT, "utf8");
  }
  const res = await fetch(PDF_URL);
  if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // pdf-parse if available, else use bundled text from prior fetch
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buf);
    fs.writeFileSync(LOCAL_PDF_TEXT, data.text);
    return data.text;
  } catch {
    throw new Error(
      "Could not parse PDF. Place auction-list-2026.txt in scripts/ folder."
    );
  }
}

function buildCategories(players) {
  const setGroups = {
    marquee: { id: "marquee", name: "Marquee Players", sets: [] },
    batters: { id: "batters", name: "Batters", sets: [] },
    allrounders: { id: "allrounders", name: "All-Rounders", sets: [] },
    wicketkeepers: { id: "wicketkeepers", name: "Wicket-Keepers", sets: [] },
    fast_bowlers: { id: "fast_bowlers", name: "Fast Bowlers", sets: [] },
    spinners: { id: "spinners", name: "Spin Bowlers", sets: [] },
    uncapped: { id: "uncapped", name: "Uncapped", sets: [] },
  };

  const seen = new Set();
  for (const p of players) {
    if (seen.has(p.set)) continue;
    seen.add(p.set);
    const cat = p.category;
    if (cat === "Marquee Players") setGroups.marquee.sets.push(p.set);
    else if (cat === "Batters") setGroups.batters.sets.push(p.set);
    else if (cat === "All-Rounders") setGroups.allrounders.sets.push(p.set);
    else if (cat === "Wicket-Keepers") setGroups.wicketkeepers.sets.push(p.set);
    else if (cat === "Fast Bowlers") setGroups.fast_bowlers.sets.push(p.set);
    else if (cat === "Spin Bowlers") setGroups.spinners.sets.push(p.set);
    else setGroups.uncapped.sets.push(p.set);
  }

  const sortSets = (a, b) => {
    const pa = a.replace(/\d+/, "");
    const pb = b.replace(/\d+/, "");
    if (pa !== pb) return pa.localeCompare(pb);
    return parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]);
  };

  for (const g of Object.values(setGroups)) g.sets.sort(sortSets);
  return Object.values(setGroups).filter((g) => g.sets.length > 0);
}

function defaultSetForRole(role, bowlingStyle) {
  if (role === "BATTER") return "BA3";
  if (role === "ALL-ROUNDER") return "AL4";
  if (role === "WICKETKEEPER") return "WK2";
  if (role === "BOWLER") {
    if (bowlingStyle && /spin|orthodox|unorthodox|leg/i.test(bowlingStyle)) return "SP2";
    return "FA5";
  }
  return "BA3";
}

function normalizeRetainedPlayer(player, team) {
  const set = defaultSetForRole(player.role, player.bowlingStyle);
  return {
    ...player,
    previousTeam: team,
    set,
    category: setCategory(set, player.role === "WICKETKEEPER" ? "WICKETKEEPER" : player.role === "ALL-ROUNDER" ? "ALL-ROUNDER" : player.role === "BOWLER" ? "BOWLER" : "BATTER", player.bowlingStyle),
  };
}

function loadOldPlayers() {
  const p = path.join(ROOT, "src", "data", "players.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf8")).players;
}

function findOldPlayer(oldPlayers, name) {
  const n = normName(name);
  return oldPlayers.find((p) => normName(p.name) === n);
}

function retainedTeamMap() {
  const map = new Map();
  for (const [team, names] of Object.entries(RETENTIONS_2026)) {
    for (const name of names) map.set(normName(name), team);
  }
  return map;
}

async function main() {
  const pdfText = await loadPdfText();
  const lines = extractPdfLines(pdfText);
  const parsed = [];
  const failed = [];

  for (const line of lines) {
    const p = parsePlayerLine(line);
    if (p) parsed.push(p);
    else failed.push(line);
  }

  console.log(`Parsed ${parsed.length} auction players (${failed.length} failed)`);
  if (failed.length) console.warn("Failed lines:", failed.slice(0, 5));

  const oldPlayers = loadOldPlayers();
  const retainedMap = retainedTeamMap();
  const byName = new Map(parsed.map((p) => [normName(p.name), p]));

  // Add retained players missing from auction list
  for (const [team, names] of Object.entries(RETENTIONS_2026)) {
    for (const name of names) {
      const key = normName(name);
      if (byName.has(key)) {
        const existing = byName.get(key);
        if (existing.previousTeam === "None") existing.previousTeam = team;
        continue;
      }
      const old = findOldPlayer(oldPlayers, name);
      const player = old
        ? normalizeRetainedPlayer({ ...old, name, id: old.id || `RET${byName.size + 1}` }, team)
        : normalizeRetainedPlayer({
            id: `RET${String(byName.size + 1).padStart(3, "0")}`,
            name,
            country: "India",
            role: "BATTER",
            battingStyle: "RHB",
            basePrice: 20000000,
            isOverseas: false,
            age: 28,
            isCapped: true,
          }, team);
      byName.set(key, player);
    }
  }

  const allPlayers = Array.from(byName.values())
    .sort((a, b) => (a.sr || 9999) - (b.sr || 9999))
    .map((p, i) => ({
      id: p.id?.startsWith("RET") || p.id?.match(/^[A-Z]/)
        ? `P${String(i + 1).padStart(3, "0")}`
        : `P${String(i + 1).padStart(3, "0")}`,
      name: p.name,
      country: p.country,
      role: p.role,
      battingStyle: p.battingStyle,
      ...(p.bowlingStyle ? { bowlingStyle: p.bowlingStyle } : {}),
      basePrice: p.basePrice,
      isOverseas: p.isOverseas,
      previousTeam: p.previousTeam || retainedMap.get(normName(p.name)) || "None",
      category: p.category,
      set: p.set,
      age: p.age,
      isCapped: p.isCapped,
    }));

  const categories = buildCategories(allPlayers);
  const output = { categories, players: allPlayers };

  const outPath = path.join(ROOT, "src", "data", "players.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

  const overseas = allPlayers.filter((p) => p.isOverseas).length;
  const auctionOnly = parsed.length;
  const retained = allPlayers.length - auctionOnly + parsed.filter((p) => retainedMap.has(normName(p.name))).length;

  console.log(`\nWrote ${allPlayers.length} players to ${outPath}`);
  console.log(`  Auction list: ${auctionOnly}`);
  console.log(`  Overseas: ${overseas}`);
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Sets: ${new Set(allPlayers.map((p) => p.set)).size}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
