import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { agentClaude, askClaude, streamClaude } from "./claude-client";
import { buildCompanionContext } from "./context-builder";
import { assembleCompanionPrompt } from "./prompts/companion";
import { TUTOR_TOOLS, executeTool } from "./tools/tutor-tools";

const MAX_HISTORY_MESSAGES = 20;
const MAX_TOOL_ROUNDS = 3;

interface TutorAgentParams {
  userId: string;
  conversationId: string;
  userMessage: string;
  currentProblemId?: string;
}

interface TutorAgentResult {
  stream: AsyncGenerator<string>;
  sideEffects: { type: string; data: unknown }[];
}

export async function runTutorAgent(
  params: TutorAgentParams
): Promise<TutorAgentResult> {
  const { userId, conversationId, userMessage, currentProblemId } = params;

  // Load conversation for context
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  // Load recent message history
  const dbMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: MAX_HISTORY_MESSAGES,
    select: { role: true, content: true },
  });

  // Build messages array
  const historyMessages: Anthropic.MessageParam[] = [];

  // Prepend summary if available
  if (convo?.summary && dbMessages.length >= MAX_HISTORY_MESSAGES) {
    historyMessages.push({
      role: "user",
      content: `[Previous conversation summary: ${convo.summary}]`,
    });
    historyMessages.push({
      role: "assistant",
      content:
        "I understand the context from our previous conversation. How can I help you now?",
    });
  }

  // Add history messages
  for (const m of dbMessages) {
    if (m.role === "user" || m.role === "assistant") {
      historyMessages.push({
        role: m.role as "user" | "assistant",
        content: m.content,
      });
    }
  }

  // Add new user message
  historyMessages.push({ role: "user", content: userMessage });

  // Save user message to DB
  await prisma.message.create({
    data: {
      conversationId,
      role: "user",
      content: userMessage,
      metadata: currentProblemId
        ? { problemId: currentProblemId }
        : undefined,
    },
  });

  // Build context and system prompt
  const context = await buildCompanionContext(userId, currentProblemId);
  const systemPrompt = assembleCompanionPrompt(context);

  // Track side effects (explanations, animations)
  const sideEffects: { type: string; data: unknown }[] = [];

  // Run agent loop: call Claude with tools, handle tool calls
  let messages = [...historyMessages];
  let toolRounds = 0;

  while (toolRounds < MAX_TOOL_ROUNDS) {
    const response = await agentClaude({
      userId,
      systemPrompt,
      messages,
      tools: TUTOR_TOOLS,
      maxTokens: 2048,
    });

    // Check if there are tool calls
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      // No tool calls — extract text and stream it
      const textContent = response.content
        .filter(
          (block): block is Anthropic.TextBlock => block.type === "text"
        )
        .map((block) => block.text)
        .join("");

      // Save assistant message
      await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: textContent,
          metadata: sideEffects.length > 0 ? { sideEffects: JSON.parse(JSON.stringify(sideEffects)) } : undefined,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Generate title if this is the first exchange
      if (!convo?.title) {
        generateConversationTitle(userId, conversationId, userMessage, textContent).catch(() => {});
      }

      // Create a simple generator that yields the text
      async function* yieldText() {
        yield textContent;
      }

      return { stream: yieldText(), sideEffects };
    }

    // Execute tool calls
    // Add the assistant's full response (including tool_use blocks)
    messages.push({
      role: "assistant",
      content: response.content,
    });

    // Execute each tool and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolBlock of toolUseBlocks) {
      const result = await executeTool(
        toolBlock.name,
        toolBlock.input as Record<string, unknown>,
        userId
      );

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolBlock.id,
        content: result,
      });

      // Track explanation side effects
      try {
        const parsed = JSON.parse(result);
        if (parsed.explanationId) {
          sideEffects.push({
            type: "explanation_ready",
            data: { explanationId: parsed.explanationId, title: parsed.title },
          });
        }
        if (parsed.status === "ready" && parsed.animationUrl) {
          sideEffects.push({
            type: "animation_ready",
            data: { url: parsed.animationUrl, concept: parsed.concept },
          });
        }
      } catch {
        // Not JSON or no special side effects
      }
    }

    // Add tool results to messages
    messages.push({
      role: "user",
      content: toolResults,
    });

    toolRounds++;
  }

  // Fallback: if we exhausted tool rounds, stream a final response without tools
  const finalStream = streamClaude({
    userId,
    systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    })),
    maxTokens: 1024,
  });

  // Wrap to also persist the response
  async function* streamAndPersist() {
    let fullText = "";
    for await (const chunk of finalStream) {
      fullText += chunk;
      yield chunk;
    }
    await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: fullText,
        metadata: sideEffects.length > 0 ? { sideEffects: JSON.parse(JSON.stringify(sideEffects)) } : undefined,
      },
    });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    if (!convo?.title) {
      generateConversationTitle(userId, conversationId, userMessage, fullText).catch(() => {});
    }
  }

  return { stream: streamAndPersist(), sideEffects };
}

/**
 * Generate a short title for a conversation based on the first exchange.
 * Runs asynchronously — does not block the response.
 */
async function generateConversationTitle(
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const response = await askClaude({
    userId,
    systemPrompt:
      "Generate a very short title (3-6 words, no quotes) for this tutoring conversation based on the student's question. Examples: 'What Are Decimal Numbers', 'Adding Fractions Help', 'Solving for X'. Return ONLY the title, nothing else.",
    messages: [
      {
        role: "user",
        content: `Student: ${userMessage}\n\nTutor: ${assistantResponse.slice(0, 200)}`,
      },
    ],
    maxTokens: 30,
  });

  const title = response.content.trim().replace(/^["']|["']$/g, "");
  if (title) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }
}
