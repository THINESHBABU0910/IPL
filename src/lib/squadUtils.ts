import { Player, RoomState } from "./types";
import { getTeamsForLeague } from "@/data/leagueRegistry";
import { getLeagueConfig } from "@/data/leagueRegistry";

export const ROLE_ORDER = ["WICKETKEEPER", "BATTER", "ALL-ROUNDER", "BOWLER"] as const;
export const ROLE_LABELS: Record<string, string> = {
  WICKETKEEPER: "WICKET-KEEPER",
  BATTER: "BATTER",
  "ALL-ROUNDER": "ALL-ROUNDER",
  BOWLER: "BOWLER",
};

export function getTeamSoldPrices(teamId: string, roomState: RoomState): Record<string, number> {
  const team = roomState.teams[teamId];
  if (!team) return {};
  const prices: Record<string, number> = {};

  if (roomState.gameType === "draft") {
    for (const pick of roomState.draft?.picks ?? []) {
      if (pick.teamId === teamId) prices[pick.player.id] = 0;
    }
    for (const p of team.squad) {
      if (!(p.id in prices)) prices[p.id] = 0;
    }
    return prices;
  }

  for (const sale of roomState.auction.soldPlayers) {
    if (sale.teamId === teamId) prices[sale.player.id] = sale.price;
  }
  for (const p of team.retainedPlayers) {
    prices[p.id] = p.basePriceLakhs;
  }
  return prices;
}

export function getSortedTeamIds(roomState: RoomState, myTeamId: string | null): string[] {
  const ids =
    roomState.gameType === "draft"
      ? (roomState.draftTeamSlots?.map((s) => s.id) ??
        Object.keys(roomState.teams).filter((id) => roomState.teams[id]))
          .filter((id) => {
            const t = roomState.teams[id];
            return t && (t.squad.length > 0 || (!!t.ownerId && !t.isVacant));
          })
      : getTeamsForLeague(roomState.league).map((t) => t.id).filter((id) => roomState.teams[id]);

  return ids.sort((a, b) => {
    if (a === myTeamId) return -1;
    if (b === myTeamId) return 1;
    const sa = (roomState.teams[a].squad.length + roomState.teams[a].retainedPlayers.length);
    const sb = (roomState.teams[b].squad.length + roomState.teams[b].retainedPlayers.length);
    if (sb !== sa) return sb - sa;
    return roomState.teams[a].shortName.localeCompare(roomState.teams[b].shortName);
  });
}

export function getTeamPlayers(teamId: string, roomState: RoomState): Player[] {
  const team = roomState.teams[teamId];
  if (!team) return [];
  return [...team.retainedPlayers, ...team.squad];
}

export function getTeamSpent(teamId: string, roomState: RoomState): number {
  const team = roomState.teams[teamId];
  if (!team) return 0;
  if (roomState.gameType === "draft") return 0;
  return getLeagueConfig(roomState.league).rules.totalPurse - team.purse;
}

export function groupPlayersByRole(players: Player[]) {
  return ROLE_ORDER.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    players: players.filter((p) => p.role === role),
  })).filter((g) => g.players.length > 0);
}

export function isTeamOwnerHost(teamId: string, roomState: RoomState): boolean {
  const team = roomState.teams[teamId];
  if (!team?.ownerId) return false;
  return team.ownerId === roomState.hostSocketId
    || roomState.participants.some((p) => p.teamId === teamId && p.isHost);
}
