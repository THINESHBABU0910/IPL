/**
 * Removes "Pool N" placeholder players from league JSON files.
 * Run: node scripts/strip-placeholder-players.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "src", "data");

const leagues = ["bbl", "sa20", "wbbl"];

for (const league of leagues) {
  const filePath = path.join(dataDir, "leagues", league, "players.json");
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const before = data.players.length;
  data.players = data.players.filter(
    (p) => !/\bPool \d+\b/i.test(p.name) && !/^BBL Pool/i.test(p.name) && !/^SA20 Pool/i.test(p.name) && !/^WBBL Pool/i.test(p.name),
  );
  const after = data.players.length;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`${league}: ${before} -> ${after} players (removed ${before - after} placeholders)`);
}
