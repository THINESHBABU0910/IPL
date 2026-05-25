/**
 * Validates player set/role consistency after fix-player-data.mjs
 * Run: node scripts/validate-player-sets.mjs
 */
import data from "../src/data/players.json" with { type: "json" };

function validateSetRole(p) {
  const set = p.set;
  if (set === "M1" || set === "M2") return null;
  if (set.startsWith("UBA") || set.startsWith("UAL") || set.startsWith("UWK") || set.startsWith("UFA") || set.startsWith("USP")) return null;
  if (set.startsWith("BA") && p.role !== "BATTER") return `${p.name}: ${p.role} in ${set}`;
  if (set.startsWith("AL") && p.role !== "ALL-ROUNDER") return `${p.name}: ${p.role} in ${set}`;
  if (set.startsWith("WK") && p.role !== "WICKETKEEPER") return `${p.name}: ${p.role} in ${set}`;
  if ((set.startsWith("FA") || set.startsWith("SP")) && p.role !== "BOWLER") return `${p.name}: ${p.role} in ${set}`;
  return null;
}

const errors = data.players.map(validateSetRole).filter(Boolean);
const m1 = data.players.filter((p) => p.set === "M1");
const m2 = data.players.filter((p) => p.set === "M2");

const VALID_CAPPED = new Set([75, 100, 125, 150, 200]);
const VALID_UNCAPPED = new Set([30, 40, 50, 125]);
const priceErrors = data.players.filter((p) => {
  const lakhs = Math.round(p.basePrice / 100000);
  if (p.set === "M1" || p.set === "M2") return lakhs !== 200;
  if (!p.isCapped) return !VALID_UNCAPPED.has(lakhs);
  return !VALID_CAPPED.has(lakhs);
});

console.log("Total players:", data.players.length);
console.log("Marquee M1:", m1.length, "| M2:", m2.length);
console.log("Categories:", data.categories.map((c) => `${c.name}(${c.sets.join(",")})`).join(" · "));
console.log("Set/role errors:", errors.length);
if (errors.length) errors.forEach((e) => console.log(" ", e));
else console.log("All sets pass role validation ✓");

console.log("Base price errors:", priceErrors.length);
if (priceErrors.length) {
  priceErrors.slice(0, 15).forEach((p) => {
    console.log(`  ${p.name} · ${p.set} · ${Math.round(p.basePrice / 100000)}L · capped=${p.isCapped}`);
  });
}

const bowlersInBatters = data.players.filter(
  (p) => p.set.startsWith("BA") && p.role === "BOWLER",
);
if (bowlersInBatters.length) {
  console.error("Bowlers still in BA sets:", bowlersInBatters.map((p) => p.name));
  process.exit(1);
}

if (m1.length !== 25 || m2.length !== 25) {
  console.error(`Expected 25+25 marquee, got ${m1.length}+${m2.length}`);
  process.exit(1);
}

process.exit(errors.length || priceErrors.length ? 1 : 0);
