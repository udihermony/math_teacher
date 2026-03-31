import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

// Server-only — never import this on the client
if (typeof window !== "undefined") {
  throw new Error("claude-client.ts must only be used on the server");
}

// ── Default (platform) Anthropic client ──────────────────

let defaultClient: Anthropic | null = null;

function getDefaultClient(): Anthropic {
  if (!defaultClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    defaultClient = new Anthropic({ apiKey });
  }
  return defaultClient;
}

// ── Per-user provider resolution ─────────────────────────

interface UserAIConfig {
  provider: "ANTHROPIC" | "OPENAI" | "GEMINI" | "LOCAL";
  apiKey: string; // for LOCAL, this is the base URL
}

async function getUserAIConfig(userId: string): Promise<UserAIConfig | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiProvider: true, aiApiKey: true },
  });

  if (!user?.aiProvider || !user?.aiApiKey) return null;

  try {
    const decryptedKey = decrypt(user.aiApiKey);
    return { provider: user.aiProvider, apiKey: decryptedKey };
  } catch {
    return null;
  }
}

// ── Provider error detection & fallback ─────────────────

export class AIProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIProviderError";
  }
}

function isProviderError(err: unknown): boolean {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status: number }).status;
    if (status === 401 || status === 403 || status === 429) return true;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("api key") ||
      msg.includes("authentication") ||
      msg.includes("unauthorized") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("billing") ||
      msg.includes("insufficient") ||
      msg.includes("exceeded")
    ) return true;
  }
  return false;
}

function hasDefaultKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function throwProviderError(config: UserAIConfig | null, defaultFailed: boolean): never {
  if (config && defaultFailed) {
    throw new AIProviderError(
      `Your ${config.provider} API key and the platform AI service are both unavailable. Please check your API key in Settings or try again later.`
    );
  }
  if (config && !hasDefaultKey()) {
    throw new AIProviderError(
      `Your ${config.provider} API key is invalid, expired, or over quota. Please update it in Settings.`
    );
  }
  if (!config && defaultFailed) {
    throw new AIProviderError(
      "AI service is temporarily unavailable. Please try again later or configure your own API key in Settings."
    );
  }
  throw new AIProviderError(
    "No AI provider available. Please configure an API key in Settings."
  );
}

// ── Rate limiter ─────────────────────────────────────────

const rateLimiter = {
  requests: new Map<string, number[]>(),
  maxRequests: 20,
  windowMs: 60_000,

  check(userId: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(userId) || [];
    const recent = timestamps.filter((t) => now - t < this.windowMs);
    this.requests.set(userId, recent);
    return recent.length < this.maxRequests;
  },

  record(userId: string): void {
    const timestamps = this.requests.get(userId) || [];
    timestamps.push(Date.now());
    this.requests.set(userId, timestamps);
  },
};

// ── Shared types ─────────────────────────────────────────

export interface AskOptions {
  userId: string;
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number };
}

// ── OpenAI adapter ───────────────────────────────────────

