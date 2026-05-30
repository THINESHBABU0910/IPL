#!/usr/bin/env node
/**
 * Verifies same squads produce different margins across variation seeds.
 * Usage: node scripts/verify-simulation-variety.mjs
 */
import { randomUUID } from "crypto";

async function loadModule(rel) {
  return import(new URL(rel, import.meta.url).href);
}

const { parseBothTeams } = await loadModule("../src/lib/ai/teamInputParser.ts");
const { getVenueById } = await loadModule("../src/data/iplVenues.ts");
const { simulateMatchLocally } = await loadModule("../src/lib/ai/localMatchSimulator.ts");
const { enrichMatchFromSquads } = await loadModule("../src/lib/ai/matchSquadEnricher.ts");
const { MatchResultSchema } = await loadModule("../src/lib/ai/matchSchema.ts");
const { repairMatchStats, ensureMatchReadyForPdf } = await loadModule("../src/lib/ai/matchValidator.ts");
const { polishMatchResult } = await loadModule("../src/lib/ai/matchPolish.ts");
const { enrichMatchWithBowling } = await loadModule("../src/lib/ai/matchValidator.ts");

const TEAM_A = `SUNRISERS HYDERABAD
1. Brendon McCullum
2. Abhishek Sharma
3. Jos Buttler (WK)
4. Suryakumar Yadav (C)
5. Yusuf Pathan
6. Chris Morris
7. Jofra Archer
8. Kuldeep Yadav
9. Mohammad Shami
10. Josh Hazlewood
11. Varun Chakravarthy
Bowling Quota:
Jofra Archer - 1, 3, 16, 19
Mohammad Shami - 2, 4, 6, 17
Josh Hazlewood - 5, 14, 18, 20
Kuldeep Yadav - 7, 9, 11, 13
Varun Chakravarthy - 8, 10, 12, 15`;

const TEAM_B = `ROYAL CHALLENGERS BANGALORE
1. Faf du Plessis
2. Travis Head
3. Ruturaj Gaikwad
4. Kumar Sangakkara (WK/C)
5. Paul Valthaty
6. Andre Russell
7. Axar Patel
8. Harbhajan Singh
9. Kagiso Rabada
10. RP Singh
11. Mohit Sharma
Bowling Quota:
RP Singh - 1, 3, 15, 18
Kagiso Rabada - 2, 5, 17, 20
Mohit Sharma - 4, 6, 16, 19
Harbhajan Singh - 7, 9, 11, 13
Axar Patel - 8, 10, 12, 14`;

const venue = getVenueById("chinnaswamy");
const parsed = parseBothTeams(TEAM_A, TEAM_B, "SRH", "RCB", 20);
if (parsed.errors.length) {
  console.error("Parse errors:", parsed.errors);
  process.exit(1);
}

const margins = [];
const RUNS = 5;
let lastMatch = null;

for (let i = 0; i < RUNS; i++) {
  const variationSeed = randomUUID();
  const ctx = {
    teamA: parsed.teamA,
    teamB: parsed.teamB,
    venue,
    matchOvers: 20,
    stage: "Legends",
    variationSeed,
  };
  const skeleton = MatchResultSchema.parse(simulateMatchLocally(ctx));
  let match = enrichMatchFromSquads(skeleton, ctx);
  match = repairMatchStats(match, 20);
  match = polishMatchResult(match, 20);
  match = enrichMatchWithBowling(match, parsed.teamA, parsed.teamB, venue.pitchType, 20, venue.boundarySize);
  match = ensureMatchReadyForPdf(match, parsed.teamA, parsed.teamB, venue.pitchType, 20, venue.boundarySize);
  lastMatch = match;

  const key = `${match.result.winner}|${match.result.margin}|${match.innings[0].totalRuns}-${match.innings[1].totalRuns}`;
  margins.push(key);
  console.log(`Run ${i + 1}: ${match.result.summary?.slice(0, 80) ?? key}`);
}

const unique = new Set(margins);
console.log(`\nUnique outcomes: ${unique.size}/${RUNS}`);
if (unique.size < 2) {
  console.error("FAIL: margins did not vary enough across runs");
  process.exit(1);
}

const allBowling = [
  ...(lastMatch?.innings[0].bowling ?? []),
  ...(lastMatch?.innings[1].bowling ?? []),
];
const bowl = allBowling.find((b) => b.oversAssigned);
if (!bowl) {
  console.error("FAIL: bowling oversAssigned missing", allBowling.length, "rows");
  process.exit(1);
}
if (!lastMatch?.fallOfWickets.firstInnings[0]?.partnership) {
  console.error("FAIL: FOW partnership missing");
  process.exit(1);
}
if (lastMatch.scorecardTheme !== "legends") {
  console.error("FAIL: expected legends scorecard theme");
  process.exit(1);
}

console.log("PASS: simulation variety and PDF fields OK");
process.exit(0);
