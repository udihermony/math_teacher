import { prisma } from "@/lib/db";
import { askClaude } from "./claude-client";
import { buildProblemGeneratorPrompt } from "./prompts/problem-generator";

/**
 * Auto-generate ASSIGNMENT problems for a lesson when the teacher
 * requests more than currently exist.
 *
 * Returns the IDs of the newly created problems.
 */
export async function generateAssignmentProblems({
  lessonId,
  count,
  userId,
}: {
  lessonId: string;
  count: number;
  userId: string;
}): Promise<string[]> {
  // Fetch lesson with rich context
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
  if (!lesson) throw new Error("Lesson not found");

  // Build context from lesson material and existing problems
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
    count,
    difficultyMin: 3,
    difficultyMax: 7,
    additionalInstructions: "Use the provided lesson material and existing problems to generate questions directly aligned with what was taught. Do NOT duplicate existing problems.",
  });

  const response = await askClaude({
    userId,
    systemPrompt,
    messages: [
      {
        role: "user",
        content: `Generate ${count} assignment problems for the lesson "${lesson.title}" under topic "${lesson.topic.name}" (${lesson.topic.phase} phase).

${richContext}`,
      },
    ],
    maxTokens: 4096,
  });

  // Parse the JSON array from the response
  const jsonMatch = response.content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid problem JSON");

  const problems = JSON.parse(jsonMatch[0]) as Array<{
    type: string;
    difficulty: number;
    content: Record<string, unknown>;
    solution?: Record<string, unknown>;
    commonMistakes?: Record<string, unknown>;
  }>;

  // Save to DB with purpose = ASSIGNMENT
  const createdIds: string[] = [];
  for (const p of problems) {
    const problem = await prisma.problem.create({
      data: {
        lessonId,
        purpose: "ASSIGNMENT",
        type: (p.type as "MULTIPLE_CHOICE" | "FREE_INPUT") || "MULTIPLE_CHOICE",
        difficulty: p.difficulty || 5,
        content: p.content as never,
        solution: (p.solution as never) ?? undefined,
        commonMistakes: (p.commonMistakes as never) ?? undefined,
      },
    });
    createdIds.push(problem.id);
  }

  return createdIds;
}
