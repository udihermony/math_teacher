/**
 * Adaptive difficulty algorithm for MathQuest.
 *
 * Determines the optimal difficulty for the next problem based on:
 * - Recent performance (last N submissions)
 * - Current skill mastery levels
 * - Success rate trends
 *
 * The algorithm targets a ~70-80% success rate (zone of proximal development).
 */

import { prisma } from "@/lib/db";

export interface DifficultyRecommendation {
  targetDifficulty: number; // 1-10
  minDifficulty: number;
  maxDifficulty: number;
  confidence: number; // 0-1, how confident in the recommendation
  reason: string;
}

/** Get recent submission performance for a user. */
async function getRecentPerformance(
  userId: string,
  limit = 20
): Promise<Array<{ difficulty: number; isCorrect: boolean; timeSpent: number | null }>> {
  const submissions = await prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      isCorrect: true,
      timeSpent: true,
      problem: {
        select: { difficulty: true },
      },
    },
  });

  return submissions.map((s) => ({
    difficulty: s.problem.difficulty,
    isCorrect: s.isCorrect,
    timeSpent: s.timeSpent,
  }));
}

/** Calculate the optimal difficulty for a student. */
export async function recommendDifficulty(
  userId: string,
  skillIds?: string[]
): Promise<DifficultyRecommendation> {
  const recent = await getRecentPerformance(userId);

  // Not enough data — start at moderate difficulty
  if (recent.length < 3) {
    return {
      targetDifficulty: 3,
      minDifficulty: 1,
      maxDifficulty: 5,
      confidence: 0.3,
      reason: "Not enough data — starting at moderate difficulty",
    };
  }

  // Calculate success rate
  const correctCount = recent.filter((r) => r.isCorrect).length;
  const successRate = correctCount / recent.length;

  // Calculate average difficulty of recent problems
  const avgDifficulty =
    recent.reduce((sum, r) => sum + r.difficulty, 0) / recent.length;

  // Look at trend — are recent answers improving or declining?
  const recentHalf = recent.slice(0, Math.floor(recent.length / 2));
  const olderHalf = recent.slice(Math.floor(recent.length / 2));
  const recentRate = recentHalf.filter((r) => r.isCorrect).length / recentHalf.length;
  const olderRate = olderHalf.length > 0
    ? olderHalf.filter((r) => r.isCorrect).length / olderHalf.length
    : 0.5;
  const improving = recentRate > olderRate;

  // Target: 70-80% success rate
  let targetDifficulty: number;
  let reason: string;

  if (successRate > 0.9) {
    // Too easy — increase difficulty
    targetDifficulty = Math.min(10, Math.round(avgDifficulty + 2));
    reason = "High success rate (>90%) — increasing challenge";
  } else if (successRate > 0.8) {
    // Slightly easy — nudge up
    targetDifficulty = Math.min(10, Math.round(avgDifficulty + 1));
    reason = "Good performance — slight difficulty increase";
  } else if (successRate >= 0.7) {
    // Sweet spot — maintain
    targetDifficulty = Math.round(avgDifficulty);
    reason = "In the zone of proximal development — maintaining difficulty";
  } else if (successRate >= 0.5) {
    // A bit hard — nudge down
    targetDifficulty = Math.max(1, Math.round(avgDifficulty - 1));
    reason = "Below target success rate — reducing difficulty slightly";
  } else {
    // Struggling — significant decrease
    targetDifficulty = Math.max(1, Math.round(avgDifficulty - 2));
    reason = "Low success rate (<50%) — reducing difficulty";
  }

  // If improving, be slightly more aggressive with difficulty
  if (improving && successRate >= 0.6) {
    targetDifficulty = Math.min(10, targetDifficulty + 1);
    reason += " (trending up)";
  }

  // Factor in skill mastery if available
  if (skillIds && skillIds.length > 0) {
    const masteries = await prisma.progress.findMany({
      where: { userId, skillId: { in: skillIds } },
      select: { mastery: true },
    });

    if (masteries.length > 0) {
      const avgMastery =
        masteries.reduce((sum, m) => sum + m.mastery, 0) / masteries.length;
      // Mastery 0-100 maps roughly to difficulty 1-10
      const masteryDifficulty = Math.max(1, Math.round(avgMastery / 10));
      // Blend with performance-based target
      targetDifficulty = Math.round(
        targetDifficulty * 0.6 + masteryDifficulty * 0.4
      );
    }
  }

  targetDifficulty = Math.max(1, Math.min(10, targetDifficulty));

  const confidence = Math.min(1, recent.length / 20);

  return {
    targetDifficulty,
    minDifficulty: Math.max(1, targetDifficulty - 2),
    maxDifficulty: Math.min(10, targetDifficulty + 2),
    confidence,
    reason,
  };
}
