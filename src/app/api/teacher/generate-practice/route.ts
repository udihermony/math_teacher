import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { askClaude } from "@/modules/ai/claude-client";
import { buildProblemGeneratorPrompt } from "@/modules/ai/prompts/problem-generator";
import { validateProblemContent } from "@/modules/problems/content-validation";

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
    include: {
      topic: {
        select: {
          name: true,
          phase: true,
          skills: { select: { name: true } },
        },
      },
      problems: {
        select: { type: true, difficulty: true, content: true },
        take: 10,
      },
    },
  });
  if (!lesson) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Build rich context
  const contextParts: string[] = [];
  contextParts.push("=== LESSON MATERIAL ===");
  contextParts.push(`## ${lesson.title}`);
  if (lesson.description) contextParts.push(`Description: ${lesson.description}`);
  if (lesson.syllabusRef) contextParts.push(`Syllabus reference: ${lesson.syllabusRef}`);
  if (lesson.sourceContent) {
    const scStr = typeof lesson.sourceContent === "string" ? lesson.sourceContent : JSON.stringify(lesson.sourceContent);
    contextParts.push(`Learning context: ${scStr.slice(0, 1500)}`);
  }
  if (lesson.content) {
    const contentStr = typeof lesson.content === "string" ? lesson.content : JSON.stringify(lesson.content);
    contextParts.push(`Content: ${contentStr.slice(0, 2000)}`);
  }

  const skillNames = lesson.topic.skills.map((s) => s.name);
  if (skillNames.length > 0) {
    contextParts.push(`\n=== SKILLS TO ASSESS ===\n${skillNames.join(", ")}`);
  }

  if (lesson.problems.length > 0) {
    contextParts.push("\n=== EXISTING PROBLEMS (for reference — generate NEW, different ones) ===");
    for (const p of lesson.problems) {
      const c = p.content as Record<string, unknown>;
      contextParts.push(`- [${p.type}, difficulty ${p.difficulty}] ${((c.question as string) ?? "").slice(0, 200)}`);
    }
  }

  const richContext = contextParts.join("\n");

  const systemPrompt = buildProblemGeneratorPrompt({
    topic: `${lesson.topic.name} — ${lesson.title}`,
    phase: lesson.topic.phase,
    count: Math.min(count, 20),
    difficultyMin: 2,
    difficultyMax: 6,
    additionalInstructions: "Use the provided lesson material and existing problems to generate practice questions directly aligned with what was taught. Do NOT duplicate existing problems.",
  });

  try {
    const response = await askClaude({
      userId: session.user.id,
      systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate ${count} practice problems for the lesson "${lesson.title}" under topic "${lesson.topic.name}" (${lesson.topic.phase} phase).

${richContext}`,
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
      const validated = validateProblemContent(p.type, p.content);
      if (!validated.ok) {
        return Response.json({ error: `Generated problem is invalid: ${validated.error}` }, { status: 500 });
      }
      const problem = await prisma.problem.create({
        data: {
          lessonId,
          purpose: "PRACTICE",
          type: (p.type as "MULTIPLE_CHOICE" | "FREE_INPUT") || "MULTIPLE_CHOICE",
          difficulty: p.difficulty || 4,
          content: validated.content as never,
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
