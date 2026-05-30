import type { MatchResult, ParsedTeam, SquadSnapshotSchema } from "./matchSchema";
import type { SimModeConfig } from "./simModes";
import type { z } from "zod";

type SquadSnapshot = z.infer<typeof SquadSnapshotSchema>;

export function resolveScorecardTheme(simMode: SimModeConfig): "ipl" | "legends" {
  return simMode.scorecardTheme;
}

export function buildSquadSnapshots(teamA: ParsedTeam, teamB: ParsedTeam): [SquadSnapshot, SquadSnapshot] {
  const toSnap = (t: ParsedTeam): SquadSnapshot => ({
    teamName: t.name,
    players: t.playingXI.map((p, i) => ({
      order: i + 1,
      name: p.name,
      overseas: p.overseas || undefined,
      isCaptain: p.isCaptain || undefined,
      isWicketkeeper: p.isWicketkeeper || undefined,
    })),
  });
  return [toSnap(teamA), toSnap(teamB)];
}

export function getPdfBannerTitle(theme: "ipl" | "legends"): string {
  return theme === "legends" ? "IPL LEGENDS FANTASY LEAGUE" : "INDIAN PREMIER LEAGUE";
}

export function formatOversAssigned(overs: number[]): string {
  return overs.join(", ");
}

/** Attach partnership strings to FOW rows from partnership table */
export function attachFowPartnerships(match: MatchResult): void {
  const link = (
    fow: MatchResult["fallOfWickets"]["firstInnings"],
    parts: MatchResult["partnerships"]["firstInnings"],
  ) => {
    for (let i = 0; i < fow.length; i++) {
      const p = parts[i];
      if (p) fow[i].partnership = `${p.runs} (${p.balls})`;
    }
  };
  link(match.fallOfWickets.firstInnings, match.partnerships.firstInnings);
  link(match.fallOfWickets.secondInnings, match.partnerships.secondInnings);
}
