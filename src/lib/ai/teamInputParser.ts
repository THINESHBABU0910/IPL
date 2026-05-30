import type { ParsedTeam } from "./matchSchema";
import { inferBowlingQuota, materializeBowlingQuotaFromCounts } from "./autoBowlingQuota";
import { namesMatch, sanitizePlayerName } from "./playerNames";

export interface ParseResult {
  team: ParsedTeam;
  errors: string[];
  warnings: string[];
}

const OVERSEAS_MARKERS = /✈️|✈|\(IP\)|\(ip\)|\boverseas\b/i;
/** "1. ", "1)", "1.", "1- ", "01. " */
const LIST_PREFIX = /^\s*\d+[\.\)\-]\s*/;

type RawQuotaEntry = { name: string; overs?: number[]; overCount?: number };

function stripListPrefix(line: string): string {
  return line.replace(LIST_PREFIX, "");
}

/** Strip bullets / decorative prefixes common in pasted sheets */
function stripLineDecorators(line: string): string {
  return stripListPrefix(line)
    .replace(/^[-•*]\s+/, "")
    .trim();
}

function parseOverNumbers(raw: string): number[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

function normalizeName(raw: string): string {
  return raw
    .replace(OVERSEAS_MARKERS, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanQuotaBowlerName(raw: string): string {
  return sanitizePlayerName(normalizeName(raw));
}

function isBowlingSectionHeader(line: string): boolean {
  const t = line.trim();
  if (/^bowling(\s+quota|\s+order|\s+line\s*up)?(\s*[:\-–—]|\s+\(|\s+when|\s*$)/i.test(t)) {
    return true;
  }
  return /^bowling\s+/i.test(t) && /quota|order|line\s*up|spell|layout/i.test(t);
}

/** Bowling assignment row — many casual paste formats */
function looksLikeBowlingQuotaLine(line: string): boolean {
  const t = line.trim();
  if (/\d+\s*overs?\s*[\(\[][\d,\s]+[\)\]]/i.test(t)) return true;
  if (/\bovers?\s*[:\-]?\s*[\(\[][\d,\s]+[\)\]]/i.test(t)) return true;
  return /^.+\s*[-:–—]\s*(\d+\s*overs?\s*[\(\[][\d,\s]+[\)\]]|\d+\s*,\s*\d+|\d+\s*$)/i.test(t);
}

function parseRoleTags(trimmed: string): { isCaptain: boolean; isWicketkeeper: boolean } {
  let isCaptain = false;
  let isWicketkeeper = false;

  for (const match of trimmed.matchAll(/\(([^)]+)\)/g)) {
    const inner = match[1].toLowerCase();
    if (/\bc\b|capt/.test(inner)) isCaptain = true;
    if (/\bwk\b|w\s*\/\s*k|wicket/.test(inner)) isWicketkeeper = true;
  }

  for (const match of trimmed.matchAll(/\[([^\]]+)\]/g)) {
    const inner = match[1].toLowerCase();
    if (/\bc\b|capt/.test(inner)) isCaptain = true;
    if (/\bwk\b|w\s*\/\s*k|wicket/.test(inner)) isWicketkeeper = true;
  }

  return { isCaptain, isWicketkeeper };
}

/** Optional squad label (e.g. "CSK XI:", "SUNRISERS HYDERABAD") — never a player row. */
export function looksLikeTeamHeaderLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || LIST_PREFIX.test(trimmed)) return false;
  if (isBowlingSectionHeader(trimmed) || /^impact\s*(player)?/i.test(trimmed)) return false;
  if (/\bXI\b|playing\s*11/i.test(trimmed)) return true;
  const withoutXi = trimmed.replace(/\bXI\b/gi, "").replace(/[:\-–—]/g, "").trim();
  if (/^[A-Z]{2,6}$/i.test(withoutXi)) return true;
  const letters = trimmed.replace(/[^A-Za-z\s]/g, "").trim();
  const words = letters.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  return words.every((w) => w.length > 1 && w === w.toUpperCase());
}

