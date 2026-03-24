import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { streamClaude } from "@/modules/ai/claude-client";
import { buildCompanionContext } from "@/modules/ai/context-builder";
import { assembleCompanionPrompt } from "@/modules/ai/prompts/companion";

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  currentProblemId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { messages, currentProblemId } = parsed.data;

  // Build context from student data
  const context = await buildCompanionContext(
    session.user.id,
    currentProblemId
  );

  // Assemble the full system prompt
  const systemPrompt = assembleCompanionPrompt(context);

  // Stream the response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = streamClaude({
          userId: session.user!.id,
          systemPrompt,
          messages,
          maxTokens: 1024,
        });

        for await (const chunk of generator) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An error occurred";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: message })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
