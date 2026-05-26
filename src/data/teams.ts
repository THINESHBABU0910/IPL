/** @deprecated Use getTeamsForLeague("ipl") from leagueRegistry */
export { IPL_TEAMS } from "./leagues/ipl/teams";
import { getTeamMapForLeague } from "./leagueRegistry";

/** Default IPL team map — use getTeamMapForLeague(league) in league-aware code */
export const TEAM_MAP = getTeamMapForLeague("ipl");
