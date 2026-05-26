import * as fs from "fs";
import * as path from "path";
import type { Room } from "./gameState";
import { importRoomFromSnapshot } from "./gameState";

const SNAPSHOT_DIR = path.join(process.cwd(), "data", "snapshots");

function ensureDir(): void {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

export function saveRoomSnapshot(room: Room): void {
  try {
    ensureDir();
    const payload = {
      id: room.id,
      league: room.league,
      mode: room.mode,
      hostId: room.hostId,
      hostName: room.hostName,
      hostSocketId: room.hostSocketId,
      createdAt: room.createdAt,
      teams: Object.fromEntries(room.teams),
      auction: {
        ...room.auction,
        remainingPoolIds: room.auction.remainingPool.map((p) => p.id),
        soldPlayers: room.auction.soldPlayers,
        unsoldPlayers: room.auction.unsoldPlayers,
        remainingPool: [],
      },
      sessionTokens: Object.fromEntries(room.sessionTokens),
      tokenToSocket: Object.fromEntries(room.tokenToSocket),
      playerNames: Object.fromEntries(room.playerNames),
      connectedPlayers: Object.fromEntries(room.connectedPlayers),
      spectators: [...room.spectators],
      chat: room.chat,
      activityFeed: room.activityFeed,
      retentionTimeLeft: room.retentionTimeLeft,
      minTeamsToStart: room.minTeamsToStart,
      bidTimerSeconds: room.bidTimerSeconds,
      poolMeta: room.poolMeta,
      savedAt: Date.now(),
    };
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${room.id}.json`), JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error("Snapshot save failed:", e);
  }
}

export function deleteRoomSnapshot(roomId: string): void {
  try {
    const p = path.join(SNAPSHOT_DIR, `${roomId}.json`);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch { /* ignore */ }
}

export function loadRoomSnapshot(roomId: string): Record<string, unknown> | null {
  try {
    ensureDir();
    const p = path.join(SNAPSHOT_DIR, `${roomId.toUpperCase()}.json`);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function loadAllSnapshots(): string[] {
  try {
    ensureDir();
    return fs.readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

export function hydrateRoomsFromSnapshots(): number {
  let count = 0;
  for (const roomId of loadAllSnapshots()) {
    const raw = loadRoomSnapshot(roomId);
    if (raw && importRoomFromSnapshot(raw)) count++;
  }
  if (count > 0) console.log(`> Restored ${count} room snapshot(s) from disk`);
  return count;
}

export function tryRestoreRoom(roomId: string): Room | null {
  const raw = loadRoomSnapshot(roomId);
  if (!raw) return null;
  return importRoomFromSnapshot(raw);
}

export { SNAPSHOT_DIR };