export function sheetHasTeamHeaderLine(text: string): boolean {
  return text.split(/\r?\n/).some((line) => looksLikeTeamHeaderLine(line.trim()));
}

export function validateTeamNameInputs(
  teamAText: string,
  teamBText: string,
  teamAName?: string,
  teamBName?: string,
): string[] {
  const errors: string[] = [];
  if (!teamAName?.trim() && !sheetHasTeamHeaderLine(teamAText)) {
    errors.push(
      "Team A name is required — enter it in the name field (e.g. SRH) or add a header line in the sheet (e.g. SUNRISERS HYDERABAD)",
    );
  }
  if (!teamBName?.trim() && !sheetHasTeamHeaderLine(teamBText)) {
    errors.push(
      "Team B name is required — enter it in the name field (e.g. KKR) or add a header line in the sheet",
    );
  }
  return errors;
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
  const trimmed = stripLineDecorators(line);
  if (!trimmed || trimmed.length < 2) return null;
  if (/^(impact|bowling(\s+quota|\s+order)?(\s*[:\-–—]|\s+\(|\s*$))/i.test(trimmed)) return null;
  if (isBowlingSectionHeader(trimmed)) return null;
  if (looksLikeTeamHeaderLine(trimmed)) return null;
  if (looksLikeBowlingQuotaLine(trimmed)) return null;

  const overseas = OVERSEAS_MARKERS.test(line);
  const isNew = /\(new\)|\bnew signing\b|debut|uncapped|rookie|first season/i.test(trimmed);
  const { isCaptain, isWicketkeeper } = parseRoleTags(trimmed);

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

  const name = normalizeName(sanitizePlayerName(trimmed));
  if (!name || name.length < 2) return null;

  return { name, overseas, isNew, isCaptain, isWicketkeeper, role, notes };
}

function parseBowlingQuotaLine(line: string): RawQuotaEntry | null {
  const trimmed = line.trim().replace(/^[-•*]\s*/, "");
  if (!trimmed) return null;

  // "Name - 4 Overs(1,3,16,19)" / "Name - 4 Overs [1,3,16,19]"
  const oversInBrackets = trimmed.match(
    /^(.+?)\s*[-:–—]\s*\d+\s*overs?\s*[\(\[]\s*([\d,\s]+)\s*[\)\]]/i,
  );
  if (oversInBrackets) {
    const name = cleanQuotaBowlerName(oversInBrackets[1]);
    const overs = parseOverNumbers(oversInBrackets[2]);
    if (name && overs.length) return { name, overs };
  }

  // "Name - Overs (1,3,16,19)" / "Name: Overs: 1,3,16,19"
  const oversLabel = trimmed.match(
    /^(.+?)\s*[-:–—]\s*overs?\s*[:\-]?\s*[\(\[]?\s*([\d,\s]+)\s*[\)\]]?\s*$/i,
  );
  if (oversLabel) {
    const name = cleanQuotaBowlerName(oversLabel[1]);
    const overs = parseOverNumbers(oversLabel[2]);
    if (name && overs.length) return { name, overs };
  }

  const match =
    trimmed.match(/^(.+?)\s*[-:–—]\s*([\d,\s]+)\s*(?:overs?)?\s*$/i) ??
    trimmed.match(/^(.+?)\s*\(\s*([\d,\s]+)\s*\)\s*$/);
  if (!match) return null;

  const name = cleanQuotaBowlerName(match[1]);
  const rawNums = match[2].trim();
  if (!name) return null;

  if (/,/.test(rawNums) || rawNums.split(/\s+/).filter(Boolean).length > 1) {
    const overs = parseOverNumbers(rawNums);
    if (!overs.length) return null;
    return { name, overs };
  }

  const overCount = parseInt(rawNums, 10);
  if (Number.isNaN(overCount) || overCount <= 0) return null;
  return { name, overCount };
}

function resolveBowlingQuotaEntries(
  entries: RawQuotaEntry[],
  matchOvers: number,
  seed: string,
): ParsedTeam["bowlingQuota"] {
  if (!entries.length) return [];

  const countMode = entries.every((e) => e.overCount != null);
  if (countMode) {
    return materializeBowlingQuotaFromCounts(
      entries.map((e) => ({ name: e.name, overCount: e.overCount! })),
      matchOvers,
      seed,
    );
  }

  return entries.map((e) => ({
    name: e.name,
    overs: e.overs ?? [],
  }));
}

/** Map quota bowler names to closest XI name (handles McGarth vs McGrath typos). */
function alignQuotaNamesToXi(team: ParsedTeam): ParsedTeam {
  if (!team.bowlingQuota.length) return team;

  const bowlingQuota = team.bowlingQuota.map((q) => {
    const fromXi = team.playingXI.find((p) => namesMatch(p.name, q.name));
    return { ...q, name: fromXi?.name ?? q.name };
  });

  return { ...team, bowlingQuota };
}

function extractTeamName(headerLine: string): string {
  return headerLine
    .replace(/\bXI\b/i, "")
    .replace(/playing\s*11/i, "")
    .replace(/[:\-–—]/g, "")
    .trim() || "Team";
}

function resolveFinalTeamName(sheetHeaderName: string, explicitName?: string): string {
  if (explicitName?.trim()) return explicitName.trim();
  return sheetHeaderName;
}

function tryParseQuotaLine(line: string, rawBowlingQuota: RawQuotaEntry[]): boolean {
  const q = parseBowlingQuotaLine(line);
  if (!q) return false;
  rawBowlingQuota.push(q);
  return true;
}

function ensureBowlingQuota(
  team: ParsedTeam,
  matchOvers: number,
  warnings: string[],
  seed?: string,
): ParsedTeam {
  const hadQuota = team.bowlingQuota.length > 0;
  const quotaInvalid = hadQuota && validateBowlingQuota(team, matchOvers).length > 0;
  if (hadQuota && !quotaInvalid) return team;

  const inferred = inferBowlingQuota(team, matchOvers, seed ? `${seed}-${team.name}` : undefined);
  if (!inferred.length) {
    warnings.push(`${team.name}: could not auto-assign bowling quota (no bowling options in XI)`);
    return { ...team, bowlingQuota: [] };
  }

  if (quotaInvalid) {
    warnings.push(
      `${team.name}: invalid bowling quota replaced with random assignment (${inferred.length} bowlers)`,
    );
  } else {
    warnings.push(
      `${team.name}: bowling quota auto-assigned randomly (${inferred.length} bowlers)`,
    );
  }
  return { ...team, bowlingQuota: inferred };
}

export function parseTeamSheet(
  text: string,
  fallbackName?: string,
  matchOvers = 20,
  quotaSeed = "preview",
): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let sheetHeaderName = "Team";
  const playingXI: ParsedTeam["playingXI"] = [];
  let captain: string | undefined;
  let wicketkeeper: string | undefined;
  let impactPlayer: ParsedTeam["impactPlayer"];
  const rawBowlingQuota: RawQuotaEntry[] = [];

  let section: "header" | "xi" | "impact" | "quota" = "header";

  for (const line of lines) {
    if (looksLikeTeamHeaderLine(line)) {
      if (playingXI.length >= 11) {
        warnings.push(
          `Stopped at second team header "${line}" — paste each team in its own sheet field`,
        );
        break;
      }
      if (!fallbackName?.trim()) {
        sheetHeaderName = extractTeamName(line);
      }
      section = "xi";
      continue;
    }

    if (/^impact\s*(player)?\s*[:\-]/i.test(line)) {
      section = "impact";
      const impactText = line.replace(/^impact\s*(player)?\s*[:\-]\s*/i, "");
      const parsed = parsePlayerLine(impactText) || {
        name: normalizeName(impactText),
        overseas: OVERSEAS_MARKERS.test(impactText),
        isNew: /\(new\)|debut|uncapped/i.test(impactText),
        isCaptain: false,
        isWicketkeeper: false,
        role: "unknown" as const,
        notes: "",
      };
      let notes = parsed.notes;
      if (/bowling/i.test(impactText)) notes = "bowling only";
      if (/batting/i.test(impactText)) notes = "batting only";
      impactPlayer = { name: parsed.name, overseas: parsed.overseas, isNew: parsed.isNew, notes };
      continue;
    }

    if (isBowlingSectionHeader(line)) {
      section = "quota";
      continue;
    }

    if (looksLikeBowlingQuotaLine(line)) {
      section = "quota";
      tryParseQuotaLine(line, rawBowlingQuota);
      continue;
    }

    if (section === "quota") {
      tryParseQuotaLine(line, rawBowlingQuota);
      continue;
    }

    // After XI is full, remaining lines are bowling quota or notes — never extra players.
    if (playingXI.length >= 11) {
      if (tryParseQuotaLine(line, rawBowlingQuota)) {
        section = "quota";
      }
      continue;
    }

    if (section === "impact") {
      const parsed = parsePlayerLine(line);
      if (parsed) {
        impactPlayer = {
          name: parsed.name,
          overseas: parsed.overseas,
          isNew: parsed.isNew,
          notes: parsed.notes,
        };
      }
      continue;
    }

    const player = parsePlayerLine(line);
    if (
      player &&
      playingXI.length < 11 &&
      !playingXI.some((p) => namesMatch(p.name, player.name))
    ) {
      playingXI.push(player);
      if (player.isCaptain) captain = player.name;
      if (player.isWicketkeeper) wicketkeeper = player.name;
    }
  }

  if (playingXI.length === 0) errors.push("No playing XI players found");
  if (playingXI.length !== 11) warnings.push(`Expected 11 players, found ${playingXI.length}`);
  if (!rawBowlingQuota.length) warnings.push("No bowling quota found — will auto-assign from XI");

  const teamName = resolveFinalTeamName(sheetHeaderName, fallbackName);
  let team: ParsedTeam = {
    name: teamName,
    playingXI: playingXI.map((p) => ({ ...p, name: sanitizePlayerName(p.name) })),
    captain: captain ? sanitizePlayerName(captain) : undefined,
    wicketkeeper: wicketkeeper ? sanitizePlayerName(wicketkeeper) : undefined,
    impactPlayer: impactPlayer
      ? { ...impactPlayer, name: sanitizePlayerName(impactPlayer.name) }
      : undefined,
    bowlingQuota: resolveBowlingQuotaEntries(
      rawBowlingQuota.map((q) => ({ ...q, name: sanitizePlayerName(q.name) })),
      matchOvers,
      `${quotaSeed}-${teamName}`,
    ),
  };

  team = alignQuotaNamesToXi(team);

  return { team, errors, warnings };
}

