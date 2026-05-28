import { IPL_TEAMS } from "@/data/leagues/ipl/teams";

export const IPL_TEAM_IDS = IPL_TEAMS.map((t) => t.id);

/** T20 league max overs per innings */
export const T20_MAX_OVERS = 20;
export const T20_ALL_OUT_WICKETS = 10;

/** User shorthand → franchise id */
const TEAM_ALIASES: Record<string, string> = {
  PUNJAB: "PBKS",
  PBKS: "PBKS",
  KXIP: "PBKS",
  PUNJABKINGS: "PBKS",
  CSK: "CSK",
  MI: "MI",
  RCB: "RCB",
  DC: "DC",
  KKR: "KKR",
  SRH: "SRH",
  RR: "RR",
  GT: "GT",
  LSG: "LSG",
};

export interface InningsLine {
  teamId: string;
  runs: number;
  wickets: number;
  /** Overs batted/bowled — decimal for NRR (19.4 = 19 overs + 4 balls) */
  overs: number;
}

export interface ParsedMatch {
  matchNo: number;
  innings: [InningsLine, InningsLine];
  winnerId: string;
  loserId: string;
  margin: string;
}

export interface TeamStandingRow {
  teamId: string;
  teamName: string;
  shortName: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  runsFor: number;
  runsAgainst: number;
  oversFaced: number;
  oversBowled: number;
  nrr: number;
}

export interface StandingsValidation {
  ok: boolean;
  checks: string[];
}

export interface StandingsResult {
  matches: ParsedMatch[];
  standings: TeamStandingRow[];
  errors: string[];
  warnings: string[];
  validation: StandingsValidation;
}

const SCORE_LINE =
  /^([A-Za-z]+)\s*-\s*(\d+)\s*\/\s*(\d+)\s*\(\s*([\d.]+)\s*overs?\s*\)?/i;

export function normalizeTeamId(raw: string): string | null {
  const key = raw.replace(/\s+/g, "").toUpperCase();
  const id = TEAM_ALIASES[key];
  if (id && IPL_TEAM_IDS.includes(id)) return id;
  return null;
}

export type ParseOversResult =
  | { ok: true; overs: number }
  | { ok: false; error: string };

/**
 * Cricket overs: 19.4 = 19 overs + 4 balls (not 19.4 decimal overs).
 * Ball digit must be 0–5.
 */
export function parseOversDecimal(raw: string, maxOvers = T20_MAX_OVERS): ParseOversResult {
  const t = raw.trim();
  const m = t.match(/^(\d+)(?:\.(\d))?$/);
  if (!m) {
    return { ok: false, error: `Invalid overs "${raw}"` };
  }
  const whole = Number(m[1]);
  const ballStr = m[2];
  if (ballStr !== undefined) {
    if (ballStr.length !== 1) {
      return { ok: false, error: `Overs "${raw}": use one ball digit (0–5), e.g. 19.4 not 19.40` };
    }
    const balls = Number(ballStr);
    if (balls < 0 || balls > 5) {
      return { ok: false, error: `Overs "${raw}": ball digit must be 0–5` };
    }
    const decimal = whole + balls / 6;
    if (decimal > maxOvers + 0.001) {
      return { ok: false, error: `Overs "${raw}" exceed ${maxOvers} overs` };
    }
    return { ok: true, overs: decimal };
  }
  if (whole > maxOvers) {
    return { ok: false, error: `Overs "${raw}" exceed ${maxOvers} overs` };
  }
  return { ok: true, overs: whole };
}

/** NRR always uses overs actually played (from the scorecard). */
export function effectiveOversForNrr(actualOvers: number): number {
  return actualOvers;
}

/** Display decimal overs as cricket notation: 19.666… → "19.4" */
export function formatOversCricket(decimalOvers: number): string {
  const whole = Math.floor(decimalOvers + 1e-9);
  const balls = Math.round((decimalOvers - whole) * 6);
  if (balls <= 0) return String(whole);
  if (balls >= 6) return String(whole + 1);
  return `${whole}.${balls}`;
}

export function computeNrr(
  runsFor: number,
  oversFaced: number,
  runsAgainst: number,
  oversBowled: number,
): number {
  if (oversFaced <= 0 || oversBowled <= 0) return 0;
  return runsFor / oversFaced - runsAgainst / oversBowled;
}

