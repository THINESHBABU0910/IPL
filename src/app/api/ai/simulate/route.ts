import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { parseBothTeams } from "@/lib/ai/teamInputParser";
import { getVenueById } from "@/data/iplVenues";
import { simulateMatchJson, extractJsonFromResponse } from "@/lib/ai/sifyClient";
import { buildUserPrompt } from "@/lib/ai/systemPrompt";
import { MatchResultSchema } from "@/lib/ai/matchSchema";
import {
  validateMatchResult,
  validateBowlingFromQuota,
  enrichMatchWithBowling,
  repairMatchStats,
} from "@/lib/ai/matchValidator";
import { normalizeMatchResponse, parseJsonLoose } from "@/lib/ai/matchResponseNormalizer";
import { enrichMatchFromSquads } from "@/lib/ai/matchSquadEnricher";
import { generateMatchScorecardPdf, buildPdfFileName } from "@/lib/ai/pdf/matchScorecardPdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;

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

    const payload = {
      matchConfig: {
        overs: matchOvers,
        venueId: venue.id,
        stage: stage?.trim() || "League",
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

    const normalizeCtx = {
      teamA: parsed.teamA,
      teamB: parsed.teamB,
      venue,
      matchOvers,
      stage: stage?.trim() || "League",
    };

    let validationErrors: string[] | undefined;
    let matchResult = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const userPrompt = buildUserPrompt(
        payload,
        attempt > 0 ? validationErrors : undefined,
      );
      const { content } = await simulateMatchJson(userPrompt);
      const jsonStr = extractJsonFromResponse(content);

      let parsedMatch;
      try {
        const raw = parseJsonLoose(jsonStr);
        const normalized = normalizeMatchResponse(raw, normalizeCtx);
        parsedMatch = MatchResultSchema.parse(normalized);
        parsedMatch = enrichMatchFromSquads(parsedMatch, normalizeCtx);
        parsedMatch = repairMatchStats(parsedMatch, matchOvers);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid JSON";
        validationErrors = [`JSON schema error: ${msg.slice(0, 800)}`];
        continue;
      }

      const statErrors = validateMatchResult(
        parsedMatch,
        matchOvers,
        parsed.teamA,
        parsed.teamB,
      );
      const quotaErrors = validateBowlingFromQuota(
        parsedMatch,
        parsed.teamA,
        parsed.teamB,
        matchOvers,
      );
      validationErrors = [...statErrors, ...quotaErrors];

      if (validationErrors.length === 0) {
        matchResult = enrichMatchWithBowling(
          parsedMatch,
          parsed.teamA,
          parsed.teamB,
        );
        break;
      }
    }

    if (!matchResult) {
      return NextResponse.json(
        {
          success: false,
          error: "Match validation failed after maximum retries",
          details: validationErrors,
        },
        { status: 422 },
      );
    }

    const pdfBuffer = await generateMatchScorecardPdf(matchResult);
    const simulationId = randomUUID();

    return NextResponse.json({
      success: true,
      match: matchResult,
      pdfBase64: pdfBuffer.toString("base64"),
      pdfFileName: buildPdfFileName(matchResult),
      simulationId,
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
