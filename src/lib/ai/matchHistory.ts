import type { MatchResult } from "./matchSchema";

export interface MatchHistoryEntry {
  id: string;
  createdAt: number;
  teamNames: [string, string];
  overs: number;
  venue: string;
  winner: string;
  pdfBase64: string;
  match?: MatchResult;
}

const STORAGE_KEY = "aiMatchHistory";
const MAX_ENTRIES = 10;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadMatchHistory(): MatchHistoryEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MatchHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMatchToHistory(entry: MatchHistoryEntry): void {
  if (!isBrowser()) return;
  const existing = loadMatchHistory().filter((e) => e.id !== entry.id);
  existing.unshift(entry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, MAX_ENTRIES)));
  } catch {
    const trimmed = existing.slice(0, 5).map((e) => ({
      ...e,
      pdfBase64: "",
      match: e.match,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

export function deleteMatchFromHistory(id: string): void {
  if (!isBrowser()) return;
  const next = loadMatchHistory().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function base64ToBlobUrl(base64: string, mime = "application/pdf"): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

export function downloadPdfFromBase64(base64: string, fileName: string): void {
  const url = base64ToBlobUrl(base64);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
