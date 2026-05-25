/**
 * Fixes role/set/category mismatches and assigns Marquee M1 (25) + M2 (25).
 * Run: node scripts/fix-player-data.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "../src/data/players.json");
const MARQUEE_TS_PATH = path.join(__dirname, "../src/data/marqueeList.ts");

/** Retained / missing-from-PDF players — correct IPL roles */
const PLAYER_PROFILES = {
  "varun chakaravarthy": { role: "BOWLER", bowlingStyle: "Right-arm Legbreak" },
  "manimaran siddharth": { role: "BOWLER", bowlingStyle: "Left-arm Orthodox" },
  "m. siddharth": { role: "BOWLER", bowlingStyle: "Left-arm Orthodox" },
  "digvesh rathi": { role: "BOWLER", bowlingStyle: "Left-arm Orthodox" },
  "sai kishore": { role: "BOWLER", bowlingStyle: "Left-arm Orthodox" },
  "khaleel ahmed": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "mohsin khan": { role: "BOWLER", bowlingStyle: "Left-arm Fast" },
  "rasikh salam": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "ramakrishna ghosh": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "noor ahmad": { role: "BOWLER", bowlingStyle: "Left-arm Wrist Spin" },
  "mukesh choudhary": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "nathan ellis": { role: "BOWLER", bowlingStyle: "Right-arm Fast Medium" },
  "shreyas gopal": { role: "BOWLER", bowlingStyle: "Right-arm Legbreak" },
  "gurjapneet singh": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "anshul kamboj": { role: "BOWLER", bowlingStyle: "Right-arm Fast Medium" },
  "jasprit bumrah": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "trent boult": { role: "BOWLER", bowlingStyle: "Left-arm Fast" },
  "deepak chahar": { role: "BOWLER", bowlingStyle: "Right-arm Medium" },
  "shardul thakur": { role: "BOWLER", bowlingStyle: "Right-arm Medium" },
  "mayank markande": { role: "BOWLER", bowlingStyle: "Right-arm Legbreak" },
  "yash dayal": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "bhuvneshwar kumar": { role: "BOWLER", bowlingStyle: "Right-arm Medium" },
  "nuwan thushara": { role: "BOWLER", bowlingStyle: "Right-arm Fast Medium" },
  "suyash sharma": { role: "BOWLER", bowlingStyle: "Right-arm Legbreak" },
  "mitchell starc": { role: "BOWLER", bowlingStyle: "Left-arm Fast" },
  "t natarajan": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "mukesh kumar": { role: "BOWLER", bowlingStyle: "Right-arm Medium" },
  "dushmantha chameera": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "kuldeep yadav": { role: "BOWLER", bowlingStyle: "Left-arm Chinaman" },
  "yuzvendra chahal": { role: "BOWLER", bowlingStyle: "Right-arm Legbreak" },
  "arshdeep singh": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "harshal patel": { role: "BOWLER", bowlingStyle: "Right-arm Medium" },
  "jaydev unadkat": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "brydon carse": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "eshan malinga": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "zeeshan ansari": { role: "BOWLER", bowlingStyle: "Right-arm Legbreak" },
  "harpreet brar": { role: "BOWLER", bowlingStyle: "Left-arm Orthodox" },
  "lockie ferguson": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "vyshak vijay kumar": { role: "BOWLER", bowlingStyle: "Right-arm Medium" },
  "yash thakur": { role: "BOWLER", bowlingStyle: "Right-arm Medium" },
  "prince yadav": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "akash singh": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "mohammed shami": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "arjun tendulkar": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "mohammed siraj": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "prasidh krishna": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "ishant sharma": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "gurnoor singh brar": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "rashid khan": { role: "BOWLER", bowlingStyle: "Right-arm Legbreak" },
  "manav suthar": { role: "BOWLER", bowlingStyle: "Left-arm Orthodox" },
  "jayant yadav": { role: "BOWLER", bowlingStyle: "Right-arm Offbreak" },
  "kagiso rabada": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "jofra archer": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "tushar deshpande": { role: "BOWLER", bowlingStyle: "Left-arm Medium" },
  "kwena maphaka": { role: "BOWLER", bowlingStyle: "Left-arm Fast" },
  "nandre burger": { role: "BOWLER", bowlingStyle: "Left-arm Fast" },
  "avesh khan": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "mayank yadav": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "umran malik": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "vaibhav arora": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "harshit rana": { role: "BOWLER", bowlingStyle: "Right-arm Fast" },
  "anukul roy": { role: "BOWLER", bowlingStyle: "Left-arm Orthodox" },
  "jamie overton": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Fast Medium" },
  "shivam dube": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Medium" },
  "hardik pandya": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Medium" },
  "mitchell santner": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Orthodox" },
  "corbin bosch": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Fast Medium" },
  "am ghazanfar": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Off Spin" },
  "ashwani kumar": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Medium" },
  "krunal pandya": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Orthodox" },
  "swapnil singh": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Orthodox" },
  "axar patel": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Orthodox" },
  "vipraj nigam": { role: "ALL-ROUNDER", bowlingStyle: "Legbreak" },
  "ajay mandal": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Orthodox" },
  "nitish kumar reddy": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Medium" },
  "kamindu mendis": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Off Spin" },
  "marcus stoinis": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Medium" },
  "azmatullah omarzai": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Medium" },
  "marco jansen": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Fast" },
  "yudhvir charak": { role: "ALL-ROUNDER", bowlingStyle: "Legbreak" },
  "ravindra jadeja": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Orthodox" },
  "sam curran": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Fast Medium" },
  "washington sundar": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Offbreak" },
  "arshad khan": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Orthodox" },
  "shahbaz ahmed": { role: "ALL-ROUNDER", bowlingStyle: "Left-arm Orthodox" },
  "arshin kulkarni": { role: "ALL-ROUNDER", bowlingStyle: "Right-arm Medium" },
  "ms dhoni": { role: "WICKETKEEPER", battingStyle: "RHB" },
  "sanju samson": { role: "WICKETKEEPER", battingStyle: "RHB" },
  "urvil patel": { role: "WICKETKEEPER", battingStyle: "RHB" },
  "ayush mhatre": { role: "WICKETKEEPER", battingStyle: "RHB" },
  "ryan rickelton": { role: "WICKETKEEPER", battingStyle: "LHB" },
  "jitesh sharma": { role: "WICKETKEEPER", battingStyle: "RHB" },
  "abishek porel": { role: "WICKETKEEPER", battingStyle: "LHB" },
  "tristan stubbs": { role: "WICKETKEEPER", battingStyle: "RHB" },
  "ishan kishan": { role: "WICKETKEEPER", battingStyle: "LHB" },
  "prabhsimran singh": { role: "WICKETKEEPER", battingStyle: "LHB" },
  "kumar kushagra": { role: "WICKETKEEPER", battingStyle: "RHB" },
  "anuj rawat": { role: "WICKETKEEPER", battingStyle: "LHB" },
  "dhruv jurel": { role: "WICKETKEEPER", battingStyle: "RHB" },
  "vishnu vinod": { role: "WICKETKEEPER", battingStyle: "RHB" },
};

