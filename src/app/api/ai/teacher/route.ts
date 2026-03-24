import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeacher } from "@/lib/teacher-auth";
import { streamClaude } from "@/modules/ai/claude-client";
import { prisma } from "@/lib/db";
import { buildTeacherAssistantPrompt } from "@/modules/ai/prompts/teacher-assistant";

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  // Build a curriculum summary for context
  const topics = await prisma.topic.findMany({
    include: {
      lessons: { select: { title: true }, orderBy: { order: "asc" } },
      skills: { select: { name: true } },
    },
    orderBy: [{ phase: "asc" }, { order: "asc" }],
  });

  const summary = topics
    .map(
      (t) =>
        `[${t.phase}] ${t.name}: lessons=[${t.lessons.map((l) => l.title).join(", ")}], skills=[${t.skills.map((s) => s.name).join(", ")}]`
    )
    .join("\n");

  const systemPrompt = buildTeacherAssistantPrompt(summary);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = streamClaude({
          userId: session.user!.id,
          systemPrompt,
          messages: parsed.data.messages,
          maxTokens: 4096,
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
