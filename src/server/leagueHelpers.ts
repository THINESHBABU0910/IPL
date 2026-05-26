import type { LeagueId } from "@/lib/leagueTypes";
import { getLeagueConfig, parseLeagueId } from "@/data/leagueRegistry";

interface RoomLeagueSource {
  league?: LeagueId;
}

export function getRoomLeague(room: RoomLeagueSource): LeagueId {
  return parseLeagueId(room.league);
}

export function getRoomConfig(room: RoomLeagueSource) {
  return getLeagueConfig(getRoomLeague(room));
}

export function getRoomRules(room: RoomLeagueSource) {
  return getRoomConfig(room).rules;
}

export function getRoomMaxFranchises(room: RoomLeagueSource): number {
  return getRoomRules(room).maxFranchises;
}

export function getRoomTotalPurse(room: RoomLeagueSource): number {
  return getRoomRules(room).totalPurse;
}

export function getRoomTeamMap(room: RoomLeagueSource) {
  return Object.fromEntries(getRoomConfig(room).teams.map((t) => [t.id, t]));
}

export function getRoomTeamDef(room: RoomLeagueSource, teamId: string) {
  return getRoomTeamMap(room)[teamId];
}
