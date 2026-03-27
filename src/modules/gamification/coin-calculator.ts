import { prisma } from "@/lib/db";

/**
 * Phase multiplier: harder phases pay more.
 */
const PHASE_MULTIPLIER: Record<string, number> = {
  PHASE_0: 1.0,
  PHASE_1: 1.3,
  PHASE_2: 1.6,
  PHASE_3: 1.9,
  PHASE_4: 2.2,
  PHASE_5: 2.5,
  PHASE_6: 2.8,
  PHASE_7: 3.1,
  PHASE_8: 3.4,
  PHASE_9: 3.7,
  PHASE_10: 4.0,
};

/** Coins per correct answer based on difficulty (1-10). */
export function coinsForDifficulty(difficulty: number): number {
  if (difficulty <= 3) return 1;
  if (difficulty <= 6) return 2;
  return 3; // 7-10
}

/** Max practice coins earnable for a lesson, scaled by phase. */
export function maxPracticeCoins(phase: string): number {
  const mult = PHASE_MULTIPLIER[phase] ?? 1;
  return Math.round(10 * mult);
}

/** Quiz completion bonus, scaled by phase. */
export function quizBonus(phase: string): number {
  const mult = PHASE_MULTIPLIER[phase] ?? 1;
  return Math.round(5 * mult);
}

/** Topic completion bonus, scaled by phase. */
export function topicBonus(phase: string): number {
  const mult = PHASE_MULTIPLIER[phase] ?? 1;
  return Math.round(15 * mult);
}

/**
 * Award coins for a correct answer, scaled by difficulty.
 * Capped at maxPracticeCoins(phase) per lesson.
 * Returns the number of coins awarded.
 */
export async function awardAnswerCoin(
  userId: string,
  lessonId: string,
  difficulty: number,
  phase: string,
  payableCount?: number | null
): Promise<number> {
  const cap = payableCount != null ? payableCount : maxPracticeCoins(phase);

  // Sum coins already earned for this lesson
  const agg = await prisma.coinTransaction.aggregate({
    where: { userId, reason: "CORRECT_ANSWER", sourceId: lessonId },
    _sum: { amount: true },
  });
  const earned = agg._sum.amount ?? 0;

  if (earned >= cap) return 0;

  const reward = Math.min(coinsForDifficulty(difficulty), cap - earned);
  if (reward <= 0) return 0;

  await prisma.$transaction([
    prisma.coinTransaction.create({
      data: { userId, amount: reward, reason: "CORRECT_ANSWER", sourceId: lessonId },
    }),
    prisma.studentProfile.update({
      where: { userId },
      data: { coins: { increment: reward } },
    }),
  ]);

  return reward;
}

/**
 * Check if an assignment is now complete and award bonus if so.
 * Looks up all assignments containing this problemId for this user's classes.
 * Returns total bonus coins awarded.
 */
export async function checkAssignmentCompletion(
  userId: string,
  problemId: string,
  phase: string
): Promise<{ coins: number; assignmentId?: string }> {
  const bonus = quizBonus(phase);

  // Find assignments that include this problem
  const memberships = await prisma.classMembership.findMany({
    where: { userId, role: "STUDENT" },
    select: { classId: true },
  });
  const classIds = memberships.map((m) => m.classId);
  if (classIds.length === 0) return { coins: 0 };

  const assignments = await prisma.classAssignment.findMany({
    where: { classId: { in: classIds } },
    include: { lesson: { include: { problems: { select: { id: true } } } } },
  });

  for (const a of assignments) {
    const assignedIds = (a.problemIds as string[] | null) ?? a.lesson.problems.map((p) => p.id);
    if (!assignedIds.includes(problemId)) continue;

    // Check if already awarded
    const existing = await prisma.coinTransaction.findFirst({
      where: { userId, reason: "ASSIGNMENT_COMPLETE", sourceId: a.id },
    });
    if (existing) continue;

    // Check if all problems in this assignment are answered correctly
    const correctSubmissions = await prisma.submission.findMany({
      where: { userId, problemId: { in: assignedIds }, isCorrect: true },
      select: { problemId: true },
      distinct: ["problemId"],
    });

    if (correctSubmissions.length >= assignedIds.length) {
      await prisma.$transaction([
        prisma.coinTransaction.create({
          data: { userId, amount: bonus, reason: "ASSIGNMENT_COMPLETE", sourceId: a.id },
        }),
        prisma.studentProfile.update({
          where: { userId },
          data: { coins: { increment: bonus } },
        }),
      ]);
      return { coins: bonus, assignmentId: a.id };
    }
  }

  return { coins: 0 };
}

/**
 * Check if a topic is now complete (all lessons' problems answered correctly
 * + at least one assignment in the topic completed) and award bonus.
 * Returns coins awarded.
 */
export async function checkTopicCompletion(
  userId: string,
  topicId: string,
  phase: string
): Promise<number> {
  const bonus = topicBonus(phase);

  // Check if already awarded
  const existing = await prisma.coinTransaction.findFirst({
    where: { userId, reason: "TOPIC_COMPLETE", sourceId: topicId },
  });
  if (existing) return 0;

  // Get all lessons in the topic with their problems
  const lessons = await prisma.lesson.findMany({
    where: { topicId },
    include: { problems: { select: { id: true } } },
  });

  if (lessons.length === 0) return 0;

  // Check all problems across all lessons are answered correctly
  const allProblemIds = lessons.flatMap((l) => l.problems.map((p) => p.id));
  if (allProblemIds.length === 0) return 0;

  const correctSubmissions = await prisma.submission.findMany({
    where: { userId, problemId: { in: allProblemIds }, isCorrect: true },
    select: { problemId: true },
    distinct: ["problemId"],
  });

  if (correctSubmissions.length < allProblemIds.length) return 0;

  // Check that at least one assignment in this topic is completed
  const lessonIds = lessons.map((l) => l.id);
  const completedAssignment = await prisma.coinTransaction.findFirst({
    where: {
      userId,
      reason: "ASSIGNMENT_COMPLETE",
      sourceId: {
        in: await prisma.classAssignment.findMany({
          where: { lessonId: { in: lessonIds } },
          select: { id: true },
        }).then((a) => a.map((x) => x.id)),
      },
    },
  });

  if (!completedAssignment) return 0;

  // Award topic completion bonus
  await prisma.$transaction([
    prisma.coinTransaction.create({
      data: { userId, amount: bonus, reason: "TOPIC_COMPLETE", sourceId: topicId },
    }),
    prisma.studentProfile.update({
      where: { userId },
      data: { coins: { increment: bonus } },
    }),
  ]);

  return bonus;
}

/** Get the student's current coin balance */
export async function getCoinBalance(userId: string): Promise<number> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { coins: true },
  });
  return profile?.coins ?? 0;
}

/** Get coins earned for a specific lesson (for showing X/10 in UI) */
export async function getCoinsEarnedForLesson(
  userId: string,
  lessonId: string
): Promise<number> {
  return prisma.coinTransaction.count({
    where: { userId, reason: "CORRECT_ANSWER", sourceId: lessonId },
  });
}
