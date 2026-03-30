import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { streamClaude } from "@/modules/ai/claude-client";
import { buildProblemGeneratorPrompt } from "@/modules/ai/prompts/problem-generator";

const schema = z.object({
  topic: z.string().min(1),
  phase: z.enum(["PHASE_0", "PHASE_1", "PHASE_2", "PHASE_3", "PHASE_4", "PHASE_5", "PHASE_6", "PHASE_7", "PHASE_8", "PHASE_9", "PHASE_10"]),
  count: z.number().int().min(1).max(30),
  difficultyMin: z.number().int().min(1).max(10).default(1),
  difficultyMax: z.number().int().min(1).max(10).default(10),
  types: z.array(z.enum(["MULTIPLE_CHOICE", "FREE_INPUT"])).optional(),
  additionalInstructions: z.string().optional(),
  lessonId: z.string().optional(),
});

async function buildLessonContext(lessonId: string): Promise<string> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      topic: {
        select: {
          name: true,
          skills: { select: { name: true } },
        },
      },
      problems: {
        select: { type: true, difficulty: true, content: true },
        take: 10,
      },
    },
  });
  if (!lesson) return "";

  const parts: string[] = [];
  parts.push("=== LESSON MATERIAL ===");
  parts.push(`## ${lesson.title}`);
  if (lesson.description) parts.push(`Description: ${lesson.description}`);
  if (lesson.syllabusRef) parts.push(`Syllabus reference: ${lesson.syllabusRef}`);
  if (lesson.sourceContent) {
    const scStr = typeof lesson.sourceContent === "string" ? lesson.sourceContent : JSON.stringify(lesson.sourceContent);
    parts.push(`Learning context: ${scStr.slice(0, 1500)}`);
  }
  if (lesson.content) {
    const contentStr = typeof lesson.content === "string" ? lesson.content : JSON.stringify(lesson.content);
    parts.push(`Content: ${contentStr.slice(0, 2000)}`);
  }

  const skillNames = lesson.topic.skills.map((s) => s.name);
  if (skillNames.length > 0) {
    parts.push(`\n=== SKILLS TO ASSESS ===\n${skillNames.join(", ")}`);
  }

  if (lesson.problems.length > 0) {
    parts.push("\n=== EXISTING PROBLEMS (for reference — generate NEW, different ones) ===");
    for (const p of lesson.problems) {
      const c = p.content as Record<string, unknown>;
      parts.push(`- [${p.type}, difficulty ${p.difficulty}] ${((c.question as string) ?? "").slice(0, 200)}`);
    }
  }

  return parts.join("\n");
}

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

  // Fetch rich context if lessonId is provided
  const lessonContext = parsed.data.lessonId
    ? await buildLessonContext(parsed.data.lessonId)
    : "";

  const systemPrompt = buildProblemGeneratorPrompt({
    ...parsed.data,
    additionalInstructions: lessonContext
      ? `${parsed.data.additionalInstructions ?? ""}\nUse the provided lesson material and existing problems to generate questions directly aligned with what was taught. Do NOT duplicate existing problems.`.trim()
      : parsed.data.additionalInstructions,
  });

  const userMessage = lessonContext
    ? `Generate ${parsed.data.count} ${parsed.data.topic} problems for the ${parsed.data.phase} phase, difficulty ${parsed.data.difficultyMin}-${parsed.data.difficultyMax}.\n\n${lessonContext}`
    : `Generate ${parsed.data.count} ${parsed.data.topic} problems for the ${parsed.data.phase} phase, difficulty ${parsed.data.difficultyMin}-${parsed.data.difficultyMax}.`;

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
