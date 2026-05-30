import type { IplVenue } from "@/data/iplVenues";
import type { ParsedTeam } from "./matchSchema";
import type { SimModeConfig } from "./simModes";

export interface NormalizeContext {
  teamA: ParsedTeam;
  teamB: ParsedTeam;
  venue: IplVenue;
  matchOvers: number;
  stage?: string;
  /** Unique per simulate click — drives RNG variety */
  variationSeed?: string;
  avoidMargins?: string[];
  simMode?: SimModeConfig;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickString(val: unknown): string | undefined {
  if (typeof val === "string" && val.trim()) return val.trim();
  if (typeof val === "number") return String(val);
  if (!isRecord(val)) return undefined;
  for (const k of ["name", "title", "value", "text", "label", "description", "team", "winner"]) {
    const s = pickString(val[k]);
    if (s) return s;
  }
  return undefined;
}

function pickNumber(val: unknown): number | undefined {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  return [];
}

function unwrapRoot(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) return {};

  const hasMatchFields =
    "innings" in raw ||
    "matchTitle" in raw ||
    "match_title" in raw ||
    "result" in raw && isRecord(raw.result) && "winner" in raw.result;

  if (hasMatchFields) return raw;

  for (const key of ["match", "matchResult", "match_result", "simulation", "scorecard", "data", "output"]) {
    const nested = raw[key];
    if (isRecord(nested)) {
      const unwrapped = unwrapRoot(nested);
      if (unwrapped.innings || unwrapped.matchTitle || unwrapped.match_title) return unwrapped;
    }
  }

  return raw;
}

function getField(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
}

function normalizeToss(val: unknown, teamA: string, teamB: string) {
  const obj = isRecord(val) ? val : {};
  const winner = pickString(getField(obj, "winner", "team", "name")) || teamA;
  let decision = pickString(getField(obj, "decision", "elected", "choice"))?.toLowerCase() || "bat";
  if (decision.includes("bowl") || decision.includes("field")) decision = "bowl";
  else decision = "bat";
  const decisionText =
    pickString(getField(obj, "decisionText", "decision_text", "text")) ||
    (decision === "bat" ? "Chose to Bat First" : "Chose to Bowl First");
  return { winner, decision: decision as "bat" | "bowl", decisionText };
}

function normalizeExtras(val: unknown) {
  const obj = isRecord(val) ? val : {};
  const wides = pickNumber(getField(obj, "wides", "wd")) ?? 0;
  const noBalls = pickNumber(getField(obj, "noBalls", "no_balls", "nb")) ?? 0;
  const byes = pickNumber(getField(obj, "byes", "b")) ?? 0;
  const legByes = pickNumber(getField(obj, "legByes", "leg_byes", "lb")) ?? 0;
  const total = pickNumber(getField(obj, "total", "extras")) ?? wides + noBalls + byes + legByes;
  return { total: Math.round(total), wides: Math.round(wides), noBalls: Math.round(noBalls), byes: Math.round(byes), legByes: Math.round(legByes) };
}

function normalizeBattingRow(val: unknown) {
  const obj = isRecord(val) ? val : {};
  const runs = Math.round(pickNumber(getField(obj, "runs", "r")) ?? 0);
  const balls = Math.round(pickNumber(getField(obj, "balls", "b")) ?? 0);
  const fours = Math.round(pickNumber(getField(obj, "fours", "4s", "four")) ?? 0);
  const sixes = Math.round(pickNumber(getField(obj, "sixes", "6s", "six")) ?? 0);
  const strikeRate =
    pickNumber(getField(obj, "strikeRate", "strike_rate", "sr")) ??
    (balls > 0 ? Math.round((runs / balls) * 1000) / 10 : 0);
  return {
    name: pickString(getField(obj, "name", "batter", "player")) || "Unknown",
    status: pickString(getField(obj, "status", "dismissal", "howOut", "how_out")) || "not out",
    runs,
    balls,
    fours,
    sixes,
    strikeRate,
  };
}

