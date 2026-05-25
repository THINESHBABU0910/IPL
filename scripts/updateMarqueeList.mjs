/**
 * @deprecated Use scripts/fix-player-data.mjs for M1/M2 marquee (40 players).
 * This script now delegates to fix-player-data.mjs.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, [path.join(__dirname, "fix-player-data.mjs")], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
