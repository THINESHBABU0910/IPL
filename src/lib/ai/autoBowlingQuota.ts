import type { ParsedTeam } from "./matchSchema";
import { namesMatch, sanitizePlayerName } from "./playerNames";

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function bowlingScore(
  player: ParsedTeam["playingXI"][0],
  orderIndex: number,
): number {
  let score = 1;
  if (player.role === "bowler" || player.notes === "bowling only") score += 12;
  else if (player.role === "allrounder" || player.notes === "allrounder") score += 7;
  else if (player.notes === "batting only" || player.role === "batter") score = 0;
  if (orderIndex >= 5) score += 4;
  if (orderIndex >= 8) score += 2;
  if (/spin|leg|off|pace|seam|fast|medium/i.test(`${player.name} ${player.notes}`)) score += 1;
  return score;
}

function pickBowlersRandomly(
  team: ParsedTeam,
  bowlerCount: number,
  rng: () => number,
): string[] {
  const candidates = team.playingXI
    .map((p, i) => ({ name: sanitizePlayerName(p.name), score: bowlingScore(p, i) }))
    .filter((c) => c.score > 0);

  const pool = candidates.flatMap((c) =>
    Array.from({ length: Math.max(1, c.score) }, () => c.name),
  );
  const shuffledPool = shuffleWithRng(pool.length ? pool : candidates.map((c) => c.name), rng);

  const picked: string[] = [];
  for (const name of shuffledPool) {
    if (picked.length >= bowlerCount) break;
    if (!picked.some((n) => namesMatch(n, name))) picked.push(name);
  }

  if (team.impactPlayer?.notes === "bowling only") {
    const imp = sanitizePlayerName(team.impactPlayer.name);
    if (!picked.some((n) => namesMatch(n, imp))) {
      if (picked.length >= bowlerCount) picked[bowlerCount - 1] = imp;
      else picked.push(imp);
    }
  }

  const fallback = shuffleWithRng(
    team.playingXI.map((p) => sanitizePlayerName(p.name)),
    rng,
  );
  for (const name of fallback) {
    if (picked.length >= bowlerCount) break;
    if (!picked.some((n) => namesMatch(n, name))) picked.push(name);
  }

  return picked;
}

/** Pick 4–5 bowlers at random (bowlers/all-rounders weighted) and assign full quota. */
export function inferBowlingQuota(
  team: ParsedTeam,
  matchOvers: number,
  seed?: string,
): ParsedTeam["bowlingQuota"] {
  const rng = seededRandom(seed ?? `${team.name}-${matchOvers}-${Date.now()}`);
  const bowlerCount = matchOvers <= 10 ? 4 : 5;
  const picked = pickBowlersRandomly(team, bowlerCount, rng);

  if (!picked.length) return [];

  const perBowler = Math.max(1, Math.floor(matchOvers / picked.length));
  const assignments = new Map<string, number[]>();
  for (const name of picked) assignments.set(name, []);

  const shuffledOvers = shuffleWithRng(
    Array.from({ length: matchOvers }, (_, i) => i + 1),
    rng,
  );

  for (const over of shuffledOvers) {
    const withRoom = picked.filter((n) => assignments.get(n)!.length < perBowler);
    const target = withRoom.length
      ? withRoom[Math.floor(rng() * withRoom.length)]
      : picked[Math.floor(rng() * picked.length)];
    assignments.get(target)!.push(over);
  }

  for (const name of picked) {
    assignments.get(name)!.sort((a, b) => a - b);
  }

  return picked.map((name) => ({
    name,
    overs: assignments.get(name) ?? [],
  }));
}

/** Turn "Name - 4" style entries into concrete over numbers (random order). */
export function materializeBowlingQuotaFromCounts(
  entries: { name: string; overCount: number }[],
  matchOvers: number,
  seed: string,
): ParsedTeam["bowlingQuota"] {
  if (!entries.length) return [];

  const rng = seededRandom(seed);
  const shuffledOvers = shuffleWithRng(
    Array.from({ length: matchOvers }, (_, i) => i + 1),
    rng,
  );

  let cursor = 0;
  return entries.map((entry) => {
    const count = Math.max(0, entry.overCount);
    const overs = shuffledOvers.slice(cursor, cursor + count).sort((a, b) => a - b);
    cursor += count;
    return { name: entry.name, overs };
  });
}
