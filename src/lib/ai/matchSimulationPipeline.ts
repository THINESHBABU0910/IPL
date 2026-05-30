import {
  callChatCompletion,
  extractJsonFromResponse,
  type ChatMessage,
} from "./client";
import {
  getBlueprintSystemPrompt,
  getNarrativeSystemPrompt,
  buildUserPrompt,
} from "./systemPrompt";
import {
  MatchBlueprintSchema,
  MatchSummarySchema,
  type MatchBlueprint,
  type MatchResult,
  type MatchSummary,
} from "./matchSchema";
import type { NormalizeContext } from "./matchResponseNormalizer";
import { parseJsonLoose } from "./matchResponseNormalizer";

export interface PipelineContext {
  normalizeCtx: NormalizeContext;
  payload: unknown;
  variationSeed: string;
}

export interface PipelineLlmOutput {
  blueprint?: MatchBlueprint;
  narrative?: MatchSummary;
  conversationId?: string;
  usedLlm: boolean;
}

function parseBlueprintJson(text: string): MatchBlueprint | undefined {
  try {
    const raw = parseJsonLoose(extractJsonFromResponse(text));
    const parsed = MatchBlueprintSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

function parseNarrativeJson(text: string): MatchSummary | undefined {
  try {
    const raw = parseJsonLoose(extractJsonFromResponse(text));
    const parsed = MatchSummarySchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchMatchBlueprint(ctx: PipelineContext): Promise<{
  blueprint?: MatchBlueprint;
  conversationId?: string;
  assistantContent?: string;
  usedLlm: boolean;
}> {
  const { normalizeCtx, payload, variationSeed } = ctx;
  const simTab = normalizeCtx.simMode?.tab ?? "franchise";
  const avoid = normalizeCtx.avoidMargins?.length
    ? `\nAvoid repeating these recent margins: ${normalizeCtx.avoidMargins.join("; ")}`
    : "";

  const messages: ChatMessage[] = [
    { role: "system", content: getBlueprintSystemPrompt(simTab) },
    {
      role: "user",
      content: `${buildUserPrompt(payload, undefined, simTab)}\n\nVariation seed: ${variationSeed}${avoid}\nReturn blueprint JSON only.`,
    },
  ];

  try {
    const step1 = await callChatCompletion({
      messages,
      temperature: 0.92,
      maxTokens: 2048,
    });
    return {
      blueprint: parseBlueprintJson(step1.content),
      conversationId: step1.conversationId,
      assistantContent: step1.content,
      usedLlm: true,
    };
  } catch (err) {
    console.warn("[matchSimulationPipeline] blueprint failed:", err);
    return { usedLlm: false };
  }
}

export async function fetchMatchNarrative(
  ctx: PipelineContext,
  match: MatchResult,
  prior?: { conversationId?: string; assistantContent?: string },
): Promise<{ narrative?: MatchSummary; usedLlm: boolean }> {
  const { normalizeCtx, payload, variationSeed } = ctx;
  const simTab = normalizeCtx.simMode?.tab ?? "franchise";
  const baseUser = `${buildUserPrompt(payload, undefined, simTab)}\n\nVariation seed: ${variationSeed}`;

  const messages: ChatMessage[] = prior?.assistantContent
    ? [
        { role: "system", content: getNarrativeSystemPrompt(simTab) },
        { role: "user", content: baseUser },
        { role: "assistant", content: prior.assistantContent },
        {
          role: "user",
          content: `Final scorecard (use ONLY these facts):\n${JSON.stringify({
            result: match.result,
            innings: match.innings.map((inn) => ({
              team: inn.teamName,
              total: `${inn.totalRuns}/${inn.totalWickets}`,
              overs: inn.overs,
              topScorer: [...inn.batting].sort((a, b) => b.runs - a.runs)[0],
            })),
            playerOfTheMatch: match.playerOfTheMatch,
            partnerships: match.partnerships,
          })}\nReturn matchSummary JSON only. Be vivid and unique.`,
        },
      ]
    : [
        { role: "system", content: getNarrativeSystemPrompt(simTab) },
        {
          role: "user",
          content: `${baseUser}\n\nMatch result:\n${JSON.stringify(match.result)}\nReturn matchSummary JSON.`,
        },
      ];

  try {
    const step2 = await callChatCompletion({
      messages,
      conversationId: prior?.conversationId,
      temperature: 0.88,
      maxTokens: 3072,
    });
    return { narrative: parseNarrativeJson(step2.content), usedLlm: true };
  } catch (err) {
    console.warn("[matchSimulationPipeline] narrative failed:", err);
    return { usedLlm: false };
  }
}

/** @deprecated Use fetchMatchBlueprint + fetchMatchNarrative */
export async function runMatchSimulationPipeline(
  ctx: PipelineContext,
): Promise<PipelineLlmOutput> {
  const bp = await fetchMatchBlueprint(ctx);
  return { blueprint: bp.blueprint, conversationId: bp.conversationId, usedLlm: bp.usedLlm };
}

export function mergeNarrativeIntoMatch(
  match: MatchResult,
  narrative?: MatchSummary,
  blueprint?: MatchBlueprint,
): MatchResult {
  const merged = { ...match };

  if (blueprint?.attendance || blueprint?.weather || blueprint?.tossReasoning) {
    merged.matchInfo = {
      ...merged.matchInfo,
      attendance: blueprint.attendance ?? merged.matchInfo?.attendance,
      weather: blueprint.weather ?? merged.matchInfo?.weather,
      tossReasoning: blueprint.tossReasoning ?? merged.matchInfo?.tossReasoning,
    };
    if (blueprint.tossReasoning && merged.toss) {
      merged.toss = { ...merged.toss, decisionText: blueprint.tossReasoning };
    }
  }

  if (narrative) {
    merged.matchSummary = narrative;
    if (narrative.playerOfTheMatchBlurb) {
      merged.playerOfTheMatch = narrative.playerOfTheMatchBlurb.split(".")[0] || merged.playerOfTheMatch;
    }
  }

  return merged;
}
