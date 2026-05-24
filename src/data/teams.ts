import { TeamDef } from "@/lib/types";

/** Official IPL franchise logos — PNG preferred where downloaded */
export const IPL_TEAMS: TeamDef[] = [
  { id: "CSK", name: "Chennai Super Kings", shortName: "CSK", primaryColor: "#FFCB05", secondaryColor: "#0081E9", logo: "CSK", logoUrl: "/logos/CSK.png" },
  { id: "MI", name: "Mumbai Indians", shortName: "MI", primaryColor: "#004BA0", secondaryColor: "#D1AB3E", logo: "MI", logoUrl: "/logos/MI.png" },
  { id: "RCB", name: "Royal Challengers Bengaluru", shortName: "RCB", primaryColor: "#EC1C24", secondaryColor: "#2B2A29", logo: "RCB", logoUrl: "/logos/RCB.png" },
  { id: "DC", name: "Delhi Capitals", shortName: "DC", primaryColor: "#004C93", secondaryColor: "#EF1B23", logo: "DC", logoUrl: "/logos/DC.png" },
  { id: "KKR", name: "Kolkata Knight Riders", shortName: "KKR", primaryColor: "#3A225D", secondaryColor: "#D4A843", logo: "KKR", logoUrl: "/logos/KKR.png" },
  { id: "SRH", name: "Sunrisers Hyderabad", shortName: "SRH", primaryColor: "#FF822A", secondaryColor: "#000000", logo: "SRH", logoUrl: "/logos/SRH.png" },
  { id: "PBKS", name: "Punjab Kings", shortName: "PBKS", primaryColor: "#ED1B24", secondaryColor: "#A7A9AC", logo: "PBKS", logoUrl: "/logos/PBKS.svg" },
  { id: "RR", name: "Rajasthan Royals", shortName: "RR", primaryColor: "#EA1A85", secondaryColor: "#254AA5", logo: "RR", logoUrl: "/logos/RR.png" },
  { id: "GT", name: "Gujarat Titans", shortName: "GT", primaryColor: "#1C1C2B", secondaryColor: "#A0E3F4", logo: "GT", logoUrl: "/logos/GT.svg" },
  { id: "LSG", name: "Lucknow Super Giants", shortName: "LSG", primaryColor: "#A72056", secondaryColor: "#FFCC00", logo: "LSG", logoUrl: "/logos/LSG.svg" },
];

export const TEAM_MAP: Record<string, TeamDef> = Object.fromEntries(
  IPL_TEAMS.map((t) => [t.id, t])
);
