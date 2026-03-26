import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { askClaude } from "@/modules/ai/claude-client";
import { buildProblemGeneratorPrompt } from "@/modules/ai/prompts/problem-generator";

/** POST /api/teacher/generate-practice — generate PRACTICE problems for a lesson. */
export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId, count = 5 } = await request.json();
  if (!lessonId) {
    return Response.json({ error: "lessonId required" }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { topic: { select: { name: true, phase: true } } },
  });
  if (!lesson) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  const systemPrompt = buildProblemGeneratorPrompt({
    topic: `${lesson.topic.name} — ${lesson.title}`,
    phase: lesson.topic.phase,
    count: Math.min(count, 20),
    difficultyMin: 2,
    difficultyMax: 6,
  });

  try {
    const response = await askClaude({
      userId: session.user.id,
      systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate ${count} practice problems for the lesson "${lesson.title}" under topic "${lesson.topic.name}" (${lesson.topic.phase} phase).`,
        },
      ],
      maxTokens: 4096,
    });

    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return Response.json({ error: "AI did not return valid problem JSON" }, { status: 500 });
    }

    const problems = JSON.parse(jsonMatch[0]) as Array<{
      type: string;
      difficulty: number;
      content: Record<string, unknown>;
      solution?: Record<string, unknown>;
      commonMistakes?: Record<string, unknown>;
    }>;

    const createdIds: string[] = [];
    for (const p of problems) {
      const problem = await prisma.problem.create({
        data: {
          lessonId,
          purpose: "PRACTICE",
          type: (p.type as "MULTIPLE_CHOICE" | "FREE_INPUT") || "MULTIPLE_CHOICE",
          difficulty: p.difficulty || 4,
          content: p.content as never,
          solution: (p.solution as never) ?? undefined,
          commonMistakes: (p.commonMistakes as never) ?? undefined,
        },
      });
      createdIds.push(problem.id);
    }

    return Response.json({ success: true, created: createdIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate";
    return Response.json({ error: message }, { status: 500 });
  }
}
