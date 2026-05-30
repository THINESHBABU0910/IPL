import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { parseBothTeams, validateTeamNameInputs } from "@/lib/ai/teamInputParser";
import { getVenueById } from "@/data/iplVenues";
import { isLlmSimulationDisabled } from "@/lib/ai/client";
import { MatchResultSchema } from "@/lib/ai/matchSchema";
import {
  validateMatchResult,
  validateBowlingFromQuota,
  validateBowlingStats,
  validateDismissalsAgainstBowling,
  enrichMatchWithBowling,
  repairMatchStats,
  ensureMatchReadyForPdf,
} from "@/lib/ai/matchValidator";
import { validateFallOfWickets } from "@/lib/ai/dismissalSync";
import type { NormalizeContext } from "@/lib/ai/matchResponseNormalizer";
import { enrichMatchFromSquads } from "@/lib/ai/matchSquadEnricher";
import { simulateMatchLocally } from "@/lib/ai/localMatchSimulator";
import { polishMatchResult } from "@/lib/ai/matchPolish";
import {
  fetchMatchBlueprint,
  fetchMatchNarrative,
  mergeNarrativeIntoMatch,
} from "@/lib/ai/matchSimulationPipeline";
import { buildFallbackMatchSummary } from "@/lib/ai/matchNarrativeFallback";
import { generateMatchScorecardPdf, buildPdfFileName } from "@/lib/ai/pdf/matchScorecardPdf";
import type { MatchBlueprint, MatchResult, MatchSummary, ParsedTeam } from "@/lib/ai/matchSchema";
import {
  buildSimModeConfig,
  type FranchiseCompetition,
  type SimTab,
} from "@/lib/ai/simModes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

function buildFinalMatch(
  skeleton: MatchResult,
  ctx: NormalizeContext,
  matchOvers: number,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
  blueprint?: MatchBlueprint,
): MatchResult {
  let match = enrichMatchFromSquads(skeleton, {
    teamA: ctx.teamA,
    teamB: ctx.teamB,
    venue: ctx.venue,
    matchOvers,
    stage: ctx.stage,
    variationSeed: ctx.variationSeed,
    blueprint,
    simMode: ctx.simMode,
  });
  match = repairMatchStats(match, matchOvers);
  match = polishMatchResult(match, matchOvers);
  return enrichMatchWithBowling(match, teamA, teamB, ctx.venue.pitchType, matchOvers, ctx.venue.boundarySize);
}