function normalizeInnings(val: unknown, defaultTeam: string, matchOvers: number, target?: number) {
  const obj = isRecord(val) ? val : {};
  const batting = pickArray(getField(obj, "batting", "batsmen", "batters")).map(normalizeBattingRow);
  const extras = normalizeExtras(getField(obj, "extras", "extra"));
  const totalRuns =
    pickNumber(getField(obj, "totalRuns", "total_runs", "runs", "total")) ??
    batting.reduce((s, b) => s + b.runs, 0) + extras.total;
  const totalWickets =
    pickNumber(getField(obj, "totalWickets", "total_wickets", "wickets")) ??
    batting.filter((b) => !/not out/i.test(b.status)).length;
  const overs = pickNumber(getField(obj, "overs", "oversBowled", "overs_bowled")) ?? matchOvers;
  const runRate =
    pickNumber(getField(obj, "runRate", "run_rate", "rr")) ??
    (overs > 0 ? Math.round((totalRuns / overs) * 100) / 100 : 0);
  const didNotBatRaw = getField(obj, "didNotBat", "did_not_bat", "dnb");
  const didNotBat = Array.isArray(didNotBatRaw)
    ? didNotBatRaw.map((x) => pickString(x) || String(x)).filter(Boolean)
    : undefined;

  const inn: Record<string, unknown> = {
    teamName: pickString(getField(obj, "teamName", "team_name", "team")) || defaultTeam,
    batting,
    extras,
    totalRuns: Math.round(totalRuns),
    totalWickets: Math.min(10, Math.round(totalWickets)),
    overs,
    runRate,
    didNotBat,
  };
  if (target !== undefined) inn.target = target;
  return inn;
}

function normalizeInningsPair(val: unknown, ctx: NormalizeContext): [Record<string, unknown>, Record<string, unknown>] {
  const teamA = ctx.teamA.name;
  const teamB = ctx.teamB.name;

  if (Array.isArray(val) && val.length >= 2) {
    const inn1 = normalizeInnings(val[0], teamA, ctx.matchOvers);
    const inn2 = normalizeInnings(val[1], teamB, ctx.matchOvers, (inn1.totalRuns as number) + 1);
    return [inn1, inn2];
  }

  if (isRecord(val)) {
    const first = getField(val, "first", "firstInnings", "first_innings", "innings1", "teamA");
    const second = getField(val, "second", "secondInnings", "second_innings", "innings2", "teamB");
    if (first && second) {
      const inn1 = normalizeInnings(first, teamA, ctx.matchOvers);
      const inn2 = normalizeInnings(second, teamB, ctx.matchOvers, (inn1.totalRuns as number) + 1);
      return [inn1, inn2];
    }
  }

  const inn1 = normalizeInnings({}, teamA, ctx.matchOvers);
  const inn2 = normalizeInnings({}, teamB, ctx.matchOvers, (inn1.totalRuns as number) + 1);
  return [inn1, inn2];
}

function normalizePartnerships(val: unknown) {
  const empty = { firstInnings: [] as unknown[], secondInnings: [] as unknown[] };
  if (!isRecord(val)) return empty;

  const mapRow = (row: unknown) => {
    const obj = isRecord(row) ? row : {};
    return {
      wicket: Math.round(pickNumber(getField(obj, "wicket", "wkt")) ?? 1),
      runs: Math.round(pickNumber(getField(obj, "runs")) ?? 0),
      balls: Math.round(pickNumber(getField(obj, "balls")) ?? 0),
      batters: pickString(getField(obj, "batters", "batsmen", "players")) || "",
    };
  };

  if (Array.isArray(val)) {
    return { firstInnings: val.map(mapRow), secondInnings: [] };
  }

  return {
    firstInnings: pickArray(getField(val, "firstInnings", "first_innings", "first")).map(mapRow),
    secondInnings: pickArray(getField(val, "secondInnings", "second_innings", "second")).map(mapRow),
  };
}

function normalizeFallOfWickets(val: unknown) {
  const empty = { firstInnings: [] as unknown[], secondInnings: [] as unknown[] };
  if (!isRecord(val)) return empty;

  const mapRow = (row: unknown) => {
    const obj = isRecord(row) ? row : {};
    return {
      score: pickString(getField(obj, "score", "runs")) || "0-0",
      over: pickString(getField(obj, "over", "ov")) || "0.0",
      batter: pickString(getField(obj, "batter", "batsman", "name")) || "",
    };
  };

  if (Array.isArray(val)) {
    return { firstInnings: val.map(mapRow), secondInnings: [] };
  }

  return {
    firstInnings: pickArray(getField(val, "firstInnings", "first_innings", "first")).map(mapRow),
    secondInnings: pickArray(getField(val, "secondInnings", "second_innings", "second")).map(mapRow),
  };
}

