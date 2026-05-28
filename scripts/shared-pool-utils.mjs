/**
 * Shared helpers for generating league player JSON pools.
 */
export const CATEGORIES = [
  { id: "marquee", name: "Marquee Players", sets: ["M1", "M2"] },
  { id: "batters", name: "Batters", sets: ["BA1", "BA2", "BA3"] },
  { id: "allrounders", name: "All-Rounders", sets: ["AL1", "AL2", "AL3"] },
  { id: "wicketkeepers", name: "Wicket-Keepers", sets: ["WK1", "WK2"] },
  { id: "fast_bowlers", name: "Fast Bowlers", sets: ["FA1", "FA2", "FA3"] },
  { id: "spinners", name: "Spin Bowlers", sets: ["SP1", "SP2"] },
  { id: "uncapped", name: "Uncapped", sets: ["UBA1", "UAL1", "UWK1", "UFA1", "USP1"] },
];

const BASE_MAP = {
  M1: 200, M2: 200, BA1: 150, BA2: 75, BA3: 50,
  AL1: 150, AL2: 75, AL3: 50,
  WK1: 150, WK2: 75,
  FA1: 150, FA2: 75, FA3: 50,
  SP1: 150, SP2: 75,
};

export function categoryForSet(set) {
  if (set.startsWith("M")) return "Marquee Players";
  if (set.startsWith("BA")) return "Batters";
  if (set.startsWith("AL")) return "All-Rounders";
  if (set.startsWith("WK")) return "Wicket-Keepers";
  if (set.startsWith("FA")) return "Fast Bowlers";
  if (set.startsWith("SP")) return "Spin Bowlers";
  return "Uncapped";
}

export function mk(id, name, country, role, set, previousTeam, opts = {}) {
  const league = opts.league || "ipl";
  const isOverseas = opts.isOverseas ?? (country !== "India" && country !== "England");
  const isCapped = opts.isCapped !== false;
  const uncapBase = league === "hundred" ? 5 : league === "wpl" ? 10 : league === "wbbl" ? 10 : 20;
  const basePrice = isCapped ? (BASE_MAP[set] || 75) * 100000 : uncapBase * 100000;
  return {
    id,
    name,
    country,
    role,
    battingStyle: opts.battingStyle || (role === "BATTER" && /Gambhir|Sehwag|Lara|Warner|Gilchrist|Padikkal/i.test(name) ? "LHB" : "RHB"),
    bowlingStyle: opts.bowlingStyle,
    basePrice,
    isOverseas,
    previousTeam: previousTeam || "",
    category: categoryForSet(set),
    set,
    age: opts.age ?? 27,
    isCapped,
  };
}

/** Build pool from marquee, squads, extras — no synthetic filler names */
export function buildRealLeaguePool(prefix, leagueKey, teams, marquee, squads, extras, roleOverrides = {}) {
  const players = [];
  let idx = 1;
  const seen = new Set();

  function norm(n) {
    return n.toLowerCase().replace(/\s+/g, " ").trim();
  }

  function inferRole(name) {
    if (roleOverrides[name]) return roleOverrides[name];
    const n = name.toLowerCase();
    if (/khan|bumrah|shami|starc|rabada|boult|archer|ellis|wood|anderson|broad|malinga|akram|younis|bond|donald|pollock|lillee|marshall|ambrose|walsh|garner|vaas|morkel|nortje|ngidi|steyn|boult|southee|hazlewood|cummins|richardson|behrendorff|milne|ferguson|jamieson|joseph|mcleod|siddle|bird|henriques|abbott|ellis|morris|parnell|little|bose|thakur|chahar|siraj|sundar|ahmed|nadeem|chawla|mishra|ashwin|jadeja|narine|murali|warne|lyon|zampa|rashid|mujeeb|tahir|ajmal|khan|chahal|kuldeep|bishnoi|sodhi|narine|malinga|morkel|boult/i.test(n)) {
      if (/spin|orthodox|leg|offbreak|wrist/i.test(n)) return "BOWLER";
      return "BOWLER";
    }
    if (/dhoni|pant|rahul|bairstow|buttler|carey|wade|inglis|de kock|klaasen|foakes|buttler|healy|mooney|lanning|mccullum|gilchrist|sangakkara|jayawardene|pooran|samson|karthik|patel|wade|wicket/i.test(n)) return "WICKETKEEPER";
    return "ALL-ROUNDER";
  }

  function add(name, country, role, set, team, opts = {}) {
    const key = norm(name);
    if (!name || seen.has(key)) return;
    seen.add(key);
    const r = role || inferRole(name);
    players.push(mk(
      `${prefix}${String(idx++).padStart(3, "0")}`,
      name,
      country,
      r,
      set,
      team,
      { league: leagueKey, ...opts },
    ));
  }

  for (const row of marquee) {
    const [name, country, role, team] = row;
    add(name, country, role, "M1", team);
  }

  for (const [teamId, names] of Object.entries(squads)) {
    for (const name of names) {
      add(name, squads._country?.[name] || "Australia", inferRole(name), "BA2", teamId);
    }
  }

  for (const row of extras) {
    const [name, country, role, team, set = "AL2"] = row;
    add(name, country, role, set, team);
  }

  // Distribute remaining into role sets without fake names
  const setBuckets = { BATTER: ["BA3", "BA2"], BOWLER: ["FA3", "FA2", "SP2", "SP1"], "ALL-ROUNDER": ["AL3", "AL2"], WICKETKEEPER: ["WK2", "WK1"] };
  let bi = 0;
  for (const p of players) {
    if (!p.set || p.set === "M1") continue;
  }

  return players;
}

export function assignSetsByRole(players, leagueKey) {
  const marquees = players.filter((p) => p.set === "M1");
  const rest = players.filter((p) => p.set !== "M1");
  const byRole = { BATTER: [], "ALL-ROUNDER": [], WICKETKEEPER: [], BOWLER: [] };
  for (const p of rest) {
    const bucket = byRole[p.role] || byRole["ALL-ROUNDER"];
    bucket.push(p);
  }
  const assign = (arr, sets) => {
    arr.forEach((p, i) => {
      p.set = sets[i % sets.length];
      p.category = categoryForSet(p.set);
      const uncap = p.set.startsWith("U");
      if (uncap) {
        p.isCapped = false;
        const uncapBase = leagueKey === "hundred" ? 5 : leagueKey === "wpl" || leagueKey === "wbbl" ? 10 : 20;
        p.basePrice = uncapBase * 100000;
      }
    });
  };
  assign(byRole.BATTER, ["BA1", "BA2", "BA3", "UBA1"]);
  assign(byRole["ALL-ROUNDER"], ["AL1", "AL2", "AL3", "UAL1"]);
  assign(byRole.WICKETKEEPER, ["WK1", "WK2", "UWK1"]);
  assign(byRole.BOWLER, ["FA1", "FA2", "FA3", "SP1", "SP2", "UFA1", "USP1"]);
  return [...marquees, ...byRole.BATTER, ...byRole["ALL-ROUNDER"], ...byRole.WICKETKEEPER, ...byRole.BOWLER];
}
