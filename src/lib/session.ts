const SESSIONS_KEY = "iplAuctionSessions";
const LEGACY_KEY = "iplAuctionSession";

export interface StoredSession {
  roomId: string;
  sessionToken: string;
  playerName: string;
  teamId?: string;
  isSpectator?: boolean;
}

function readSessionsMap(): Record<string, StoredSession> {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, StoredSession>;

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const session = JSON.parse(legacy) as StoredSession;
      const map = { [session.roomId.toUpperCase()]: session };
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(map));
      localStorage.removeItem(LEGACY_KEY);
      return map;
    }
    return {};
  } catch {
    return {};
  }
}

function writeSessionsMap(map: Record<string, StoredSession>): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(map));
    const latest = Object.values(map).sort((a, b) => (b.roomId > a.roomId ? 1 : -1))[0];
    if (latest) localStorage.setItem(LEGACY_KEY, JSON.stringify(latest));
  } catch { /* ignore */ }
}

export function saveSession(session: StoredSession): void {
  const map = readSessionsMap();
  map[session.roomId.toUpperCase()] = session;
  writeSessionsMap(map);
}

export function getSession(): StoredSession | null {
  const map = readSessionsMap();
  const values = Object.values(map);
  return values.length ? values[values.length - 1] : null;
}

export function getSessionForRoom(roomId: string): StoredSession | null {
  const map = readSessionsMap();
  return map[roomId.toUpperCase()] ?? null;
}

export function clearSession(roomId?: string): void {
  if (roomId) {
    const map = readSessionsMap();
    delete map[roomId.toUpperCase()];
    writeSessionsMap(map);
    return;
  }
  try {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
}

export function listSessions(): StoredSession[] {
  return Object.values(readSessionsMap());
}