function normalizeImpactPlayers(val: unknown) {
  const arr = Array.isArray(val) ? val : isRecord(val) ? [val] : [];
  return arr.map((row) => {
    const obj = isRecord(row) ? row : {};
    return {
      teamName: pickString(getField(obj, "teamName", "team_name", "team")) || "",
      playerIn: pickString(getField(obj, "playerIn", "player_in", "in", "name")) || "",
      playerOut: pickString(getField(obj, "playerOut", "player_out", "out")),
      reason: pickString(getField(obj, "reason", "notes")) || "Impact player substitution",
      activatedAt: pickString(getField(obj, "activatedAt", "activated_at", "when")) || "2nd innings",
    };
  });
}

function normalizeResult(val: unknown, teamA: string, teamB: string) {
  if (typeof val === "string") {
    return { winner: teamA, margin: val, summary: val };
  }
  const obj = isRecord(val) ? val : {};
  const winner = pickString(getField(obj, "winner", "team", "name")) || teamA;
  const margin = pickString(getField(obj, "margin", "by")) || "by 5 runs";
  const summary = pickString(getField(obj, "summary", "text", "description")) || `${winner} won ${margin}`;
  return { winner, margin, summary };
}

function normalizePlayerOfTheMatch(val: unknown): string | string[] {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.map((x) => pickString(x) || String(x)).filter(Boolean);
  if (isRecord(val)) {
    const s = pickString(val);
    if (s) return s;
  }
  return "TBD";
}

/** Coerce LLM output (often nested/wrong types) into MatchResult-shaped JSON */
export function normalizeMatchResponse(raw: unknown, ctx: NormalizeContext): Record<string, unknown> {
  const root = unwrapRoot(raw);
  const teamA = ctx.teamA.name;
  const teamB = ctx.teamB.name;
  const [inn1, inn2] = normalizeInningsPair(getField(root, "innings", "inningsData", "scores"), ctx);

  const venueFromRoot = getField(root, "venue", "stadium", "ground");
  const venueName =
    pickString(venueFromRoot) ||
    pickString(isRecord(venueFromRoot) ? getField(venueFromRoot as Record<string, unknown>, "name") : undefined) ||
    ctx.venue.name;

  const pitchFromRoot = getField(root, "pitchType", "pitch_type", "pitch");
  const pitchType =
    pickString(pitchFromRoot) ||
    pickString(isRecord(pitchFromRoot) ? getField(pitchFromRoot as Record<string, unknown>, "type") : undefined) ||
    ctx.venue.pitchType;

  return {
    matchTitle:
      pickString(getField(root, "matchTitle", "match_title", "title")) || `${teamA} vs ${teamB}`,
    stage: pickString(getField(root, "stage", "matchStage", "match_stage")) || ctx.stage || "League",
    venue: venueName,
    venueCity:
      pickString(getField(root, "venueCity", "venue_city", "city")) ||
      ctx.venue.city,
    pitchType,
    pitchDescription:
      pickString(getField(root, "pitchDescription", "pitch_description", "pitchDesc")) ||
      ctx.venue.pitchDescription,
    dewCondition:
      pickString(getField(root, "dewCondition", "dew_condition", "dew")) ||
      ctx.venue.typicalDew,
    toss: normalizeToss(getField(root, "toss", "tossResult", "toss_result"), teamA, teamB),
    impactPlayers: normalizeImpactPlayers(getField(root, "impactPlayers", "impact_players", "impact")),
    innings: [inn1, inn2],
    partnerships: normalizePartnerships(getField(root, "partnerships", "partnership")),
    fallOfWickets: normalizeFallOfWickets(getField(root, "fallOfWickets", "fall_of_wickets", "fow")),
    result: normalizeResult(getField(root, "result", "matchResult", "outcome"), teamA, teamB),
    playerOfTheMatch: normalizePlayerOfTheMatch(
      getField(root, "playerOfTheMatch", "player_of_the_match", "mom", "manOfTheMatch"),
    ),
  };
}

export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Could not parse JSON from AI response");
  }
}
