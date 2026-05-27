import type { ParsedTeam } from "./matchSchema";
import { sanitizePlayerName } from "./playerNames";

export interface ParseResult {
  team: ParsedTeam;
  errors: string[];
  warnings: string[];
}

const OVERSEAS_MARKERS = /✈️|✈|\(IP\)|\(ip\)/i;
const LIST_PREFIX = /^\s*(?:\d+[\.\)]\s*)?/;

function normalizeName(raw: string): string {
  return raw
    .replace(OVERSEAS_MARKERS, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePlayerLine(line: string): {
  name: string;
  overseas: boolean;
  isNew: boolean;
  isCaptain: boolean;
  isWicketkeeper: boolean;
  role: "batter" | "bowler" | "allrounder" | "wicketkeeper" | "unknown";
  notes: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2) return null;
  if (/^(impact|bowling quota|total|extras)/i.test(trimmed)) return null;

  const overseas = OVERSEAS_MARKERS.test(trimmed);
  const isNew = /\(new\)|\bnew signing\b|debut|uncapped|rookie|first season/i.test(trimmed);
  const isCaptain = /\(\s*C\s*\)|\(\s*Capt(?:ain)?\s*\)/i.test(trimmed);
  const isWicketkeeper = /\(\s*W\s*\/?\s*K\s*\)|\(\s*Wicketkeeper\s*\)|\(\s*wk\s*\)/i.test(trimmed);

  let notes = "full match";
  const lower = trimmed.toLowerCase();
  if (/batting only|appears only when batting|comes only for batting|only for batting/i.test(lower)) {
    notes = "batting only";
  } else if (/bowling only|appears only when bowling|comes only for bowling|only for bowling/i.test(lower)) {
    notes = "bowling only";
  } else if (/all.?round/i.test(lower)) {
    notes = "allrounder";
  }

  let role: "batter" | "bowler" | "allrounder" | "wicketkeeper" | "unknown" = "unknown";
  if (isWicketkeeper) role = "wicketkeeper";
  else if (notes === "bowling only") role = "bowler";
  else if (notes === "batting only" || /batsm/i.test(lower)) role = "batter";
  else if (notes === "allrounder") role = "allrounder";

  const name = normalizeName(sanitizePlayerName(trimmed.replace(LIST_PREFIX, "")));
  if (!name || name.length < 2) return null;

  return { name, overseas, isNew, isCaptain, isWicketkeeper, role, notes };
}

function parseBowlingQuotaLine(line: string): { name: string; overs: number[] } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let match =
    trimmed.match(/^(.+?)\s*[:\-]\s*([\d,\s]+)\s*overs?\s*$/i) ??
    trimmed.match(/^(.+?)\s*[:(]\s*([\d,\s]+)\)?\s*$/);
  if (!match) return null;

  const name = sanitizePlayerName(match[1]);
  const overs = match[2]
    .split(/[,\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);

  if (!name || overs.length === 0) return null;
  return { name, overs };
}

function extractTeamName(headerLine: string): string {
  return headerLine
    .replace(/\bXI\b/i, "")
    .replace(/playing\s*11/i, "")
    .replace(/[:\-–—]/g, "")
    .trim() || "Team";
}

export function parseTeamSheet(text: string, fallbackName?: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let teamName = fallbackName || "Team";
  const playingXI: ParsedTeam["playingXI"] = [];
  let captain: string | undefined;
  let wicketkeeper: string | undefined;
  let impactPlayer: ParsedTeam["impactPlayer"];
  const bowlingQuota: ParsedTeam["bowlingQuota"] = [];

  let section: "header" | "xi" | "impact" | "quota" = "header";

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (/^impact\s*(player)?\s*[:\-]/i.test(line)) {
      section = "impact";
      const impactText = line.replace(/^impact\s*(player)?\s*[:\-]\s*/i, "");
      const parsed = parsePlayerLine(impactText) || { name: normalizeName(impactText), overseas: OVERSEAS_MARKERS.test(impactText), isNew: /\(new\)|debut|uncapped/i.test(impactText), isCaptain: false, isWicketkeeper: false, role: "unknown" as const, notes: "" };
      let notes = parsed.notes;
      if (/bowling/i.test(impactText)) notes = "bowling only";
      if (/batting/i.test(impactText)) notes = "batting only";
      impactPlayer = { name: parsed.name, overseas: parsed.overseas, notes };
      continue;
    }

    if (/^bowling\s*quota/i.test(line)) {
      section = "quota";
      continue;
    }

    if (section === "header" && /XI|playing\s*11|^[A-Z][A-Z\s]{2,}$/i.test(line) && playingXI.length === 0) {
      teamName = extractTeamName(line) || fallbackName || teamName;
      section = "xi";
      continue;
    }

    if (section === "quota" || (section === "xi" && /^bowling\s*quota/i.test(lower))) {
      section = "quota";
      const q = parseBowlingQuotaLine(line.replace(/^[-•*]\s*/, ""));
      if (q) bowlingQuota.push(q);
      continue;
    }

    if (section === "impact") {
      const parsed = parsePlayerLine(line);
      if (parsed) {
        impactPlayer = { name: parsed.name, overseas: parsed.overseas, notes: parsed.notes };
      }
      continue;
    }

    const player = parsePlayerLine(line.replace(LIST_PREFIX, ""));
    if (player) {
      playingXI.push(player);
      if (player.isCaptain) captain = player.name;
      if (player.isWicketkeeper) wicketkeeper = player.name;
    }
  }

  if (playingXI.length === 0) errors.push("No playing XI players found");
  if (playingXI.length !== 11) warnings.push(`Expected 11 players, found ${playingXI.length}`);
  if (!bowlingQuota.length) warnings.push("No bowling quota found");

  const team: ParsedTeam = {
    name: teamName,
    playingXI: playingXI.map((p) => ({ ...p, name: sanitizePlayerName(p.name) })),
    captain: captain ? sanitizePlayerName(captain) : undefined,
    wicketkeeper: wicketkeeper ? sanitizePlayerName(wicketkeeper) : undefined,
    impactPlayer: impactPlayer
      ? { ...impactPlayer, name: sanitizePlayerName(impactPlayer.name) }
      : undefined,
    bowlingQuota: bowlingQuota.map((q) => ({
      name: sanitizePlayerName(q.name),
      overs: q.overs,
    })),
  };

  return { team, errors, warnings };
}

