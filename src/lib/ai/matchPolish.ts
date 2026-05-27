import type { MatchResult } from "./matchSchema";
import { rebuildPartnershipsAndFow } from "./matchSquadEnricher";
import { sanitizePlayerName, sanitizeDismissalStatus } from "./playerNames";
import { isValidImpactActivatedAt } from "./playerPerformance";

/** Final cleanup pass — always run before PDF/JSON response */
export function polishMatchResult(match: MatchResult, matchOvers: number): MatchResult {
  const polished: MatchResult = {
    ...match,
    impactPlayers: match.impactPlayers.map((ip) => ({
      ...ip,
      teamName: sanitizePlayerName(ip.teamName),
      playerIn: sanitizePlayerName(ip.playerIn),
      activatedAt: isValidImpactActivatedAt(ip.activatedAt)
        ? ip.activatedAt
        : "2nd innings fielding",
    })),
    innings: match.innings.map((inn) => ({
      ...inn,
      teamName: sanitizePlayerName(inn.teamName),
      batting: inn.batting.map((b) => ({
        ...b,
        name: sanitizePlayerName(b.name),
        status: sanitizeDismissalStatus(b.status),
      })),
      bowling: inn.bowling?.map((bw) => ({
        ...bw,
        name: sanitizePlayerName(bw.name),
      })),
      didNotBat: inn.didNotBat?.map((n) => sanitizePlayerName(n)),
    })) as MatchResult["innings"],
    result: {
      ...match.result,
      winner: sanitizePlayerName(match.result.winner),
    },
    playerOfTheMatch:
      typeof match.playerOfTheMatch === "string"
        ? match.playerOfTheMatch
        : match.playerOfTheMatch.join(", "),
  };

  rebuildPartnershipsAndFow(polished, matchOvers);
  return polished;
}
