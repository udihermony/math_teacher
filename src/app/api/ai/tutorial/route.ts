import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeacher } from "@/lib/teacher-auth";
import { streamClaude } from "@/modules/ai/claude-client";
import { prisma } from "@/lib/db";
import { buildTutorialPrompt } from "@/modules/ai/prompts/tutorial-generator";

const schema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  lessonId: z.string(),
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

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.lessonId },
    include: {
      topic: {
        select: {
          name: true,
          phase: true,
          skills: { select: { name: true } },
        },
      },
    },
  });

  if (!lesson) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  const systemPrompt = buildTutorialPrompt({
    title: lesson.title,
    description: lesson.description ?? undefined,
    content: lesson.content,
    sourceContent: lesson.sourceContent,
    topicName: lesson.topic.name,
    phase: lesson.topic.phase,
    skills: lesson.topic.skills.map((s) => s.name),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = streamClaude({
          userId: session.user!.id,
          systemPrompt,
          messages: parsed.data.messages,
          maxTokens: 32000,
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
