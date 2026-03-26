import Anthropic from "@anthropic-ai/sdk";

// Server-only — never import this on the client
if (typeof window !== "undefined") {
  throw new Error("claude-client.ts must only be used on the server");
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Simple in-memory rate limiter
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

  const anthropic = getClient();

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

  const anthropic = getClient();

  return anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    tools,
  });
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

  const anthropic = getClient();

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
