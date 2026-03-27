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
  topicId: z.string().optional(),
  lessonId: z.string().optional(),
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

  // Build rich context for selected topic/lesson
  let focusContext = "";

  if (parsed.data.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: parsed.data.lessonId },
      include: {
        topic: {
          select: { name: true, phase: true, description: true, ibSection: true, skills: { select: { name: true, description: true } } },
        },
        problems: {
          select: { type: true, difficulty: true, purpose: true, content: true },
          take: 15,
          orderBy: { difficulty: "asc" },
        },
      },
    });
    if (lesson) {
      const parts: string[] = [];
      parts.push(`\n=== SELECTED LESSON: ${lesson.title} ===`);
      parts.push(`Topic: ${lesson.topic.name} (${lesson.topic.phase})`);
      if (lesson.description) parts.push(`Description: ${lesson.description}`);
      if (lesson.syllabusRef) parts.push(`Syllabus reference: ${lesson.syllabusRef}`);
      if (lesson.sourceContent) {
        const sc = typeof lesson.sourceContent === "string" ? lesson.sourceContent : JSON.stringify(lesson.sourceContent);
        parts.push(`\nLearning context (from research):\n${sc.slice(0, 2000)}`);
      }
      if (lesson.content) {
        const c = typeof lesson.content === "string" ? lesson.content : JSON.stringify(lesson.content);
        parts.push(`\nLesson content:\n${c.slice(0, 2000)}`);
      }
      const skills = lesson.topic.skills;
      if (skills.length > 0) {
        parts.push(`\nSkills: ${skills.map((s) => s.name).join(", ")}`);
      }
      if (lesson.problems.length > 0) {
        parts.push(`\nExisting problems (${lesson.problems.length}):`);
        for (const p of lesson.problems) {
          const q = (p.content as Record<string, unknown>).question as string ?? "";
          parts.push(`- [${p.type}, ${p.purpose}, diff ${p.difficulty}] ${q.slice(0, 150)}`);
        }
      }
      focusContext = parts.join("\n");
    }
  } else if (parsed.data.topicId) {
    const topic = await prisma.topic.findUnique({
      where: { id: parsed.data.topicId },
      include: {
        lessons: {
          select: { title: true, description: true, sourceContent: true, syllabusRef: true, _count: { select: { problems: true } } },
          orderBy: { order: "asc" },
        },
        skills: { select: { name: true, description: true } },
      },
    });
    if (topic) {
      const parts: string[] = [];
      parts.push(`\n=== SELECTED TOPIC: ${topic.name} (${topic.phase}) ===`);
      if (topic.description) parts.push(`Description: ${topic.description}`);
      if (topic.ibSection) parts.push(`IB Section: ${topic.ibSection}`);
      if (topic.skills.length > 0) {
        parts.push(`\nSkills: ${topic.skills.map((s) => s.name).join(", ")}`);
      }
      parts.push(`\nLessons:`);
      for (const l of topic.lessons) {
        parts.push(`- ${l.title}${l.description ? ` — ${l.description}` : ""} (${l._count.problems} problems)`);
        if (l.sourceContent) {
          const sc = typeof l.sourceContent === "string" ? l.sourceContent : JSON.stringify(l.sourceContent);
          parts.push(`  Learning context: ${sc.slice(0, 500)}`);
        }
      }
      focusContext = parts.join("\n");
    }
  }

  const systemPrompt = buildTeacherAssistantPrompt(summary, focusContext);

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
