import { prisma } from "@/lib/db";
import type { CompanionContext } from "./types";

/**
 * Build rich context for an AI companion call by fetching
 * the student's profile, recent submissions, and mastery scores.
 */
export async function buildCompanionContext(
  userId: string,
  currentProblemId?: string
): Promise<CompanionContext> {
  // Fetch student profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
    },
  });

  if (!user || !user.studentProfile) {
    return {
      studentName: user?.name ?? "Student",
      phase: "FOUNDATIONS",
      xp: 0,
      level: 1,
      streak: 0,
    };
  }

  const profile = user.studentProfile;

  // Fetch recent wrong submissions (last 10)
  const recentWrong = await prisma.submission.findMany({
    where: {
      userId,
      isCorrect: false,
    },
    include: {
      problem: {
        select: {
          content: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const recentMistakes = recentWrong.map((s) => {
    const content = s.problem.content as Record<string, unknown>;
    const question = (content.question as string) || "Unknown problem";
    return `${s.problem.type}: "${question}" — student answered: ${JSON.stringify(s.answer)}`;
  });

  // Fetch mastery scores
  const progress = await prisma.progress.findMany({
    where: { userId },
    include: {
      skill: { select: { name: true } },
    },
  });

  const masteryScores: Record<string, number> = {};
  for (const p of progress) {
    masteryScores[p.skill.name] = Math.round(p.mastery);
  }

  // Fetch current problem if provided
  let currentProblem: CompanionContext["currentProblem"] | undefined;
  if (currentProblemId) {
    const problem = await prisma.problem.findUnique({
      where: { id: currentProblemId },
    });
    if (problem) {
      const content = problem.content as Record<string, unknown>;
      currentProblem = {
        question: (content.question as string) || "",
        type: problem.type,
        difficulty: problem.difficulty,
      };
    }
  }

  return {
    studentName: user.name,
    phase: profile.currentPhase,
    currentProblem,
    recentMistakes: recentMistakes.length > 0 ? recentMistakes : undefined,
    masteryScores:
      Object.keys(masteryScores).length > 0 ? masteryScores : undefined,
    xp: profile.xp,
    level: profile.level,
    streak: profile.streak,
  };
}
