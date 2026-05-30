#!/usr/bin/env node
/**
 * Recompute isOverseas on all league player JSON using league-aware domestic rules.
 * Usage: node scripts/fix-overseas-flags.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isPlayerOverseasForPool } from "./league-overseas.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dir, "..", "src", "data");

const POOLS = [
  { id: "ipl", file: path.join(DATA, "players.json") },
  { id: "wpl", file: path.join(DATA, "leagues", "wpl", "players.json") },
  { id: "hundred", file: path.join(DATA, "leagues", "hundred", "players.json") },
  { id: "sa20", file: path.join(DATA, "leagues", "sa20", "players.json") },
  { id: "bbl", file: path.join(DATA, "leagues", "bbl", "players.json") },
  { id: "wbbl", file: path.join(DATA, "leagues", "wbbl", "players.json") },
  { id: "legend", file: path.join(DATA, "leagues", "legend", "players.json") },
];

let totalChanged = 0;

for (const { id, file } of POOLS) {
  const raw = fs.readFileSync(file, "utf-8");
  const data = JSON.parse(raw);
  let changed = 0;
  for (const p of data.players) {
    const next = isPlayerOverseasForPool(p.country, id);
    if (p.isOverseas !== next) {
      p.isOverseas = next;
      changed++;
    }
  }
  if (changed > 0) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  }
  const os = data.players.filter((p) => p.isOverseas).length;
  console.log(`${id}: ${changed} fixed, ${os}/${data.players.length} overseas`);
  totalChanged += changed;
}

console.log(`Done. ${totalChanged} player flags updated.`);
