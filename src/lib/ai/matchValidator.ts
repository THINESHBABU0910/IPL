import type { MatchResult, ParsedTeam } from "./matchSchema";
import { rebuildPartnershipsAndFow, syncBoundaries, notOutsForWickets } from "./matchSquadEnricher";
import { sanitizePlayerName, sanitizeDismissalStatus } from "./playerNames";

function isNotOut(status: string): boolean {
  return /not out/i.test(status);
}

function countNotOuts(batting: MatchResult["innings"][0]["batting"]): number {
  return batting.filter((b) => isNotOut(b.status)).length;
}

function sumBattingRuns(batting: MatchResult["innings"][0]["batting"]): number {
  return batting.reduce((s, b) => s + b.runs, 0);
}

function countDismissed(batting: MatchResult["innings"][0]["batting"]): number {
  return batting.filter((b) => !isNotOut(b.status)).length;
}

/** Recompute totals, wickets, SR, target and result from batting rows (LLM often gets these wrong) */
export function repairMatchStats(match: MatchResult, matchOvers: number): MatchResult {
  const repaired: MatchResult = {
    ...match,
    innings: match.innings.map((inn) => ({
      ...inn,
      batting: inn.batting.map((b) => ({ ...b })),
      extras: { ...inn.extras },
    })) as MatchResult["innings"],
    result: { ...match.result },
  };

  for (const inn of repaired.innings) {
    for (const b of inn.batting) {
      b.name = sanitizePlayerName(b.name);
      b.status = sanitizeDismissalStatus(b.status);
      if (/^dismissed$/i.test(b.status.trim())) {
        b.status = "b Bowler";
      }
      const boundaryRuns = b.fours * 4 + b.sixes * 6;
      if (boundaryRuns > b.runs || (b.runs > 0 && boundaryRuns === 0)) {
        const fixed = syncBoundaries(b.runs, () => 0.5);
        b.fours = fixed.fours;
        b.sixes = fixed.sixes;
      }
      if (b.runs === 0) {
        b.balls = Math.min(b.balls, 3);
      }
      if (b.balls > 0) {
        b.strikeRate = Math.round((b.runs / b.balls) * 1000) / 10;
      } else {
        b.strikeRate = 0;
      }
    }

    const componentExtras =
      inn.extras.wides + inn.extras.noBalls + inn.extras.byes + inn.extras.legByes;
    if (inn.extras.total < componentExtras) {
      inn.extras.total = componentExtras;
    }

    const batRuns = sumBattingRuns(inn.batting);
    inn.totalRuns = batRuns + inn.extras.total;
    inn.totalWickets = Math.min(10, countDismissed(inn.batting));

    const expectedNotOuts = notOutsForWickets(inn.totalWickets);
    let notOuts = countNotOuts(inn.batting);
    if (notOuts > expectedNotOuts) {
      const notOutBatters = inn.batting
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => isNotOut(b.status))
        .sort((a, c) => a.b.runs - c.b.runs);
      for (let k = expectedNotOuts; k < notOutBatters.length; k++) {
        notOutBatters[k].b.status = "b Bowler";
      }
      inn.totalWickets = Math.min(10, countDismissed(inn.batting));
      notOuts = countNotOuts(inn.batting);
    }

    if (notOuts > 2) {
      const notOutBatters = inn.batting
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => isNotOut(b.status))
        .sort((a, c) => c.b.runs - a.b.runs);
      for (let k = 2; k < notOutBatters.length; k++) {
        notOutBatters[k].b.status = "b Bowler";
      }
      inn.totalWickets = Math.min(10, countDismissed(inn.batting));
      notOuts = countNotOuts(inn.batting);
    }

    if (inn.totalWickets >= 10) {
      inn.overs = matchOvers;
    } else if (Math.abs(inn.overs - matchOvers) > 0.01 && inn.overs > matchOvers) {
      inn.overs = matchOvers;
    }

    inn.runRate = inn.overs > 0 ? Math.round((inn.totalRuns / inn.overs) * 100) / 100 : 0;

    if (inn.bowling?.length) {
      for (const bw of inn.bowling) {
        bw.name = sanitizePlayerName(bw.name);
      }
    }
  }

  const [inn1, inn2] = repaired.innings;
  inn2.target = inn1.totalRuns + 1;

  const target = inn2.target;
  const chased = inn2.totalRuns >= target;
  const wicketsLeft = 10 - inn2.totalWickets;

  if (chased) {
    repaired.result.winner = inn2.teamName;
    if (!repaired.result.margin.toLowerCase().includes("wicket")) {
      repaired.result.margin = `by ${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}`;
    }
    repaired.result.summary = `${inn2.teamName} won ${repaired.result.margin}`;
  } else {
    repaired.result.winner = inn1.teamName;
    const defMargin = target - inn2.totalRuns - 1;
    if (!repaired.result.margin.toLowerCase().includes("run")) {
      repaired.result.margin = `by ${Math.max(1, defMargin)} run${defMargin === 1 ? "" : "s"}`;
    }
    repaired.result.summary = `${inn1.teamName} won ${repaired.result.margin}`;
  }

  rebuildPartnershipsAndFow(repaired, matchOvers);

  return repaired;
}

