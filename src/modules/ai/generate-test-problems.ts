import { prisma } from "@/lib/db";
import { askClaude } from "./claude-client";
import { buildProblemGeneratorPrompt } from "./prompts/problem-generator";

/**
 * Generate test problems for a given scope (lesson, topic, or phase).
 * Returns problem IDs and an AI-recommended duration in minutes.
 */
export async function generateTestProblems({
  scope,
  scopeId,
  count,
  userId,
}: {
  scope: "LESSON" | "TOPIC" | "PHASE";
  scopeId: string;
  count: number;
  userId: string;
}): Promise<{ problemIds: string[]; recommendedDuration: number }> {
  let topicName = "";
  let phase = "PHASE_0";
  let lessonContext = "";
  let lessonId: string | null = null;

  if (scope === "LESSON") {
    const lesson = await prisma.lesson.findUnique({
      where: { id: scopeId },
      include: { topic: { select: { name: true, phase: true } } },
    });
    if (!lesson) throw new Error("Lesson not found");
    topicName = `${lesson.topic.name} — ${lesson.title}`;
    phase = lesson.topic.phase;
    lessonContext = lesson.title;
    lessonId = lesson.id;
  } else if (scope === "TOPIC") {
    const topic = await prisma.topic.findUnique({
      where: { id: scopeId },
      include: { lessons: { select: { title: true, id: true }, orderBy: { order: "asc" } } },
    });
    if (!topic) throw new Error("Topic not found");
    topicName = topic.name;
    phase = topic.phase;
    lessonContext = topic.lessons.map((l) => l.title).join(", ");
    lessonId = topic.lessons[0]?.id ?? null;
  } else {
    // PHASE scope
    phase = scopeId;
    const topics = await prisma.topic.findMany({
      where: { phase: scopeId as never },
      include: { lessons: { select: { title: true, id: true }, take: 3, orderBy: { order: "asc" } } },
      take: 5,
    });
    topicName = topics.map((t) => t.name).join(", ");
    lessonContext = topics.flatMap((t) => t.lessons.map((l) => l.title)).join(", ");
    lessonId = topics[0]?.lessons[0]?.id ?? null;
  }

  const systemPrompt = buildProblemGeneratorPrompt({
    topic: topicName,
    phase,
    count,
    difficultyMin: 3,
    difficultyMax: 8,
  });

  const response = await askClaude({
    userId,
    systemPrompt,
    messages: [
      {
        role: "user",
        content: `Generate ${count} test problems covering: ${topicName}. Lessons: ${lessonContext}.

IMPORTANT: After the JSON array of problems, also output a single line:
RECOMMENDED_DURATION_MINUTES: <number>
where <number> is your estimate of how many minutes a student would need to complete all ${count} problems.`,
      },
    ],
    maxTokens: 8192,
  });

  // Parse problems
  const jsonMatch = response.content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI did not return valid problem JSON");

  const problems = JSON.parse(jsonMatch[0]) as Array<{
    type: string;
    difficulty: number;
    content: Record<string, unknown>;
    solution?: Record<string, unknown>;
    commonMistakes?: Record<string, unknown>;
  }>;

  // Parse recommended duration
  const durationMatch = response.content.match(/RECOMMENDED_DURATION_MINUTES:\s*(\d+)/);
  const recommendedDuration = durationMatch ? parseInt(durationMatch[1]) : Math.ceil(count * 3);

  // Save problems to DB
  const problemIds: string[] = [];
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
    problemIds.push(problem.id);
  }

  return { problemIds, recommendedDuration };
}
