import { MATCH_SIMULATION_SYSTEM_PROMPT } from "./systemPrompt";

/** Hardcoded Sify AI Gateway credentials (as requested) */
const SIFY_CONFIG = {
  baseUrl: "https://aigateway-uat.sifymdp.digital/api/v1",
  apiKey: "sk-gw-6_uV9fOAN1UHElhEhFegjtQtdEdxVfi0Xxy6CkTxzuE",
  model: "meta-llama/Llama-3.1-8B-Instruct",
} as const;

/** Llama 3.2 3B context window — max_tokens must leave room for the prompt */
const MODEL_CONTEXT_LIMIT = 131072;
const TOKEN_SAFETY_BUFFER = 2048;

function estimateInputTokens(messages: ChatMessage[]): number {
  const chars = messages.reduce((sum, m) => sum + m.content.length, 0);
  // Over-estimate input so max_tokens never exceeds context − prompt
  return Math.ceil(chars / 3);
}

/** Use as much of the context window as possible for completion output */
function computeMaxCompletionTokens(messages: ChatMessage[]): number {
  const inputEstimate = estimateInputTokens(messages);
  const available = MODEL_CONTEXT_LIMIT - inputEstimate - TOKEN_SAFETY_BUFFER;
  return Math.max(4096, available);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface SifyCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface SifyCompletionResult {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function getConfig() {
  return {
    baseUrl: SIFY_CONFIG.baseUrl.replace(/\/$/, ""),
    apiKey: SIFY_CONFIG.apiKey,
    model: SIFY_CONFIG.model,
  };
}

export async function callSifyChat(options: SifyCompletionOptions): Promise<SifyCompletionResult> {
  const { baseUrl, apiKey, model } = getConfig();
  const maxTokens = options.maxTokens ?? computeMaxCompletionTokens(options.messages);

  const body = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: maxTokens,
    stream: false,
    response_format: { type: "json_object" as const },
  };

  let res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status === 400) {
    const { response_format: _removed, ...withoutJsonMode } = body;
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(withoutJsonMode),
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Gateway error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: SifyCompletionResult["usage"];
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from AI Gateway");

  return { content, usage: data.usage };
}

export async function simulateMatchJson(
  userPrompt: string,
  validationErrors?: string[],
): Promise<SifyCompletionResult> {
  const messages: ChatMessage[] = [
    { role: "system", content: MATCH_SIMULATION_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  if (validationErrors?.length) {
    messages.push({
      role: "user",
      content: `Fix validation errors and return corrected JSON only:\n${validationErrors.join("\n")}`,
    });
  }

  return callSifyChat({ messages, temperature: 0.75 });
}

/** Extract JSON object from LLM response (handles accidental markdown fences) */
export function extractJsonFromResponse(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return trimmed;
}
