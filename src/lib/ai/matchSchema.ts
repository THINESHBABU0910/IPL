import { z } from "zod";

export const BattingRowSchema = z.object({
  name: z.string(),
  status: z.string(),
  runs: z.number().int().min(0),
  balls: z.number().int().min(0),
  fours: z.number().int().min(0),
  sixes: z.number().int().min(0),
  strikeRate: z.number().min(0),
});

export const BowlingRowSchema = z.object({
  name: z.string(),
  overs: z.number().min(0),
  maidens: z.number().int().min(0),
  runs: z.number().int().min(0),
  wickets: z.number().int().min(0),
  economy: z.number().min(0),
  isImpact: z.boolean().optional(),
  /** Comma-separated over numbers from bowling quota, e.g. "1, 3, 16, 19" */
  oversAssigned: z.string().optional(),
  /** Set when chase ends before scheduled final over */
  endedEarly: z.boolean().optional(),
});

export const ExtrasSchema = z.object({
  total: z.number().int().min(0),
  wides: z.number().int().min(0),
  noBalls: z.number().int().min(0),
  byes: z.number().int().min(0),
  legByes: z.number().int().min(0),
});

export const InningsSchema = z.object({
  teamName: z.string(),
  batting: z.array(BattingRowSchema),
  bowling: z.array(BowlingRowSchema).optional(),
  extras: ExtrasSchema,
  totalRuns: z.number().int().min(0),
  totalWickets: z.number().int().min(0).max(10),
  overs: z.number().min(0),
  runRate: z.number().min(0),
  target: z.number().int().min(0).optional(),
  didNotBat: z.array(z.string()).optional(),
});

export const PartnershipSchema = z.object({
  wicket: z.number().int().min(1),
  runs: z.number().int().min(0),
  balls: z.number().int().min(0),
  batters: z.string(),
});

export const FallOfWicketSchema = z.object({
  score: z.string(),
  over: z.string(),
  batter: z.string(),
  /** e.g. "106 (53)" — runs (balls) for that partnership */
  partnership: z.string().optional(),
});

export const ImpactActivationSchema = z.object({
  teamName: z.string(),
  playerIn: z.string(),
  playerOut: z.string().optional(),
  reason: z.string(),
  activatedAt: z.string(),
});

export const SquadPlayerSnapshotSchema = z.object({
  order: z.number().int().min(1),
  name: z.string(),
  overseas: z.boolean().optional(),
  isCaptain: z.boolean().optional(),
  isWicketkeeper: z.boolean().optional(),
});

export const SquadSnapshotSchema = z.object({
  teamName: z.string(),
  players: z.array(SquadPlayerSnapshotSchema),
});

export const MatchInfoSchema = z.object({
  attendance: z.string().optional(),
  weather: z.string().optional(),
  tossReasoning: z.string().optional(),
});

export const MatchSummarySchema = z.object({
  playerOfTheMatchBlurb: z.string().optional(),
  turningPoint: z.string().optional(),
  winningFactors: z.array(z.string()).optional(),
  highestPartnership: z.string().optional(),
  bestBowling: z.string().optional(),
  bestBatting: z.string().optional(),
  captaincyImpact: z.string().optional(),
});

/** LLM blueprint — small JSON to steer simulation variety */
export const MatchBlueprintSchema = z.object({
  tossWinner: z.string().optional(),
  tossDecision: z.enum(["bat", "bowl"]).optional(),
  tossReasoning: z.string().optional(),
  attendance: z.string().optional(),
  weather: z.string().optional(),
  winner: z.string().optional(),
  marginType: z.enum(["wickets", "runs", "super_over", "tie"]).optional(),
  marginDetail: z.string().optional(),
  inn1RunsMin: z.number().int().optional(),
  inn1RunsMax: z.number().int().optional(),
  chaseProfile: z.enum(["comfortable", "tight", "nail_biter", "collapse"]).optional(),
  heroBatter: z.string().optional(),
  heroBowler: z.string().optional(),
  standoutPlayers: z.array(z.string()).optional(),
});

export type MatchBlueprint = z.infer<typeof MatchBlueprintSchema>;
export type MatchSummary = z.infer<typeof MatchSummarySchema>;
export type SquadSnapshot = z.infer<typeof SquadSnapshotSchema>;

export const SuperOverSchema = z.object({
  battingTeam: z.string(),
  bowlingTeam: z.string(),
  batting: z.array(BattingRowSchema),
  bowling: z.array(BowlingRowSchema),
  totalRuns: z.number().int().min(0),
  totalWickets: z.number().int().min(0),
  result: z.string(),
});

export const MatchResultSchema = z.object({
  matchTitle: z.string(),
  stage: z.string().optional(),
  scorecardTheme: z.enum(["ipl", "legends"]).optional(),
  /** PDF header banner override (IPL, BBL, Legends, etc.) */
  leagueBanner: z.string().optional(),
  venue: z.string(),
  venueCity: z.string().optional(),
  pitchType: z.string(),
  pitchDescription: z.string(),
  dewCondition: z.string().optional(),
  matchInfo: MatchInfoSchema.optional(),
  squads: z.tuple([SquadSnapshotSchema, SquadSnapshotSchema]).optional(),
  toss: z.object({
    winner: z.string(),
    decision: z.enum(["bat", "bowl"]),
    decisionText: z.string(),
  }),
  impactPlayers: z.array(ImpactActivationSchema),
  innings: z.tuple([InningsSchema, InningsSchema]),
  partnerships: z.object({
    firstInnings: z.array(PartnershipSchema),
    secondInnings: z.array(PartnershipSchema),
  }),
  fallOfWickets: z.object({
    firstInnings: z.array(FallOfWicketSchema),
    secondInnings: z.array(FallOfWicketSchema),
  }),
  result: z.object({
    winner: z.string(),
    margin: z.string(),
    summary: z.string(),
    ballsRemaining: z.string().optional(),
  }),
  playerOfTheMatch: z.union([z.string(), z.array(z.string())]),
  matchSummary: MatchSummarySchema.optional(),
  chaseFinishNote: z.string().optional(),
  superOver: SuperOverSchema.optional(),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

export const ParsedPlayerSchema = z.object({
  name: z.string(),
  overseas: z.boolean().default(false),
  isCaptain: z.boolean().default(false),
  isWicketkeeper: z.boolean().default(false),
  isNew: z.boolean().default(false),
  role: z.enum(["batter", "bowler", "allrounder", "wicketkeeper", "unknown"]).default("unknown"),
  notes: z.string().default("full match"),
});

export const ParsedImpactSchema = z.object({
  name: z.string(),
  overseas: z.boolean().default(false),
  isNew: z.boolean().default(false),
  notes: z.string().default(""),
});

export const BowlingQuotaSchema = z.object({
  name: z.string(),
  overs: z.array(z.number().int().min(1)),
});

export const ParsedTeamSchema = z.object({
  name: z.string(),
  playingXI: z.array(ParsedPlayerSchema),
  captain: z.string().optional(),
  wicketkeeper: z.string().optional(),
  impactPlayer: ParsedImpactSchema.optional(),
  bowlingQuota: z.array(BowlingQuotaSchema),
});

export const MatchRequestSchema = z.object({
  teamA: ParsedTeamSchema,
  teamB: ParsedTeamSchema,
  matchConfig: z.object({
    overs: z.number().int().min(1).max(20),
    venueId: z.string(),
    stage: z.string().optional(),
  }),
});

export type MatchRequest = z.infer<typeof MatchRequestSchema>;
export type ParsedTeam = z.infer<typeof ParsedTeamSchema>;
