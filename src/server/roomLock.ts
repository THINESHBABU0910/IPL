/** Per-room async mutex to serialize auction mutations */
const locks = new Map<string, Promise<void>>();

export async function withRoomLock<T>(roomId: string, fn: () => T | Promise<T>): Promise<T> {
  const prev = locks.get(roomId) || Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => { release = r; });
  locks.set(roomId, prev.then(() => next));
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(roomId) === next) locks.delete(roomId);
  }
}

export function runRoomLock(roomId: string, fn: () => void): void {
  withRoomLock(roomId, fn).catch(console.error);
}
