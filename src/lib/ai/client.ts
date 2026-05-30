import { MATCH_SIMULATION_SYSTEM_PROMPT } from "./systemPrompt";

/** Llama context — keep completion budget small so gateway responds before nginx timeout */
const MODEL_CONTEXT_LIMIT = 131072;
const TOKEN_SAFETY_BUFFER = 2048;
/** Full scorecard JSON fits in ~4k tokens; huge values cause gateway 504 timeouts */
const MAX_COMPLETION_TOKENS = 8192;
const REQUEST_TIMEOUT_MS = 25_000;

/** LLM is tried first by default; set AI_SIM_USE_LLM=false to skip straight to local sim */
export function isLlmSimulationDisabled(): boolean {
  const v = process.env.AI_SIM_USE_LLM?.toLowerCase();
  return v === "false" || v === "0" || v === "no";
}

function estimateInputTokens(messages: ChatMessage[]): number {
  const chars = messages.reduce((sum, m) => sum + m.content.length, 0);
  // Over-estimate input so max_tokens never exceeds context − prompt
  return Math.ceil(chars / 3);
}

/** Use as much of the context window as possible for completion output */
function computeMaxCompletionTokens(messages: ChatMessage[]): number {
  const inputEstimate = estimateInputTokens(messages);
  const available = MODEL_CONTEXT_LIMIT - inputEstimate - TOKEN_SAFETY_BUFFER;
  return Math.min(MAX_COMPLETION_TOKENS, Math.max(2048, available));
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Gateway conversation thread — continue same chat on next call when supported */
  conversationId?: string;
}

export interface ChatCompletionResult {
  content: string;
  conversationId?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function getConfig() {
  const baseUrl = process.env.AI_GATEWAY_BASE_URL?.trim();
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  const model = process.env.AI_GATEWAY_MODEL?.trim();

  if (!baseUrl || !apiKey || !model) {
    const missing = [
      !baseUrl && "AI_GATEWAY_BASE_URL",
      !apiKey && "AI_GATEWAY_API_KEY",
      !model && "AI_GATEWAY_MODEL",
    ].filter(Boolean);
    throw new Error(`Missing AI Gateway env vars: ${missing.join(", ")}`);
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    model,
  };
}

export async function callChatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const { baseUrl, apiKey, model } = getConfig();
  const maxTokens = options.maxTokens ?? computeMaxCompletionTokens(options.messages);

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: maxTokens,
    stream: false,
    response_format: { type: "json_object" as const },
  };
  if (options.conversationId) {
    body.conversation_id = options.conversationId;
  }

  let res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI Gateway error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: ChatCompletionResult["usage"];
    conversation_id?: string;
    id?: string;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from AI Gateway");

  const conversationId =
    data.conversation_id ?? (typeof data.id === "string" ? data.id : undefined) ?? options.conversationId;

  return { content, conversationId, usage: data.usage };
}

export async function simulateMatchJson(
  userPrompt: string,
  validationErrors?: string[],
): Promise<ChatCompletionResult> {
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

  return callChatCompletion({ messages, temperature: 0.75 });
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
