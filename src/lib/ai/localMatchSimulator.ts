import type { MatchResult } from "./matchSchema";
import type { NormalizeContext } from "./matchResponseNormalizer";

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 0xffffffff;
  };
}

function emptyInnings(teamName: string, matchOvers: number): MatchResult["innings"][0] {
  return {
    teamName,
    batting: [],
    extras: { total: 0, wides: 0, noBalls: 0, byes: 0, legByes: 0 },
    totalRuns: 0,
    totalWickets: 0,
    overs: matchOvers,
    runRate: 0,
    didNotBat: [],
  };
}

/** Fast deterministic simulation — no external LLM (Render-safe, sub-second). */
export function simulateMatchLocally(ctx: NormalizeContext): MatchResult {
  const seed = `${ctx.teamA.name}-${ctx.teamB.name}-${ctx.venue.id}-${ctx.matchOvers}`;
  const rng = seededRandom(`${seed}-local`);

  const tossWinner = rng() > 0.5 ? ctx.teamA.name : ctx.teamB.name;
  const decision = rng() > 0.48 ? "bat" : "bowl";
  const decisionText =
    decision === "bat"
      ? `${tossWinner} won the toss and elected to bat first`
      : `${tossWinner} won the toss and elected to bowl first`;

  const impactPlayers: MatchResult["impactPlayers"] = [];
  if (ctx.teamA.impactPlayer) {
    impactPlayers.push({
      teamName: ctx.teamA.name,
      playerIn: ctx.teamA.impactPlayer.name,
      reason: ctx.teamA.impactPlayer.notes || "Impact substitution",
      activatedAt: decision === "bat" && tossWinner === ctx.teamA.name ? "2nd innings fielding" : "2nd innings",
    });
  }
  if (ctx.teamB.impactPlayer) {
    impactPlayers.push({
      teamName: ctx.teamB.name,
      playerIn: ctx.teamB.impactPlayer.name,
      reason: ctx.teamB.impactPlayer.notes || "Impact substitution",
      activatedAt: decision === "bat" && tossWinner === ctx.teamB.name ? "2nd innings fielding" : "2nd innings",
    });
  }

  const skeleton: MatchResult = {
    matchTitle: `${ctx.teamA.name} vs ${ctx.teamB.name}`,
    stage: ctx.stage || "League",
    venue: ctx.venue.name,
    venueCity: ctx.venue.city,
    pitchType: ctx.venue.pitchType,
    pitchDescription: ctx.venue.pitchDescription,
    dewCondition: ctx.venue.typicalDew,
    toss: { winner: tossWinner, decision, decisionText },
    impactPlayers,
    innings: [emptyInnings(ctx.teamA.name, ctx.matchOvers), emptyInnings(ctx.teamB.name, ctx.matchOvers)],
    partnerships: { firstInnings: [], secondInnings: [] },
    fallOfWickets: { firstInnings: [], secondInnings: [] },
    result: { winner: "", margin: "", summary: "" },
    playerOfTheMatch: "",
  };

  return skeleton;
}
