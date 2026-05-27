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
});

export const ImpactActivationSchema = z.object({
  teamName: z.string(),
  playerIn: z.string(),
  playerOut: z.string().optional(),
  reason: z.string(),
  activatedAt: z.string(),
});

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
  venue: z.string(),
  venueCity: z.string().optional(),
  pitchType: z.string(),
  pitchDescription: z.string(),
  dewCondition: z.string().optional(),
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
  }),
  playerOfTheMatch: z.union([z.string(), z.array(z.string())]),
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
