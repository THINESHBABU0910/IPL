import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { parseBothTeams } from "@/lib/ai/teamInputParser";
import { getVenueById } from "@/data/iplVenues";
import { simulateMatchJson, extractJsonFromResponse, isLlmSimulationDisabled } from "@/lib/ai/client";
import { buildUserPrompt } from "@/lib/ai/systemPrompt";
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
import { normalizeMatchResponse, parseJsonLoose, type NormalizeContext } from "@/lib/ai/matchResponseNormalizer";
import { enrichMatchFromSquads } from "@/lib/ai/matchSquadEnricher";
import { simulateMatchLocally } from "@/lib/ai/localMatchSimulator";
import { polishMatchResult } from "@/lib/ai/matchPolish";
import { generateMatchScorecardPdf, buildPdfFileName } from "@/lib/ai/pdf/matchScorecardPdf";
import type { MatchResult, ParsedTeam } from "@/lib/ai/matchSchema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
/** Allow up to 60s on platforms that honor this (local sim finishes in ~1s) */
export const maxDuration = 60;

const MAX_LLM_ATTEMPTS = 2;

function buildFinalMatch(
  skeleton: MatchResult,
  ctx: NormalizeContext,
  matchOvers: number,
  teamA: ParsedTeam,
  teamB: ParsedTeam,
): MatchResult {
  let match = enrichMatchFromSquads(skeleton, {
    teamA: ctx.teamA,
    teamB: ctx.teamB,
    venue: ctx.venue,
    matchOvers,
  });
  match = repairMatchStats(match, matchOvers);
  match = polishMatchResult(match, matchOvers);
  return enrichMatchWithBowling(match, teamA, teamB, ctx.venue.pitchType, matchOvers);
}

function runLocalSimulation(ctx: NormalizeContext, matchOvers: number) {
  const skeleton = MatchResultSchema.parse(simulateMatchLocally(ctx));
  return buildFinalMatch(skeleton, ctx, matchOvers, ctx.teamA, ctx.teamB);
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
    };

    const { teamAText, teamBText, teamAName, teamBName, venueId, stage } = body;

    if (!teamAText?.trim() || !teamBText?.trim()) {
      return NextResponse.json(
        { success: false, error: "Both team sheets are required" },
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

    const parsed = parseBothTeams(
      teamAText,
      teamBText,
      teamAName,
      teamBName,
      matchOvers,
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

    const normalizeCtx = {
      teamA: parsed.teamA,
      teamB: parsed.teamB,
      venue,
      matchOvers,
      stage: stage?.trim() || "League",
    };

    let matchResult = null;
    let simulationMode: "local" | "llm" = "local";
    let llmFallbackReason: string | undefined;

    const payload = {
        matchConfig: {
          overs: matchOvers,
          venueId: venue.id,
          stage: normalizeCtx.stage,
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

    if (!isLlmSimulationDisabled()) {
      let validationErrors: string[] | undefined;

      for (let attempt = 0; attempt < MAX_LLM_ATTEMPTS; attempt++) {
        try {
          const userPrompt = buildUserPrompt(payload, attempt > 0 ? validationErrors : undefined);
          const { content } = await simulateMatchJson(userPrompt);
          const jsonStr = extractJsonFromResponse(content);
          const raw = parseJsonLoose(jsonStr);
          const normalized = normalizeMatchResponse(raw, normalizeCtx);
          const llmSkeleton = MatchResultSchema.parse(normalized);
          const built = buildFinalMatch(
            llmSkeleton,
            normalizeCtx,
            matchOvers,
            parsed.teamA,
            parsed.teamB,
          );

          const statErrors = validateMatchResult(
            built,
            matchOvers,
            parsed.teamA,
            parsed.teamB,
          );
          const quotaErrors = validateBowlingFromQuota(
            built,
            parsed.teamA,
            parsed.teamB,
            matchOvers,
          );
          const bowlingStatErrors = validateBowlingStats(
            built,
            parsed.teamA,
            parsed.teamB,
            matchOvers,
          );
          const dismissalErrors = validateDismissalsAgainstBowling(
            built,
            parsed.teamA,
            parsed.teamB,
          );
          validationErrors = [...statErrors, ...quotaErrors, ...bowlingStatErrors, ...dismissalErrors];

          if (validationErrors.length === 0) {
            matchResult = built;
            simulationMode = "llm";
            break;
          }

          if (attempt === MAX_LLM_ATTEMPTS - 1) {
            llmFallbackReason = `Validation failed: ${validationErrors.slice(0, 3).join("; ")}`;
          }
        } catch (llmErr) {
          console.warn("[ai/simulate] LLM attempt failed, falling back to local:", llmErr);
          llmFallbackReason =
            llmErr instanceof Error ? llmErr.message.slice(0, 500) : "LLM request failed";
          break;
        }
      }
    } else {
      llmFallbackReason = "LLM disabled via AI_SIM_USE_LLM=false";
    }

    if (!matchResult) {
      matchResult = runLocalSimulation(normalizeCtx, matchOvers);
      simulationMode = "local";
    }

    matchResult = ensureMatchReadyForPdf(
      matchResult,
      parsed.teamA,
      parsed.teamB,
      venue.pitchType,
      matchOvers,
    );

    const pdfBuffer = await generateMatchScorecardPdf(matchResult);
    const simulationId = randomUUID();

    return NextResponse.json({
      success: true,
      match: matchResult,
      pdfBase64: pdfBuffer.toString("base64"),
      pdfFileName: buildPdfFileName(matchResult),
      simulationId,
      simulationMode,
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