export function validateBowlingQuota(team: ParsedTeam, matchOvers: number): string[] {
  const errors: string[] = [];
  if (!team.bowlingQuota.length) {
    errors.push(`${team.name}: no bowling quota (auto-assign failed)`);
    return errors;
  }

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

  if (allOvers.length !== matchOvers) {
    errors.push(`${team.name}: Bowling quota covers ${allOvers.length} overs, expected ${matchOvers}`);
  }

  const sorted = [...allOvers].sort((a, b) => a - b);
  for (let i = 1; i <= matchOvers; i++) {
    if (!sorted.includes(i)) {
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
  quotaSeed?: string,
): { teamA: ParsedTeam; teamB: ParsedTeam; errors: string[]; warnings: string[] } {
  const seed = quotaSeed ?? "preview";
  const a = parseTeamSheet(teamAText, teamAName, matchOvers, seed);
  const b = parseTeamSheet(teamBText, teamBName, matchOvers, seed);

  const errors = [...a.errors, ...b.errors, ...validateTeamNameInputs(teamAText, teamBText, teamAName, teamBName)];
  const warnings = [...a.warnings, ...b.warnings];

  let teamA = ensureBowlingQuota(a.team, matchOvers, warnings, seed);
  let teamB = ensureBowlingQuota(b.team, matchOvers, warnings, seed);

  errors.push(...validateBowlingQuota(teamA, matchOvers));
  errors.push(...validateBowlingQuota(teamB, matchOvers));

  return { teamA, teamB, errors, warnings };
}