async function askOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number
): Promise<AIResponse> {
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  return {
    content: response.choices[0]?.message?.content ?? "",
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}

async function* streamOpenAI(
  apiKey: string,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number
): AsyncGenerator<string> {
  const client = new OpenAI({ apiKey });
  const stream = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// ── Gemini adapter ───────────────────────────────────────

async function askGemini(
  apiKey: string,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number
): Promise<AIResponse> {
  const ai = new GoogleGenAI({ apiKey });
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: maxTokens,
    },
    contents,
  });

  return {
    content: response.text ?? "",
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

// ── Local LLM adapter (OpenAI-compatible) ───────────────

const LOCAL_MODEL = process.env.LOCAL_LLM_MODEL || "qwen3-14b-claude-4.5-opus-high-reasoning-distill";

async function askLocal(
  baseURL: string,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number
): Promise<AIResponse> {
  const client = new OpenAI({ apiKey: "not-needed", baseURL: `${baseURL}/v1` });
  const response = await client.chat.completions.create({
    model: LOCAL_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  return {
    content: response.choices[0]?.message?.content ?? "",
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}

async function* streamLocal(
  baseURL: string,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number
): AsyncGenerator<string> {
  const client = new OpenAI({ apiKey: "not-needed", baseURL: `${baseURL}/v1` });
  const stream = await client.chat.completions.create({
    model: LOCAL_MODEL,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// ── Main exported functions ──────────────────────────────

async function askAnthropic(
  client: Anthropic,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number
): Promise<AIResponse> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  const textContent = response.content.find((c) => c.type === "text");

  return {
    content: textContent?.text || "",
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

export async function askClaude({
  userId,
  systemPrompt,
  messages,
  maxTokens = 1024,
}: AskOptions): Promise<AIResponse> {
  if (!rateLimiter.check(userId)) {
    throw new Error("Rate limit exceeded. Please wait a moment.");
  }
  rateLimiter.record(userId);

  const config = await getUserAIConfig(userId);

  // Try user's configured provider first
  if (config) {
    try {
      if (config.provider === "OPENAI") {
        return await askOpenAI(config.apiKey, systemPrompt, messages, maxTokens);
      }
      if (config.provider === "GEMINI") {
        return await askGemini(config.apiKey, systemPrompt, messages, maxTokens);
      }
      if (config.provider === "LOCAL") {
        return await askLocal(config.apiKey, systemPrompt, messages, maxTokens);
      }
      return await askAnthropic(new Anthropic({ apiKey: config.apiKey }), systemPrompt, messages, maxTokens);
    } catch (err) {
      if (!isProviderError(err)) throw err;
      // Fall through to platform default
    }
  }

  // Platform default Anthropic
  if (!hasDefaultKey()) {
    throwProviderError(config, false);
  }

  try {
    return await askAnthropic(getDefaultClient(), systemPrompt, messages, maxTokens);
  } catch (err) {
    if (isProviderError(err)) throwProviderError(config, true);
    throw err;
  }
}

export interface AgentOptions {
  userId: string;
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  tools: Anthropic.Tool[];
  maxTokens?: number;
}

export async function agentClaude({
  userId,
  systemPrompt,
  messages,
  tools,
  maxTokens = 2048,
}: AgentOptions): Promise<Anthropic.Message> {
  if (!rateLimiter.check(userId)) {
    throw new Error("Rate limit exceeded. Please wait a moment.");
  }
  rateLimiter.record(userId);

  // Agent/tool calls only supported with Anthropic
  const config = await getUserAIConfig(userId);
  const callArgs = { model: "claude-sonnet-4-6" as const, max_tokens: maxTokens, system: systemPrompt, messages, tools };

  // Try user's Anthropic key first
  if (config?.provider === "ANTHROPIC") {
    try {
      return await new Anthropic({ apiKey: config.apiKey }).messages.create(callArgs);
    } catch (err) {
      if (!isProviderError(err)) throw err;
    }
  }

  if (!hasDefaultKey()) {
    throwProviderError(config, false);
  }

  try {
    return await getDefaultClient().messages.create(callArgs);
  } catch (err) {
    if (isProviderError(err)) throwProviderError(config, true);
    throw err;
  }
}

/**
 * Research-mode call: uses web search + extended thinking for deep research.
 */
export async function researchClaude({
  userId,
  systemPrompt,
  messages,
  maxTokens = 8192,
}: AskOptions): Promise<AIResponse> {
  if (!rateLimiter.check(userId)) {
    throw new Error("Rate limit exceeded. Please wait a moment.");
  }
  rateLimiter.record(userId);

  // Research mode only supported with Anthropic
  const config = await getUserAIConfig(userId);

  function callResearch(client: Anthropic) {
    return client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
      thinking: {
        type: "enabled",
        budget_tokens: 5000,
      },
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
    });
  }

  function parseResearchResponse(response: Anthropic.Message): AIResponse {
    const textParts = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text);
    return {
      content: textParts.join("\n"),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  if (config?.provider === "ANTHROPIC") {
    try {
      return parseResearchResponse(await callResearch(new Anthropic({ apiKey: config.apiKey })));
    } catch (err) {
      if (!isProviderError(err)) throw err;
    }
  }

  if (!hasDefaultKey()) {
    throwProviderError(config, false);
  }

  try {
    return parseResearchResponse(await callResearch(getDefaultClient()));
  } catch (err) {
    if (isProviderError(err)) throwProviderError(config, true);
    throw err;
  }
}

async function* streamAnthropic(
  client: Anthropic,
  systemPrompt: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number
): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}

export async function* streamClaude({
  userId,
  systemPrompt,
  messages,
  maxTokens = 1024,
}: AskOptions): AsyncGenerator<string> {
  if (!rateLimiter.check(userId)) {
    throw new Error("Rate limit exceeded. Please wait a moment.");
  }
  rateLimiter.record(userId);

  const config = await getUserAIConfig(userId);

  // Try user's configured provider first
  if (config) {
    try {
      if (config.provider === "OPENAI") {
        yield* streamOpenAI(config.apiKey, systemPrompt, messages, maxTokens);
        return;
      }
      if (config.provider === "GEMINI") {
        const result = await askGemini(config.apiKey, systemPrompt, messages, maxTokens);
        yield result.content;
        return;
      }
      if (config.provider === "LOCAL") {
        yield* streamLocal(config.apiKey, systemPrompt, messages, maxTokens);
        return;
      }
      // ANTHROPIC with user key
      yield* streamAnthropic(new Anthropic({ apiKey: config.apiKey }), systemPrompt, messages, maxTokens);
      return;
    } catch (err) {
      if (!isProviderError(err)) throw err;
      // Fall through to platform default
    }
  }

  // Platform default Anthropic
  if (!hasDefaultKey()) {
    throwProviderError(config, false);
  }

  try {
    yield* streamAnthropic(getDefaultClient(), systemPrompt, messages, maxTokens);
  } catch (err) {
    if (isProviderError(err)) throwProviderError(config, true);
    throw err;
  }
}