function runSimulation(
  ctx: NormalizeContext,
  matchOvers: number,
  blueprint?: MatchBlueprint,
): MatchResult {
  const skeleton = MatchResultSchema.parse(simulateMatchLocally(ctx));
  return buildFinalMatch(skeleton, ctx, matchOvers, ctx.teamA, ctx.teamB, blueprint);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      teamAText?: string;
      teamBText?: string;
      teamAName?: string;
      teamBName?: string;
      overs?: number;
      venueId?: string;
      stage?: string;
      avoidMargins?: string[];
      simTab?: SimTab;
      competition?: FranchiseCompetition;
    };

    const { teamAText, teamBText, teamAName, teamBName, venueId, stage } = body;
    const simTab: SimTab = body.simTab === "legends" ? "legends" : "franchise";
    const competition: FranchiseCompetition =
      body.competition === "bbl" ||
      body.competition === "hundred" ||
      body.competition === "sa20" ||
      body.competition === "wbbl"
        ? body.competition
        : "ipl";
    const simMode = buildSimModeConfig(simTab, competition, stage);

    if (!teamAText?.trim() || !teamBText?.trim()) {
      return NextResponse.json(
        { success: false, error: "Both team sheets are required" },
        { status: 400 },
      );
    }

    const nameErrors = validateTeamNameInputs(teamAText, teamBText, teamAName, teamBName);
    if (nameErrors.length) {
      return NextResponse.json(
        { success: false, error: "Team names required", details: nameErrors },
        { status: 400 },
      );
    }

    const matchOvers = Math.min(20, Math.max(1, Number(body.overs) || 20));
    const venue = getVenueById(venueId || "");
    if (!venue) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing venue" },
        { status: 400 },
      );
    }

    const variationSeed = randomUUID();

    const parsed = parseBothTeams(
      teamAText,
      teamBText,
      teamAName,
      teamBName,
      matchOvers,
      variationSeed,
    );

    if (parsed.errors.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Team sheet validation failed",
          details: parsed.errors,
          warnings: parsed.warnings,
        },
        { status: 400 },
      );
    }
    const normalizeCtx: NormalizeContext = {
      teamA: parsed.teamA,
      teamB: parsed.teamB,
      venue,
      matchOvers,
      stage: simMode.stage,
      variationSeed,
      avoidMargins: Array.isArray(body.avoidMargins) ? body.avoidMargins.slice(0, 5) : undefined,
      simMode,
    };

    const payload = {
      matchConfig: {
        overs: matchOvers,
        venueId: venue.id,
        stage: normalizeCtx.stage,
        simTab: simMode.tab,
        competition: simMode.competition,
        competitionLabel: simMode.competitionLabel,
      },
      teamA: parsed.teamA,
      teamB: parsed.teamB,
      venue: {
        name: venue.name,
        city: venue.city,
        pitchType: venue.pitchType,
        pitchDescription: venue.pitchDescription,
        boundarySize: venue.boundarySize,
        typicalDew: venue.typicalDew,
        notes: venue.notes,
      },
    };

    let simulationMode: "local" | "llm" = "local";
    let llmFallbackReason: string | undefined;
    let blueprint: MatchBlueprint | undefined;
    let pipelineNarrative: MatchSummary | undefined;
    let blueprintAssistant: string | undefined;
    let conversationId: string | undefined;
    const pipelineCtx = { normalizeCtx, payload, variationSeed };

    if (!isLlmSimulationDisabled()) {
      const bp = await fetchMatchBlueprint(pipelineCtx);
      blueprint = bp.blueprint;
      blueprintAssistant = bp.assistantContent;
      conversationId = bp.conversationId;
      if (bp.usedLlm) simulationMode = "llm";
      else llmFallbackReason = "LLM blueprint unavailable — stats from local engine";
    } else {
      llmFallbackReason = "LLM disabled via AI_SIM_USE_LLM=false";
    }

    let matchResult = runSimulation(normalizeCtx, matchOvers, blueprint);

    const statErrors = [
      ...validateMatchResult(matchResult, matchOvers, parsed.teamA, parsed.teamB),
      ...validateBowlingFromQuota(matchResult, parsed.teamA, parsed.teamB, matchOvers),
      ...validateBowlingStats(matchResult, parsed.teamA, parsed.teamB, matchOvers),
      ...validateDismissalsAgainstBowling(matchResult, parsed.teamA, parsed.teamB),
      ...validateFallOfWickets(matchResult),
    ];
    if (statErrors.length) {
      console.warn("[ai/simulate] validation warnings:", statErrors.slice(0, 5));
    }

    matchResult = ensureMatchReadyForPdf(
      matchResult,
      parsed.teamA,
      parsed.teamB,
      venue.pitchType,
      matchOvers,
      venue.boundarySize,
    );

    if (!isLlmSimulationDisabled()) {
      const narr = await fetchMatchNarrative(pipelineCtx, matchResult, {
        conversationId,
        assistantContent: blueprintAssistant,
      });
      pipelineNarrative = narr.narrative;
      if (narr.usedLlm) simulationMode = "llm";
    }
    const narrative = pipelineNarrative ?? buildFallbackMatchSummary(matchResult);
    matchResult = mergeNarrativeIntoMatch(matchResult, narrative, blueprint);

    const pdfBuffer = await generateMatchScorecardPdf(matchResult, {
      teamA: parsed.teamA,
      teamB: parsed.teamB,
    });
    const simulationId = randomUUID();

    return NextResponse.json({
      success: true,
      match: matchResult,
      pdfBase64: pdfBuffer.toString("base64"),
      pdfFileName: buildPdfFileName(matchResult),
      simulationId,
      simulationMode,
      variationSeed,
      ...(simulationMode === "local" && llmFallbackReason
        ? { llmFallbackReason }
        : {}),
    });
  } catch (err) {
    console.error("[ai/simulate]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Simulation failed",
      },
      { status: 500 },
    );
  }
}