export function validateMatchResult(
  match: MatchResult,
  matchOvers: number,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
): string[] {
  const errors: string[] = [];
  const [inn1, inn2] = match.innings;

  for (const [idx, inn] of [inn1, inn2].entries()) {
    const label = `Innings ${idx + 1} (${inn.teamName})`;

    const batRuns = sumBattingRuns(inn.batting);
    const expectedTotal = batRuns + inn.extras.total;
    if (inn.totalRuns !== expectedTotal) {
      errors.push(`${label}: totalRuns ${inn.totalRuns} != batting ${batRuns} + extras ${inn.extras.total} (${expectedTotal})`);
    }

    const extrasSum = inn.extras.wides + inn.extras.noBalls + inn.extras.byes + inn.extras.legByes;
    if (inn.extras.total < extrasSum) {
      errors.push(`${label}: extras.total ${inn.extras.total} less than component sum ${extrasSum}`);
    }

    const dismissed = inn.batting.filter((b) => !isNotOut(b.status)).length;
    if (inn.totalWickets !== dismissed) {
      errors.push(`${label}: totalWickets ${inn.totalWickets} != dismissed count ${dismissed}`);
    }

    const notOuts = countNotOuts(inn.batting);
    if (notOuts > 2) {
      errors.push(`${label}: ${notOuts} not-out batters (max 2 allowed)`);
    }

    if (Math.abs(inn.overs - matchOvers) > 0.01 && inn.totalWickets < 10) {
      errors.push(`${label}: overs ${inn.overs} expected ${matchOvers} (unless all-out)`);
    }

    for (const b of inn.batting) {
      if (b.balls > 0) {
        const expectedSr = Math.round((b.runs / b.balls) * 1000) / 10;
        if (Math.abs(expectedSr - b.strikeRate) > 0.2) {
          errors.push(`${label}: ${b.name} SR ${b.strikeRate} expected ~${expectedSr}`);
        }
      }
    }
  }

  if (inn2.target !== undefined && inn2.target !== inn1.totalRuns + 1) {
    errors.push(`Second innings target ${inn2.target} should be ${inn1.totalRuns + 1}`);
  }

  const firstBatting = match.toss.decision === "bat" ? match.toss.winner : (inn1.teamName === match.toss.winner ? teamB.name : teamA.name);
  if (!inn1.teamName.toLowerCase().includes(firstBatting.slice(0, 4).toLowerCase()) &&
      !firstBatting.toLowerCase().includes(inn1.teamName.slice(0, 4).toLowerCase())) {
    // Soft check — team names may differ in formatting
  }

  if (inn2.totalRuns > (inn2.target ?? inn1.totalRuns + 1) - 1) {
    if (!match.result.winner.toLowerCase().includes(inn2.teamName.slice(0, 4).toLowerCase())) {
      errors.push("Chasing team scored above target but winner may be incorrect");
    }
  } else if (inn2.totalRuns < (inn2.target ?? inn1.totalRuns + 1)) {
    if (!match.result.winner.toLowerCase().includes(inn1.teamName.slice(0, 4).toLowerCase())) {
      errors.push("Defending team should win when chase falls short");
    }
  }

  if (!match.result.winner || match.result.winner.length < 2) {
    errors.push("Missing result winner");
  }

  if (!match.playerOfTheMatch) {
    errors.push("Missing Player of the Match");
  }

  return errors;
}

