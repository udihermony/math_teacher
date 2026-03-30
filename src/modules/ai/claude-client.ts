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
  provider: "ANTHROPIC" | "OPENAI" | "GEMINI";
  apiKey: string;
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

// ── Main exported functions ──────────────────────────────

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

  if (config?.provider === "OPENAI") {
    return askOpenAI(config.apiKey, systemPrompt, messages, maxTokens);
  }

  if (config?.provider === "GEMINI") {
    return askGemini(config.apiKey, systemPrompt, messages, maxTokens);
  }

  // Anthropic (user key or default)
  const anthropic = config?.provider === "ANTHROPIC"
    ? new Anthropic({ apiKey: config.apiKey })
    : getDefaultClient();

  const response = await anthropic.messages.create({
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
  const anthropic = config?.provider === "ANTHROPIC"
    ? new Anthropic({ apiKey: config.apiKey })
    : getDefaultClient();

  return anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    tools,
  });
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
  const anthropic = config?.provider === "ANTHROPIC"
    ? new Anthropic({ apiKey: config.apiKey })
    : getDefaultClient();

  const response = await anthropic.messages.create({
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

  if (config?.provider === "OPENAI") {
    yield* streamOpenAI(config.apiKey, systemPrompt, messages, maxTokens);
    return;
  }

  if (config?.provider === "GEMINI") {
    // Gemini doesn't have a clean streaming API in the same pattern,
    // fall back to non-streaming and yield the full result
    const result = await askGemini(config.apiKey, systemPrompt, messages, maxTokens);
    yield result.content;
    return;
  }

  // Anthropic (user key or default)
  const anthropic = config?.provider === "ANTHROPIC"
    ? new Anthropic({ apiKey: config.apiKey })
    : getDefaultClient();

  const stream = anthropic.messages.stream({
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
