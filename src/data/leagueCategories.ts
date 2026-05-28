/** Shared auction category / set definitions for 10-franchise leagues */
export const CATEGORIES_10_TEAM = [
  { id: "marquee", name: "Marquee Players", sets: ["M1", "M2", "M3"] },
  { id: "batters", name: "Batters", sets: ["BA1", "BA2", "BA3", "BA4"] },
  { id: "allrounders", name: "All-Rounders", sets: ["AL1", "AL2", "AL3", "AL4"] },
  { id: "wicketkeepers", name: "Wicket-Keepers", sets: ["WK1", "WK2", "WK3"] },
  { id: "fast_bowlers", name: "Fast Bowlers", sets: ["FA1", "FA2", "FA3", "FA4"] },
  { id: "spinners", name: "Spin Bowlers", sets: ["SP1", "SP2", "SP3"] },
  {
    id: "uncapped",
    name: "Uncapped",
    sets: ["UBA1", "UBA2", "UAL1", "UAL2", "UWK1", "UWK2", "UFA1", "UFA2", "USP1", "USP2"],
  },
] as const;

export const SET_ORDER_10_TEAM = [
  "M", "BA", "AL", "WK", "FA", "SP", "UBA", "UAL", "UWK", "UFA", "USP",
] as const;

export const LEGEND_CATEGORIES_10_TEAM = [
  { id: "ipl_legends", name: "IPL Legends", sets: ["IL1", "IL2", "IL3", "IL4"] },
  { id: "intl_legends", name: "International Legends", sets: ["INT1", "INT2", "INT3", "INT4"] },
  { id: "batters", name: "Legend Batters", sets: ["BA1", "BA2", "BA3", "BA4"] },
  { id: "allrounders", name: "Legend All-Rounders", sets: ["AL1", "AL2", "AL3", "AL4"] },
  { id: "wicketkeepers", name: "Legend Wicket-Keepers", sets: ["WK1", "WK2", "WK3"] },
  { id: "fast_bowlers", name: "Legend Fast Bowlers", sets: ["FA1", "FA2", "FA3", "FA4"] },
  { id: "spinners", name: "Legend Spinners", sets: ["SP1", "SP2", "SP3", "SP4"] },
] as const;

export const LEGEND_SET_ORDER_10_TEAM = [
  "IL", "INT", "BA", "AL", "WK", "FA", "SP",
] as const;
