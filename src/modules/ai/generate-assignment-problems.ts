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
  // Fetch lesson context
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { topic: { select: { name: true, phase: true } } },
  });
  if (!lesson) throw new Error("Lesson not found");

  const systemPrompt = buildProblemGeneratorPrompt({
    topic: `${lesson.topic.name} — ${lesson.title}`,
    phase: lesson.topic.phase,
    count,
    difficultyMin: 3,
    difficultyMax: 7,
  });

  const response = await askClaude({
    userId,
    systemPrompt,
    messages: [
      {
        role: "user",
        content: `Generate ${count} problems for the lesson "${lesson.title}" under topic "${lesson.topic.name}" (${lesson.topic.phase} phase).`,
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
