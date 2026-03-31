import { prisma } from "@/lib/db";
import { validateProblemContent } from "@/modules/problems/content-validation";
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
  let lessonId: string | null = null;

  // Collect rich context for the AI
  const lessonDetails: Array<{
    title: string;
    description: string | null;
    content: unknown;
    sourceContent: unknown;
    syllabusRef: string | null;
  }> = [];
  const existingProblems: Array<{ type: string; difficulty: number; question: string }> = [];
  const skillNames: string[] = [];

  if (scope === "LESSON") {
    const lesson = await prisma.lesson.findUnique({
      where: { id: scopeId },
      include: {
        topic: { select: { name: true, phase: true, skills: { select: { name: true, description: true } } } },
        problems: { select: { type: true, difficulty: true, content: true }, take: 10 },
      },
    });
    if (!lesson) throw new Error("Lesson not found");
    topicName = `${lesson.topic.name} — ${lesson.title}`;
    phase = lesson.topic.phase;
    lessonId = lesson.id;
    lessonDetails.push({ title: lesson.title, description: lesson.description, content: lesson.content, sourceContent: lesson.sourceContent, syllabusRef: lesson.syllabusRef });
    for (const p of lesson.problems) {
      const c = p.content as Record<string, unknown>;
      existingProblems.push({ type: p.type, difficulty: p.difficulty, question: (c.question as string) ?? "" });
    }
    for (const s of lesson.topic.skills) skillNames.push(s.name);
  } else if (scope === "TOPIC") {
    const topic = await prisma.topic.findUnique({
      where: { id: scopeId },
      include: {
        lessons: {
          select: { id: true, title: true, description: true, content: true, sourceContent: true, syllabusRef: true, problems: { select: { type: true, difficulty: true, content: true }, take: 5 } },
          orderBy: { order: "asc" },
        },
        skills: { select: { name: true, description: true } },
      },
    });
    if (!topic) throw new Error("Topic not found");
    topicName = topic.name;
    phase = topic.phase;
    lessonId = topic.lessons[0]?.id ?? null;
    for (const l of topic.lessons) {
      lessonDetails.push({ title: l.title, description: l.description, content: l.content, sourceContent: l.sourceContent, syllabusRef: l.syllabusRef });
      for (const p of l.problems) {
        const c = p.content as Record<string, unknown>;
        existingProblems.push({ type: p.type, difficulty: p.difficulty, question: (c.question as string) ?? "" });
      }
    }
    for (const s of topic.skills) skillNames.push(s.name);
  } else {
    // PHASE scope
    phase = scopeId;
    const topics = await prisma.topic.findMany({
      where: { phase: scopeId as never },
      include: {
        lessons: {
          select: { id: true, title: true, description: true, content: true, sourceContent: true, syllabusRef: true, problems: { select: { type: true, difficulty: true, content: true }, take: 3 } },
          orderBy: { order: "asc" },
        },
        skills: { select: { name: true, description: true } },
      },
    });
    topicName = topics.map((t) => t.name).join(", ");
    lessonId = topics[0]?.lessons[0]?.id ?? null;
    for (const t of topics) {
      for (const l of t.lessons) {
        lessonDetails.push({ title: l.title, description: l.description, content: l.content, sourceContent: l.sourceContent, syllabusRef: l.syllabusRef });
        for (const p of l.problems) {
          const c = p.content as Record<string, unknown>;
          existingProblems.push({ type: p.type, difficulty: p.difficulty, question: (c.question as string) ?? "" });
        }
      }
      for (const s of t.skills) skillNames.push(s.name);
    }
  }

  // Build rich context string
  const contextParts: string[] = [];

  if (lessonDetails.length > 0) {
    contextParts.push("=== LESSON MATERIAL ===");
    for (const l of lessonDetails) {
      contextParts.push(`\n## ${l.title}`);
      if (l.description) contextParts.push(`Description: ${l.description}`);
      if (l.syllabusRef) contextParts.push(`Syllabus reference: ${l.syllabusRef}`);
      if (l.sourceContent) {
        const scStr = typeof l.sourceContent === "string" ? l.sourceContent : JSON.stringify(l.sourceContent);
        contextParts.push(`Learning context: ${scStr.slice(0, 1500)}`);
      }
      if (l.content) {
        const contentStr = typeof l.content === "string" ? l.content : JSON.stringify(l.content);
        // Truncate very large content to stay within token limits
        contextParts.push(`Content: ${contentStr.slice(0, 2000)}`);
      }
    }
  }

  if (skillNames.length > 0) {
    contextParts.push(`\n=== SKILLS TO ASSESS ===\n${skillNames.join(", ")}`);
  }

  if (existingProblems.length > 0) {
    contextParts.push("\n=== EXISTING PROBLEM EXAMPLES (for style reference, generate NEW problems) ===");
    for (const p of existingProblems.slice(0, 15)) {
      contextParts.push(`- [${p.type}, difficulty ${p.difficulty}] ${p.question.slice(0, 200)}`);
    }
  }

  const richContext = contextParts.join("\n");

  const systemPrompt = buildProblemGeneratorPrompt({
    topic: topicName,
    phase,
    count,
    difficultyMin: 3,
    difficultyMax: 8,
    additionalInstructions: "Use the provided lesson material, skills, and existing problem examples to generate problems that are directly aligned with what was taught. Problems should test the specific concepts, techniques, and skills from the lessons — not generic math. Do NOT duplicate existing problems.",
  });

  const response = await askClaude({
    userId,
    systemPrompt,
    messages: [
      {
        role: "user",
        content: `Generate ${count} test problems covering: ${topicName}.

${richContext}

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
    const validated = validateProblemContent(p.type, p.content);
    if (!validated.ok) {
      throw new Error(`Generated test problem is invalid: ${validated.error}`);
    }
    const problem = await prisma.problem.create({
      data: {
        lessonId,
        purpose: "TEST",
        type: (p.type as "MULTIPLE_CHOICE" | "MULTI_SELECT" | "FREE_INPUT") || "MULTIPLE_CHOICE",
        difficulty: p.difficulty || 5,
        content: validated.content as never,
        solution: (p.solution as never) ?? undefined,
        commonMistakes: (p.commonMistakes as never) ?? undefined,
      },
    });
    problemIds.push(problem.id);
  }

  return { problemIds, recommendedDuration };
}
