import * as fs from "fs";
import * as path from "path";
import type { Room } from "./gameState";
import { serializeRoom } from "./gameState";

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
      spectators: [...room.spectators],
      chat: room.chat,
      activityFeed: room.activityFeed,
      retentionTimeLeft: room.retentionTimeLeft,
      minTeamsToStart: room.minTeamsToStart,
      playerNames: Object.fromEntries(room.playerNames),
      connectedPlayers: Object.fromEntries(room.connectedPlayers),
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

export function loadAllSnapshots(): string[] {
  try {
    ensureDir();
    return fs.readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

export { SNAPSHOT_DIR };
