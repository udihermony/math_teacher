import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeacher } from "@/lib/teacher-auth";
import { streamClaude } from "@/modules/ai/claude-client";
import { buildLessonGeneratorPrompt } from "@/modules/ai/prompts/lesson-generator";

const schema = z.object({
  topic: z.string().min(1),
  phase: z.enum(["PHASE_0", "PHASE_1", "PHASE_2", "PHASE_3", "PHASE_4", "PHASE_5", "PHASE_6", "PHASE_7", "PHASE_8", "PHASE_9", "PHASE_10"]),
  additionalInstructions: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const systemPrompt = buildLessonGeneratorPrompt(parsed.data);

  const userMessage = `Generate a complete lesson on "${parsed.data.topic}" for the ${parsed.data.phase} phase.${
    parsed.data.additionalInstructions
      ? ` Additional notes: ${parsed.data.additionalInstructions}`
      : ""
  }`;

  // Return prompt only (for copying to external LLM)
  if (body.promptOnly) {
    return Response.json({
      systemPrompt,
      userMessage,
      fullPrompt: `${systemPrompt}\n\n---\n\nUser: ${userMessage}`,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = streamClaude({
          userId: session.user!.id,
          systemPrompt,
          messages: [
            {
              role: "user",
              content: userMessage,
            },
          ],
          maxTokens: 8192,
        });

        for await (const chunk of generator) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "An error occurred";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
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