export function validateBowlingFromQuota(
  match: MatchResult,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
  matchOvers: number,
): string[] {
  const errors: string[] = [];

  const buildBowlingRows = (team: ParsedTeam, inningsIdx: number) => {
    const inn = match.innings[inningsIdx];
    if (!inn.bowling?.length) return;

    const quotaMap = new Map<string, number[]>();
    for (const q of team.bowlingQuota) {
      quotaMap.set(q.name.toLowerCase(), q.overs);
    }

    for (const bowler of inn.bowling) {
      const quota = quotaMap.get(bowler.name.toLowerCase());
      if (quota && Math.abs(bowler.overs - quota.length) > 0.01) {
        errors.push(`Bowling: ${bowler.name} bowled ${bowler.overs} overs, quota assigns ${quota.length}`);
      }
    }

    const totalBowlingOvers = inn.bowling.reduce((s, b) => s + b.overs, 0);
    if (Math.abs(totalBowlingOvers - matchOvers) > 0.1) {
      errors.push(`Innings ${inningsIdx + 1} bowling overs sum ${totalBowlingOvers}, expected ${matchOvers}`);
    }
  };

  buildBowlingRows(teamB, 0);
  buildBowlingRows(teamA, 1);

  return errors;
}

/** Ensure LLM output includes bowling figures derived from innings if missing */
export function enrichMatchWithBowling(match: MatchResult, teamA: ParsedTeam, teamB: ParsedTeam): MatchResult {
  const enriched = { ...match, innings: [...match.innings] as MatchResult["innings"] };

  if (!enriched.innings[0].bowling?.length) {
    enriched.innings[0] = {
      ...enriched.innings[0],
      bowling: buildPlaceholderBowling(teamB, enriched.innings[0].totalRuns, enriched.innings[0].totalWickets, enriched.innings[0].overs),
    };
  }
  if (!enriched.innings[1].bowling?.length) {
    enriched.innings[1] = {
      ...enriched.innings[1],
      bowling: buildPlaceholderBowling(teamA, enriched.innings[1].totalRuns, enriched.innings[1].totalWickets, enriched.innings[1].overs),
    };
  }

  return enriched;
}

function buildPlaceholderBowling(
  fieldingTeam: ParsedTeam,
  runsConceded: number,
  wickets: number,
  overs: number,
): MatchResult["innings"][0]["bowling"] {
  const quota = fieldingTeam.bowlingQuota;
  if (!quota.length) return [];

  const rows = quota.map((q, i) => {
    const bowlerOvers = q.overs.length;
    const share = quota.length > 0 ? bowlerOvers / overs : 1 / quota.length;
    return {
      name: q.name,
      overs: bowlerOvers,
      maidens: 0,
      runs: Math.round(runsConceded * share),
      wickets: i === 0 ? Math.min(wickets, 3) : Math.floor(wickets / quota.length),
      economy: bowlerOvers > 0 ? Math.round((runsConceded * share / bowlerOvers) * 100) / 100 : 0,
      isImpact: fieldingTeam.impactPlayer?.name.toLowerCase() === q.name.toLowerCase(),
    };
  });

  return rows;
}
