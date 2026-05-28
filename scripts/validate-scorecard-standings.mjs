#!/usr/bin/env node
/**
 * Validates NRR / points table logic (IPL rules).
 * Run: npm run validate-standings
 */
import {
  computeStandingsFromScorecardText,
  parseOversDecimal,
  referenceMatchNrr,
  effectiveOversForNrr,
  computeNrr,
} from "../src/lib/ai/scorecardStandings.ts";
import { SAMPLE_LEAGUE_SCORECARDS } from "../src/data/sampleLeagueScorecards.ts";

let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  } else {
    console.log("OK:", msg);
  }
}

// --- Overs parsing ---
const o1 = parseOversDecimal("19.4");
assert(o1.ok && Math.abs(o1.overs - (19 + 4 / 6)) < 0.001, "19.4 = 19 overs 4 balls");

const o2 = parseOversDecimal("20");
assert(o2.ok && o2.overs === 20, "20 overs exact");

const oBad = parseOversDecimal("19.6");
assert(!oBad.ok, "19.6 rejected (invalid ball digit)");

const oBad2 = parseOversDecimal("21");
assert(!oBad2.ok, "21 overs rejected");

// --- All-out NRR (IPL reference match) ---
const ref = referenceMatchNrr();
assert(Math.abs(ref.kkr - 4) < 0.001, `KKR single-match NRR = +4.000 (got ${ref.kkr.toFixed(3)})`);
assert(Math.abs(ref.srh + 4) < 0.001, `SRH single-match NRR = -4.000 (got ${ref.srh.toFixed(3)})`);

assert(effectiveOversForNrr(16.666, 10) === 20, "All-out → 20 overs for NRR");
assert(effectiveOversForNrr(19.666, 5) === 19.666, "Not all-out → actual overs");

// --- Full sample league ---
const sample = computeStandingsFromScorecardText(SAMPLE_LEAGUE_SCORECARDS);
assert(sample.matches.length === 45, `45 matches parsed (got ${sample.matches.length})`);
assert(sample.validation.ok, "Sample league integrity checks");
assert(sample.errors.filter((e) => e.startsWith("FAIL")).length === 0, "No hard parse failures on sample");

const totalPlayed = sample.standings.reduce((s, r) => s + r.played, 0);
assert(totalPlayed === 90, `90 team-innings (45×2), got ${totalPlayed}`);

// GT should lead sample on points
assert(sample.standings[0].teamId === "GT", `Table leader GT (got ${sample.standings[0].teamId})`);

// --- Invalid input ---
const bad = computeStandingsFromScorecardText(`1ST MATCH
FOO-100/5(20overs)
MI-90/3(20overs)`);
assert(bad.errors.some((e) => e.includes("FOO")), "Unknown team rejected");

const badOvers = computeStandingsFromScorecardText(`CSK-100/5(25overs)
MI-90/3(20overs)`);
assert(badOvers.errors.some((e) => e.includes("25")), "Overs > 20 rejected");

console.log("\n--- Sample top 5 ---");
for (const row of sample.standings.slice(0, 5)) {
  console.log(
    `${row.shortName}  Pts ${row.points}  W${row.won} L${row.lost}  NRR ${row.nrr >= 0 ? "+" : ""}${row.nrr.toFixed(3)}  (RF ${row.runsFor}/${row.oversFaced.toFixed(2)} ov, RA ${row.runsAgainst}/${row.oversBowled.toFixed(2)} ov)`,
  );
}

console.log("\n--- Validation ---");
for (const c of sample.validation.checks) console.log(" ", c);

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll standings / NRR validation tests passed.");