function parseInningsLine(line: string, lineNo: number): { inn: InningsLine | null; error?: string } {
  const m = line.trim().match(SCORE_LINE);
  if (!m) return { inn: null };

  const teamId = normalizeTeamId(m[1]);
  if (!teamId) {
    return { inn: null, error: `Line ${lineNo}: unknown team "${m[1]}"` };
  }

  const runs = Number(m[2]);
  const wickets = Number(m[3]);
  const oversParsed = parseOversDecimal(m[4]);

  if (!oversParsed.ok) {
    return { inn: null, error: `Line ${lineNo}: ${oversParsed.error}` };
  }

  if (!Number.isFinite(runs) || runs < 0 || runs > 300) {
    return { inn: null, error: `Line ${lineNo}: runs must be 0–300 (${runs})` };
  }
  if (!Number.isFinite(wickets) || wickets < 0 || wickets > T20_ALL_OUT_WICKETS) {
    return { inn: null, error: `Line ${lineNo}: wickets must be 0–${T20_ALL_OUT_WICKETS}` };
  }

  const overs = oversParsed.overs;

  return {
    inn: { teamId, runs, wickets, overs },
  };
}

export function parseScorecardText(text: string): {
  inningsLines: InningsLine[];
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const inningsLines: InningsLine[] = [];
  let lineNo = 0;

  for (const raw of text.split(/\r?\n/)) {
    lineNo += 1;
    const line = raw.trim();
    if (!line) continue;
    if (/^\d+\s*(?:ST|ND|RD|TH)\s*MATCH/i.test(line)) continue;

    const parsed = parseInningsLine(line, lineNo);
    if (parsed.error) {
      errors.push(parsed.error);
      continue;
    }
    if (parsed.inn) {
      inningsLines.push(parsed.inn);
      continue;
    }

    if (/[A-Za-z]+\s*-\s*\d+\s*\/\s*\d+/i.test(line)) {
      errors.push(`Line ${lineNo}: could not parse score — ${line}`);
    }
  }

  return { inningsLines, errors, warnings };
}

function formatMargin(winner: InningsLine, loser: InningsLine): string {
  if (winner.runs === loser.runs) return "Tie";
  const diff = winner.runs - loser.runs;
  if (winner.overs < loser.overs && winner.overs < T20_MAX_OVERS) {
    const ballsRem = Math.round((T20_MAX_OVERS - winner.overs) * 6);
    if (ballsRem > 0) return `${diff} runs (${ballsRem} balls remaining)`;
  }
  return `${diff} runs`;
}

export function buildStandingsFromInnings(inningsLines: InningsLine[]): StandingsResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const matches: ParsedMatch[] = [];
  const teamMap = Object.fromEntries(IPL_TEAMS.map((t) => [t.id, t]));

  type Acc = {
    played: number;
    won: number;
    lost: number;
    tied: number;
    points: number;
    runsFor: number;
    runsAgainst: number;
    oversFaced: number;
    oversBowled: number;
  };

  const acc: Record<string, Acc> = {};
  for (const id of IPL_TEAM_IDS) {
    acc[id] = {
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsFor: 0,
      runsAgainst: 0,
      oversFaced: 0,
      oversBowled: 0,
    };
  }

  for (let i = 0; i + 1 < inningsLines.length; i += 2) {
    const a = inningsLines[i];
    const b = inningsLines[i + 1];
    const matchNo = matches.length + 1;

    if (a.teamId === b.teamId) {
      errors.push(`Match ${matchNo}: same team twice (${a.teamId}) — skipped`);
      continue;
    }

    if (a.runs === b.runs) {
      errors.push(`Match ${matchNo}: tie ${a.teamId} vs ${b.teamId} — 1 point each`);
      for (const side of [a, b]) {
        const opp = side === a ? b : a;
        acc[side.teamId].played += 1;
        acc[side.teamId].tied += 1;
        acc[side.teamId].points += 1;
        acc[side.teamId].runsFor += side.runs;
        acc[side.teamId].runsAgainst += opp.runs;
        acc[side.teamId].oversFaced += side.overs;
        acc[side.teamId].oversBowled += opp.overs;
      }
      continue;
    }

    const winner = a.runs > b.runs ? a : b;
    const loser = winner === a ? b : a;

    matches.push({
      matchNo,
      innings: [a, b],
      winnerId: winner.teamId,
      loserId: loser.teamId,
      margin: formatMargin(winner, loser),
    });

    for (const side of [a, b]) {
      const opp = side === a ? b : a;
      acc[side.teamId].played += 1;
      acc[side.teamId].runsFor += side.runs;
      acc[side.teamId].runsAgainst += opp.runs;
      acc[side.teamId].oversFaced += side.overs;
      acc[side.teamId].oversBowled += opp.overs;
    }
    acc[winner.teamId].won += 1;
    acc[winner.teamId].points += 2;
    acc[loser.teamId].lost += 1;
  }

  if (inningsLines.length % 2 === 1) {
    errors.push("Odd number of innings lines — last line ignored");
  }

  const standings: TeamStandingRow[] = IPL_TEAM_IDS.map((teamId) => {
    const s = acc[teamId];
    const nrr = computeNrr(s.runsFor, s.oversFaced, s.runsAgainst, s.oversBowled);
    const meta = teamMap[teamId];
    return {
      teamId,
      teamName: meta.name,
      shortName: meta.shortName,
      played: s.played,
      won: s.won,
      lost: s.lost,
      tied: s.tied,
      points: s.points,
      runsFor: s.runsFor,
      runsAgainst: s.runsAgainst,
      oversFaced: s.oversFaced,
      oversBowled: s.oversBowled,
      nrr,
    };
  }).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    return y.nrr - x.nrr;
  });

  const validation = validateStandings(matches, standings, inningsLines.length);

  return { matches, standings, errors, warnings, validation };
}

