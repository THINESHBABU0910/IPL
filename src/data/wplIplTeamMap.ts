/** Maps legacy WPL franchise codes to official IPL team ids (logos + lobby) */
export const WPL_TO_IPL_TEAM: Record<string, string> = {
  WMI: "MI",
  WRCB: "RCB",
  WDC: "DC",
  GG: "GT",
  UPW: "LSG",
};

export function mapToIplTeamId(teamId: string): string {
  return WPL_TO_IPL_TEAM[teamId] ?? teamId;
}