/** Marquee Set 1 (25) + Set 2 (25) = 50 total — IPL 2026 mega tier */
export const MARQUEE_M1_IDS = [
  "P406", "P386", "P501", "P389", "P521", "P423", "P468", "P370", "P487", "P453",
  "P505", "P409", "P457", "P001", "P003", "P077", "P005", "P388", "P499", "P454",
  "P500", "P407", "P488", "P446", "P390",
];

export const MARQUEE_M2_IDS = [
  "P387", "P511", "P434", "P512", "P538", "P476", "P475", "P029", "P030", "P392",
  "P452", "P516", "P448", "P378", "P471", "P427", "P456", "P008", "P010", "P011",
  "P013", "P473", "P528", "P520", "P461",
];

const MARQUEE_ALL = new Set([...MARQUEE_M1_IDS, ...MARQUEE_M2_IDS]);
const MARQUEE_M1 = new Set(MARQUEE_M1_IDS);
const MARQUEE_M2 = new Set(MARQUEE_M2_IDS);
const MARQUEE_BASE = 20_000_000;

/** IPL 2026 retained uncapped players — domestic, no active intl cap (incl. MS Dhoni per BCCI rule) */
const UNCAPPED_RETAINED_2026 = new Set([
  "ms dhoni", "ayush mhatre", "urvil patel", "gurjapneet singh", "mukesh choudhary", "anshul kamboj", "shreyas gopal",
  "robin minz", "naman dhir", "raghu sharma", "ashwani kumar", "raj angad bawa",
  "abhinandan singh", "rasikh salam",
  "sameer rizqvi", "ashutosh sharma", "vipraj nigam", "ajay mandal", "tripurana vijay", "madhav tiwari",
  "angkrish raghuvanshi", "anukul roy", "harshit rana", "ramandeep singh", "umran malik", "vaibhav arora",
  "aniket verma", "harsh dubey", "zeeshan ansari",
  "prabhsimran singh", "priyansh arya", "shashank singh", "nehal wadhera", "harpreet brar", "musheer khan",
  "suryansh shedge", "mitchell owen", "vyshak vijaykumar", "yash thakur", "vishnu vinod", "harnoor pannu", "pyala avinash",
  "shubham dubey", "vaibhav suryavanshi", "yudhvir charak", "tushar deshpande",
  "sai sudharsan", "kumar kushagra", "nishant sindhu", "arshad khan", "shahrukh khan", "rahul tewatia",
  "gurnoor singh brar", "manav suthar", "sai kishore", "jayant yadav",
  "ayush badoni", "himmat singh", "abdul samad", "shahbaz ahmed", "arshin kulkarni", "mayank yadav",
  "mohsin khan", "digvesh rathi", "prince yadav", "akash singh", "arjun tendulkar",
].map((n) => n.toLowerCase()));

