export function isValidPlayerName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 3 && trimmed.length <= 20 && /^[a-zA-Z0-9 _.-]+$/.test(trimmed);
}

export function normalizePlayerName(name: string): string {
  return name.trim().slice(0, 20);
}