export function validateStandings(
  matches: ParsedMatch[],
  standings: TeamStandingRow[],
  inningsLineCount: number,
): StandingsValidation {
  const checks: string[] = [];
  let ok = true;

  const totalWins = standings.reduce((s, r) => s + r.won, 0);
  const totalLosses = standings.reduce((s, r) => s + r.lost, 0);
  const totalPoints = standings.reduce((s, r) => s + r.points, 0);
  const expectedPoints = matches.length * 2 + standings.reduce((s, r) => s + r.tied, 0);

  if (totalWins === matches.length) {
    checks.push(`Wins total (${totalWins}) = matches played (${matches.length})`);
  } else {
    ok = false;
    checks.push(`FAIL: wins (${totalWins}) ≠ matches (${matches.length})`);
  }

  if (totalWins === totalLosses) {
    checks.push(`Wins (${totalWins}) = losses (${totalLosses})`);
  } else {
    ok = false;
    checks.push(`FAIL: wins (${totalWins}) ≠ losses (${totalLosses})`);
  }

  if (totalPoints === expectedPoints) {
    checks.push(`Points total (${totalPoints}) matches results`);
  } else {
    ok = false;
    checks.push(`FAIL: points (${totalPoints}) ≠ expected (${expectedPoints})`);
  }

  for (const row of standings) {
    if (row.played !== row.won + row.lost + row.tied) {
      ok = false;
      checks.push(`FAIL: ${row.shortName} M(${row.played}) ≠ W+L+T(${row.won + row.lost + row.tied})`);
    }
  }

  const paired = matches.length * 2;
  if (inningsLineCount === paired || inningsLineCount === paired + (inningsLineCount % 2)) {
    checks.push(`${matches.length} matches from ${inningsLineCount} innings lines`);
  }

  if (ok) checks.unshift("All integrity checks passed");

  return { ok, checks };
}

export function computeStandingsFromScorecardText(text: string): StandingsResult {
  const { inningsLines, errors: parseErrors, warnings: parseWarnings } = parseScorecardText(text);
  const built = buildStandingsFromInnings(inningsLines);
  return {
    ...built,
    errors: [...parseErrors, ...built.errors],
    warnings: [...parseWarnings, ...built.warnings],
  };
}

export function formatNrr(nrr: number): string {
  const sign = nrr >= 0 ? "+" : "";
  return `${sign}${nrr.toFixed(3)}`;
}

/** Reference: KKR 200/6 (20) vs SRH 120/10 (16.4) — NRR uses actual overs only */
export function referenceMatchNrr(): { kkr: number; srh: number } {
  const kkrOvers = 20;
  const srhOvers = 16 + 4 / 6;
  return {
    kkr: computeNrr(200, kkrOvers, 120, srhOvers),
    srh: computeNrr(120, srhOvers, 200, kkrOvers),
  };
}