function normName(name) {
  return name.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function isSpinner(bowlingStyle) {
  const s = (bowlingStyle || "").toLowerCase();
  return /spin|leg|off|orthodox|chinaman|wrist/.test(s);
}

function defaultSetForRole(role, bowlingStyle) {
  if (role === "BATTER") return "BA2";
  if (role === "ALL-ROUNDER") return "AL1";
  if (role === "WICKETKEEPER") return "WK1";
  if (role === "BOWLER") return isSpinner(bowlingStyle) ? "SP1" : "FA1";
  return "BA2";
}

function setCategory(set, role, bowlingStyle) {
  if (set === "M1" || set === "M2") return "Marquee Players";
  if (set.startsWith("UBA") || set.startsWith("UAL") || set.startsWith("UWK") || set.startsWith("UFA") || set.startsWith("USP")) return "Uncapped";
  if (set.startsWith("BA")) return "Batters";
  if (set.startsWith("AL")) return "All-Rounders";
  if (set.startsWith("WK")) return "Wicket-Keepers";
  if (set.startsWith("FA")) return "Fast Bowlers";
  if (set.startsWith("SP")) return "Spin Bowlers";
  if (role === "BATTER") return "Batters";
  if (role === "ALL-ROUNDER") return "All-Rounders";
  if (role === "WICKETKEEPER") return "Wicket-Keepers";
  return isSpinner(bowlingStyle) ? "Spin Bowlers" : "Fast Bowlers";
}

function inferRoleFromBowling(p) {
  const bs = (p.bowlingStyle || "").toLowerCase();
  if (!bs) return null;
  if (/fast|medium|seam/.test(bs) && !/spin|leg|off|orthodox/.test(bs)) return "BOWLER";
  if (/spin|leg|off|orthodox|chinaman|wrist/.test(bs)) return "BOWLER";
  return null;
}

function validateSetRole(p) {
  const set = p.set;
  if (set === "M1" || set === "M2") return null;
  if (set.startsWith("BA") && p.role !== "BATTER") return `role ${p.role} in batter set ${set}`;
  if (set.startsWith("AL") && !set.startsWith("UAL") && p.role !== "ALL-ROUNDER") return `role ${p.role} in AR set ${set}`;
  if (set.startsWith("WK") && !set.startsWith("UWK") && p.role !== "WICKETKEEPER") return `role ${p.role} in WK set ${set}`;
  if ((set.startsWith("FA") || set.startsWith("SP")) && !set.startsWith("UFA") && !set.startsWith("USP") && p.role !== "BOWLER") {
    return `role ${p.role} in bowler set ${set}`;
  }
  return null;
}

function buildCategories(players) {
  const groups = {
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
    if (cat === "Marquee Players") groups.marquee.sets.push(p.set);
    else if (cat === "Batters") groups.batters.sets.push(p.set);
    else if (cat === "All-Rounders") groups.allrounders.sets.push(p.set);
    else if (cat === "Wicket-Keepers") groups.wicketkeepers.sets.push(p.set);
    else if (cat === "Fast Bowlers") groups.fast_bowlers.sets.push(p.set);
    else if (cat === "Spin Bowlers") groups.spinners.sets.push(p.set);
    else groups.uncapped.sets.push(p.set);
  }

  const sortSets = (a, b) => {
    const order = (s) => {
      if (s.startsWith("M")) return `0-${s}`;
      return `1-${s}`;
    };
    return order(a).localeCompare(order(b), undefined, { numeric: true });
  };
  for (const g of Object.values(groups)) g.sets.sort(sortSets);
  return Object.values(groups).filter((g) => g.sets.length > 0);
}

function writeMarqueeListTs() {
  const content = `/**
 * Marquee players — IPL 2026 mega auction (2 sets × 20 = 40).
 * Regenerate: node scripts/fix-player-data.mjs
 */
export const MARQUEE_M1_IDS: readonly string[] = [
  ${MARQUEE_M1_IDS.map((id) => `"${id}"`).join(", ")}
] as const;

export const MARQUEE_M2_IDS: readonly string[] = [
  ${MARQUEE_M2_IDS.map((id) => `"${id}"`).join(", ")}
] as const;

export const MARQUEE_PLAYER_IDS: readonly string[] = [
  ...MARQUEE_M1_IDS,
  ...MARQUEE_M2_IDS,
] as const;

export const MARQUEE_SETS = ["M1", "M2"] as const;
export const MARQUEE_SIZE = 50;
export const MARQUEE_SET_SIZE = 25;

/** @deprecated use MARQUEE_SETS */
export const MARQUEE_SET = "M1";
`;
  fs.writeFileSync(MARQUEE_TS_PATH, content);
}

function main() {
  const data = JSON.parse(fs.readFileSync(PLAYERS_PATH, "utf-8"));
  let profileFixed = 0;
  let demotedFromMarquee = 0;
  let promotedMarquee = 0;
  const errors = [];

  for (const p of data.players) {
    const profile = PLAYER_PROFILES[normName(p.name)];
    if (profile) {
      if (profile.role) p.role = profile.role;
      if (profile.bowlingStyle) p.bowlingStyle = profile.bowlingStyle;
      if (profile.battingStyle) p.battingStyle = profile.battingStyle;
      profileFixed++;
    } else {
      const inferred = inferRoleFromBowling(p);
      if (inferred && p.role === "BATTER" && p.set.startsWith("BA") && !MARQUEE_ALL.has(p.id)) {
        const bs = (p.bowlingStyle || "").toLowerCase();
        if (/fast|medium|seam/.test(bs) && !/leg|off|orthodox|spin/.test(bs)) {
          // batting allrounders with only leg spin in PDF stay as BATTER (Sarfaraz etc.)
        }
      }
    }

    if (MARQUEE_M1.has(p.id)) {
      p.set = "M1";
      p.category = "Marquee Players";
      p.basePrice = MARQUEE_BASE;
      promotedMarquee++;
    } else if (MARQUEE_M2.has(p.id)) {
      p.set = "M2";
      p.category = "Marquee Players";
      p.basePrice = MARQUEE_BASE;
      promotedMarquee++;
    } else if (p.set === "BA1" || p.set === "M1" || p.set === "M2") {
      const newSet = defaultSetForRole(p.role, p.bowlingStyle);
      p.set = newSet;
      p.category = setCategory(newSet, p.role, p.bowlingStyle);
      demotedFromMarquee++;
    }

    if (!MARQUEE_ALL.has(p.id)) {
      const err = validateSetRole(p);
      if (err) {
        const newSet = defaultSetForRole(p.role, p.bowlingStyle);
        p.set = newSet;
        p.category = setCategory(newSet, p.role, p.bowlingStyle);
        profileFixed++;
        const recheck = validateSetRole(p);
        if (recheck) errors.push(`${p.name}: ${recheck}`);
      }
    }

    p.category = setCategory(p.set, p.role, p.bowlingStyle);
  }

  for (const p of data.players) {
    if (UNCAPPED_RETAINED_2026.has(normName(p.name))) {
      p.isCapped = false;
      if (!MARQUEE_ALL.has(p.id) && p.basePrice >= 20_000_000) {
        p.basePrice = 4_000_000;
      }
    }
  }

  data.categories = buildCategories(data.players);
  fs.writeFileSync(PLAYERS_PATH, JSON.stringify(data, null, 2) + "\n");
  writeMarqueeListTs();

  const m1 = data.players.filter((p) => p.set === "M1");
  const m2 = data.players.filter((p) => p.set === "M2");
  const remainingErrors = data.players.filter((p) => validateSetRole(p));

  console.log(`Profile/role fixes applied: ${profileFixed}`);
  console.log(`Marquee promoted: ${promotedMarquee} (M1=${m1.length}, M2=${m2.length})`);
  console.log(`Demoted from old marquee: ${demotedFromMarquee}`);
  console.log(`Set/role validation errors remaining: ${remainingErrors.length}`);
  if (remainingErrors.length) {
    remainingErrors.slice(0, 15).forEach((p) => console.log(" -", p.name, p.role, p.set));
  }
  if (errors.length) console.log("Manual review:", errors);

  const checkNames = ["Varun Chakaravarthy", "Manimaran Siddharth", "Digvesh Rathi", "Sai Kishore", "Khaleel Ahmed"];
  for (const n of checkNames) {
    const p = data.players.find((x) => x.name === n);
    console.log(`✓ ${n}: ${p?.role} · ${p?.set} · ${p?.category}`);
  }
}

main();
