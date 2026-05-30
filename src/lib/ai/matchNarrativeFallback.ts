import type { MatchResult, MatchSummary } from "./matchSchema";

/** Deterministic narrative when LLM narrative step fails */
export function buildFallbackMatchSummary(match: MatchResult): MatchSummary {
  const [inn1, inn2] = match.innings;
  const mom = Array.isArray(match.playerOfTheMatch)
    ? match.playerOfTheMatch[0]
    : match.playerOfTheMatch;

  const top1 = [...inn1.batting].sort((a, b) => b.runs - a.runs)[0];
  const top2 = [...inn2.batting].sort((a, b) => b.runs - a.runs)[0];
  const bestBowl = [...(inn1.bowling ?? []), ...(inn2.bowling ?? [])]
    .filter((b) => b.overs > 0)
    .sort((a, b) => a.economy - b.economy)[0];

  const hiPart =
    [...match.partnerships.firstInnings, ...match.partnerships.secondInnings]
      .sort((a, b) => b.runs - a.runs)[0];

  return {
    playerOfTheMatchBlurb: mom
      ? `${mom} — decisive contribution in a ${match.result.margin} finish at ${match.venue}.`
      : `${top2?.name ?? "Star batter"} shaped the chase with ${top2?.runs ?? 0} runs.`,
    turningPoint: `Middle overs at ${match.venue}: momentum swung when ${top2?.name ?? "the chase"} accelerated against ${match.pitchType} conditions.`,
    winningFactors: [
      `${match.toss.winner}'s toss call (${match.toss.decision}) set the tactical tone.`,
      match.dewCondition ? `Dew (${match.dewCondition}) influenced grip and boundary hitting.` : "Surface stayed true for stroke-makers.",
      bestBowl ? `${bestBowl.name}'s spell (${bestBowl.wickets}/${bestBowl.runs}) contained one phase.` : "Bowling bursts checked scoring windows.",
    ],
    highestPartnership: hiPart
      ? `${hiPart.batters} (${hiPart.runs} off ${hiPart.balls})`
      : "N/A",
    bestBowling: bestBowl
      ? `${bestBowl.name} (${bestBowl.overs}-${bestBowl.maidens}-${bestBowl.runs}-${bestBowl.wickets})`
      : "N/A",
    bestBatting: `${top1?.name ?? inn1.teamName} (${top1?.runs ?? 0} off ${top1?.balls ?? 0}); ${top2?.name ?? inn2.teamName} (${top2?.runs ?? 0} off ${top2?.balls ?? 0})`,
    captaincyImpact: `Captaincy and field placements around ${match.pitchType} deck maximized matchup advantages.`,
  };
}
