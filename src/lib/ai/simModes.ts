/** AI Match Sim — franchise leagues vs Legends League */

export type SimTab = "franchise" | "legends";

export type FranchiseCompetition = "ipl" | "bbl" | "hundred" | "sa20" | "wbbl";

export interface SimModeConfig {
  tab: SimTab;
  competition?: FranchiseCompetition;
  stage: string;
  scorecardTheme: "ipl" | "legends";
  pdfBanner: string;
  competitionLabel: string;
  defaultVenueId: string;
  /** Higher scores / more sixes for legends fantasy */
  scoringBoost: number;
}

const FRANCHISE_META: Record<
  FranchiseCompetition,
  { label: string; banner: string; defaultVenue: string; stageOptions: string[] }
> = {
  ipl: {
    label: "IPL",
    banner: "INDIAN PREMIER LEAGUE",
    defaultVenue: "chepauk",
    stageOptions: ["League", "Qualifier 1", "Qualifier 2", "Eliminator", "Final"],
  },
  bbl: {
    label: "BBL",
    banner: "BIG BASH LEAGUE",
    defaultVenue: "mcg",
    stageOptions: ["League", "Final", "Challenger"],
  },
  hundred: {
    label: "The Hundred",
    banner: "THE HUNDRED",
    defaultVenue: "oval",
    stageOptions: ["League", "Eliminator", "Final"],
  },
  sa20: {
    label: "SA20",
    banner: "SA20",
    defaultVenue: "wanderers",
    stageOptions: ["League", "Qualifier", "Final"],
  },
  wbbl: {
    label: "WBBL",
    banner: "WOMENS BIG BASH LEAGUE",
    defaultVenue: "scg",
    stageOptions: ["League", "Final"],
  },
};

export function getFranchiseMeta(competition: FranchiseCompetition) {
  return FRANCHISE_META[competition] ?? FRANCHISE_META.ipl;
}

export function buildSimModeConfig(
  tab: SimTab,
  competition: FranchiseCompetition = "ipl",
  stage?: string,
): SimModeConfig {
  if (tab === "legends") {
    return {
      tab: "legends",
      stage: stage?.trim() || "Legends League",
      scorecardTheme: "legends",
      pdfBanner: "IPL LEGENDS FANTASY LEAGUE",
      competitionLabel: "Legends League",
      defaultVenueId: "chinnaswamy",
      scoringBoost: 8,
    };
  }

  const meta = getFranchiseMeta(competition);
  return {
    tab: "franchise",
    competition,
    stage: stage?.trim() || meta.stageOptions[0],
    scorecardTheme: "ipl",
    pdfBanner: meta.banner,
    competitionLabel: meta.label,
    defaultVenueId: meta.defaultVenue,
    scoringBoost: 0,
  };
}

export function resolveScorecardTheme(
  simMode: SimModeConfig,
): "ipl" | "legends" {
  return simMode.scorecardTheme;
}

export function getPdfBannerForMode(simMode: SimModeConfig): string {
  return simMode.pdfBanner;
}

export const FRANCHISE_COMPETITIONS: { id: FranchiseCompetition; label: string }[] = [
  { id: "ipl", label: "IPL" },
  { id: "bbl", label: "BBL" },
  { id: "hundred", label: "The Hundred" },
  { id: "sa20", label: "SA20" },
];

export const LEGENDS_EXAMPLE_TEAM_A = `SUNRISERS HYDERABAD
1. Brendon McCullum
2. Abhishek Sharma
3. Jos Buttler (WK)
4. Suryakumar Yadav (C)
5. Yusuf Pathan
6. Chris Morris
7. Jofra Archer
8. Kuldeep Yadav
9. Mohammad Shami
10. Josh Hazlewood
11. Varun Chakravarthy

Bowling Quota:
Jofra Archer - 1, 3, 16, 19
Mohammad Shami - 2, 4, 6, 17
Josh Hazlewood - 5, 14, 18, 20
Kuldeep Yadav - 7, 9, 11, 13
Varun Chakravarthy - 8, 10, 12, 15`;

export const LEGENDS_EXAMPLE_TEAM_B = `ROYAL CHALLENGERS BANGALORE
1. Faf du Plessis
2. Travis Head
3. Ruturaj Gaikwad
4. Kumar Sangakkara (WK/C)
5. Paul Valthaty
6. Andre Russell
7. Axar Patel
8. Harbhajan Singh
9. Kagiso Rabada
10. RP Singh
11. Mohit Sharma

Bowling Quota:
RP Singh - 1, 3, 15, 18
Kagiso Rabada - 2, 5, 17, 20
Mohit Sharma - 4, 6, 16, 19
Harbhajan Singh - 7, 9, 11, 13
Axar Patel - 8, 10, 12, 14`;

export const FRANCHISE_EXAMPLE_TEAM_A = `CSK XI
1. Jonny Bairstow
2. Devdutt Padikkal
3. MS Dhoni (C) (WK)
4. Ravindra Jadeja
5. Shivam Dube
6. Deepak Chahar
7. Maheesh Theekshana
8. Mukesh Kumar
9. Matheesha Pathirana
10. Rachin Ravindra
11. Shaik Rasheed

Impact: Mitchell Starc (Bowling only)

Bowling Quota:
Deepak Chahar - 1, 3, 5
Mitchell Starc - 2, 16, 18, 20
Maheesh Theekshana - 4, 8, 12
Matheesha Pathirana - 6, 10, 14, 17
Mukesh Kumar - 7, 11, 15, 19
Ravindra Jadeja - 9, 13`;

export const FRANCHISE_EXAMPLE_TEAM_B = `DELHI CAPITALS
1. Jake Fraser-McGurk
2. Abishek Porel (WK)
3. KL Rahul (C)
4. Tristan Stubbs
5. Axar Patel
6. Mitchell Starc
7. T Natarajan
8. Mukesh Kumar
9. Kuldeep Yadav
10. Ashutosh Sharma
11. Vipraj Nigam

Impact: Sameer Rizvi (Batting only)

Bowling Quota:
Mitchell Starc - 1, 3, 18, 20
Axar Patel - 2, 6, 10, 14
T Natarajan - 4, 8, 12, 16
Kuldeep Yadav - 5, 9, 13, 17
Mukesh Kumar - 7, 11, 15, 19`;