export function validateBowlingQuota(team: ParsedTeam, matchOvers: number): string[] {
  const errors: string[] = [];
  const allOvers: number[] = [];

  for (const entry of team.bowlingQuota) {
    for (const o of entry.overs) {
      if (o < 1 || o > matchOvers) {
        errors.push(`${team.name}: Over ${o} is out of range (1-${matchOvers}) for ${entry.name}`);
      }
      if (allOvers.includes(o)) {
        errors.push(`${team.name}: Over ${o} assigned to multiple bowlers`);
      }
      allOvers.push(o);
    }
  }

  if (allOvers.length > 0 && allOvers.length !== matchOvers) {
    errors.push(`${team.name}: Bowling quota covers ${allOvers.length} overs, expected ${matchOvers}`);
  }

  const sorted = [...allOvers].sort((a, b) => a - b);
  for (let i = 1; i <= matchOvers; i++) {
    if (allOvers.length > 0 && !sorted.includes(i)) {
      errors.push(`${team.name}: Over ${i} not assigned in bowling quota`);
    }
  }

  return errors;
}

export function parseBothTeams(
  teamAText: string,
  teamBText: string,
  teamAName?: string,
  teamBName?: string,
  matchOvers = 20,
): { teamA: ParsedTeam; teamB: ParsedTeam; errors: string[]; warnings: string[] } {
  const a = parseTeamSheet(teamAText, teamAName);
  const b = parseTeamSheet(teamBText, teamBName);

  const errors = [...a.errors, ...b.errors];
  const warnings = [...a.warnings, ...b.warnings];

  errors.push(...validateBowlingQuota(a.team, matchOvers));
  errors.push(...validateBowlingQuota(b.team, matchOvers));

  return { teamA: a.team, teamB: b.team, errors, warnings };
}
