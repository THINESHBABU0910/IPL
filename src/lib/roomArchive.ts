import type { RoomState } from "./types";

const ARCHIVE_KEY = "iplAuctionArchives";
const MAX_ARCHIVES = 20;

export interface RoomArchiveEntry {
  roomId: string;
  roomState: RoomState;
  playerName?: string;
  teamId?: string;
  savedAt: number;
}

function readAll(): RoomArchiveEntry[] {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RoomArchiveEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: RoomArchiveEntry[]): void {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries.slice(0, MAX_ARCHIVES)));
  } catch { /* ignore quota */ }
}

export function saveRoomArchive(entry: Omit<RoomArchiveEntry, "savedAt">): void {
  const all = readAll().filter((e) => e.roomId !== entry.roomId);
  all.unshift({ ...entry, savedAt: Date.now() });
  writeAll(all);
}

export function getRoomArchive(roomId: string): RoomArchiveEntry | null {
  const id = roomId.toUpperCase();
  return readAll().find((e) => e.roomId.toUpperCase() === id) ?? null;
}

export function listRoomArchives(): RoomArchiveEntry[] {
  return readAll();
}

export function isCompletedArchive(entry: RoomArchiveEntry): boolean {
  return entry.roomState.auction.phase === "completed";
}
