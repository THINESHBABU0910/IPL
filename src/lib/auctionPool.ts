import { Player } from "./types";
import { sortSetKey, seededShuffle, seededRandomInt } from "./iplRules";

export type SetOrderPrefixes = readonly string[];

export interface PoolMeta {
  setOrder: string[];
  setQueues: Record<string, Player[]>;
  currentSetIndex: number;
  shuffleSeed: string;
  pickCounter: number;
}

/** Build ordered sets with shuffled players inside each set */
export function buildSetQueues(
  players: Player[],
  shuffleSeed: string,
  orderPrefixes?: SetOrderPrefixes,
): PoolMeta {
  const bySet = new Map<string, Player[]>();
  for (const p of players) {
    const setName = p.set || "OTHER";
    if (!bySet.has(setName)) bySet.set(setName, []);
    bySet.get(setName)!.push(p);
  }

  const setOrder = [...bySet.keys()].sort(
    (a, b) => sortSetKey(a, orderPrefixes) - sortSetKey(b, orderPrefixes),
  );
  const setQueues: Record<string, Player[]> = {};

  for (const setName of setOrder) {
    setQueues[setName] = seededShuffle(bySet.get(setName)!, `${shuffleSeed}-${setName}`);
  }

  return { setOrder, setQueues, currentSetIndex: 0, shuffleSeed, pickCounter: 0 };
}

/** Pick a random player from the current IPL set; advance when set is empty */
export function pickRandomFromSets(meta: PoolMeta): { player: Player; meta: PoolMeta } | null {
  let idx = meta.currentSetIndex;

  while (idx < meta.setOrder.length) {
    const setName = meta.setOrder[idx];
    const queue = meta.setQueues[setName];
    if (!queue || queue.length === 0) {
      idx++;
      continue;
    }
    const pickIdx = seededRandomInt(
      queue.length,
      `${meta.shuffleSeed}-pick-${setName}-${meta.pickCounter}`,
    );
    const player = queue[pickIdx];
    const nextQueues = { ...meta.setQueues, [setName]: queue.filter((_, i) => i !== pickIdx) };
    return {
      player,
      meta: {
        ...meta,
        setQueues: nextQueues,
        currentSetIndex: idx,
        pickCounter: meta.pickCounter + 1,
      },
    };
  }

  return null;
}

export function countPoolRemaining(meta: PoolMeta | null): number {
  if (!meta) return 0;
  return Object.values(meta.setQueues).reduce((sum, q) => sum + q.length, 0);
}

export function previewBySet(meta: PoolMeta | null, maxPerSet = 50): { setName: string; players: Player[] }[] {
  if (!meta) return [];
  return meta.setOrder.map((setName) => ({
    setName,
    players: (meta.setQueues[setName] || []).slice(0, maxPerSet),
  })).filter((g) => g.players.length > 0);
}

export function flattenQueues(meta: PoolMeta): Player[] {
  const out: Player[] = [];
  for (const setName of meta.setOrder) {
    out.push(...(meta.setQueues[setName] || []));
  }
  return out;
}
