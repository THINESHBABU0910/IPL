const SESSION_KEY = "iplAuctionSession";

export interface StoredSession {
  roomId: string;
  sessionToken: string;
  playerName: string;
  teamId?: string;
  isSpectator?: boolean;
}

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* ignore */ }
}

export function getSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

export function getSessionForRoom(roomId: string): StoredSession | null {
  const s = getSession();
  return s && s.roomId === roomId ? s : null;
}
