import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { askClaude } from "@/modules/ai/claude-client";
import { buildMistakeAnalysisPrompt } from "@/modules/ai/prompts/mistake-analyzer";
import { buildSkillGraph, findSkillGaps, getPrerequisiteChain } from "@/modules/adaptive/skill-graph";

/**
 * POST /api/ai/analyze — Analyze a student's recent wrong answers.
 *
 * Request body: { skillId?: string, limit?: number }
 * Returns: AI analysis + skill gap data + recommended skills to review
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const skillId = body.skillId as string | undefined;
  const limit = Math.min(body.limit ?? 10, 20);

  // Get recent wrong submissions
  const wrongSubmissions = await prisma.submission.findMany({
    where: {
      userId: session.user.id,
      isCorrect: false,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      problem: {
        select: {
          type: true,
          difficulty: true,
          content: true,
          skills: {
            include: { skill: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (wrongSubmissions.length === 0) {
    return Response.json({
      analysis: null,
      message: "No wrong answers to analyze — great job!",
      skillGaps: [],
      recommendedReview: [],
    });
  }

  // Get student profile
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { currentPhase: true },
  });

  // Build submission data for the prompt
  const submissions = wrongSubmissions.map((sub) => {
    const content = sub.problem.content as Record<string, unknown>;
    const answer = sub.answer as Record<string, unknown>;

    let question = (content.question as string) || "Unknown question";
    let studentAnswer = "";
    let correctAnswer = "";

    if (sub.problem.type === "MULTIPLE_CHOICE") {
      const options = content.options as string[];
      const selectedIdx = answer.selectedIndex as number;
      const correctIdx = content.correctIndex as number;
      studentAnswer = options?.[selectedIdx] ?? String(selectedIdx);
      correctAnswer = options?.[correctIdx] ?? String(correctIdx);
    } else if (sub.problem.type === "FREE_INPUT") {
      studentAnswer = (answer.value as string) || "No answer";
      correctAnswer = (content.correctAnswer as string) || "Unknown";
    }

    return {
      question,
      studentAnswer,
      correctAnswer,
      problemType: sub.problem.type,
      difficulty: sub.problem.difficulty,
    };
  });

  const skillNames = [
    ...new Set(
      wrongSubmissions.flatMap((s) =>
        s.problem.skills.map((ps) => ps.skill.name)
      )
    ),
  ];

  // Get AI analysis
  const systemPrompt = buildMistakeAnalysisPrompt({
    submissions,
    studentPhase: profile?.currentPhase ?? "FOUNDATIONS",
    skillNames,
  });

  let aiAnalysis = null;
  try {
    const response = await askClaude({
      userId: session.user.id,
      systemPrompt,
      messages: [
        {
          role: "user",
          content: "Analyze these wrong answers and identify patterns and conceptual gaps.",
        },
      ],
      maxTokens: 2048,
    });

    // Parse JSON from response
    const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      aiAnalysis = JSON.parse(jsonMatch[1]);
    }
  } catch {
    // AI analysis is best-effort
  }

  // Get skill graph data
  let skillGaps: Awaited<ReturnType<typeof findSkillGaps>> = [];
  let prerequisiteChain: Awaited<ReturnType<typeof getPrerequisiteChain>> = [];

  try {
    const graph = await buildSkillGraph(session.user.id);

    if (skillId) {
      skillGaps = findSkillGaps(graph, skillId);
      prerequisiteChain = getPrerequisiteChain(graph, skillId);
    } else {
      // Find gaps for all skills involved in wrong answers
      const involvedSkillIds = [
        ...new Set(
          wrongSubmissions.flatMap((s) =>
            s.problem.skills.map((ps) => ps.skill.name)
          )
        ),
      ];

      // Use skill IDs from the submissions
      const skillIdsFromSubmissions = [
        ...new Set(
          wrongSubmissions.flatMap((s) =>
            s.problem.skills.map((ps) => ps.skillId)
          )
        ),
      ];

      for (const sid of skillIdsFromSubmissions) {
        const gaps = findSkillGaps(graph, sid);
        for (const gap of gaps) {
          if (!skillGaps.find((g) => g.skillId === gap.skillId)) {
            skillGaps.push(gap);
          }
        }
      }
    }
  } catch {
    // Skill graph analysis is best-effort
  }

  return Response.json({
    analysis: aiAnalysis?.analysis ?? null,
    skillGaps,
    prerequisiteChain: prerequisiteChain.map((s) => ({
      id: s.id,
      name: s.name,
      mastery: s.mastery,
    })),
    submissionsAnalyzed: wrongSubmissions.length,
  });
}
