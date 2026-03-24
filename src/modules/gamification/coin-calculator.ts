import { prisma } from "@/lib/db";

const MAX_COINS_PER_LESSON = 10;
const ASSIGNMENT_COMPLETE_BONUS = 5;
const TOPIC_COMPLETE_BONUS = 15;

/**
 * Award 1 coin for a correct answer, up to MAX_COINS_PER_LESSON per lesson.
 * Returns the number of coins awarded (0 or 1).
 */
export async function awardAnswerCoin(
  userId: string,
  lessonId: string
): Promise<number> {
  // Count how many coins already earned for this lesson
  const earned = await prisma.coinTransaction.count({
    where: { userId, reason: "CORRECT_ANSWER", sourceId: lessonId },
  });

  if (earned >= MAX_COINS_PER_LESSON) return 0;

  // Award 1 coin
  await prisma.$transaction([
    prisma.coinTransaction.create({
      data: { userId, amount: 1, reason: "CORRECT_ANSWER", sourceId: lessonId },
    }),
    prisma.studentProfile.update({
      where: { userId },
      data: { coins: { increment: 1 } },
    }),
  ]);

  return 1;
}

/**
 * Check if an assignment is now complete and award bonus if so.
 * Looks up all assignments containing this problemId for this user's classes.
 * Returns total bonus coins awarded.
 */
export async function checkAssignmentCompletion(
  userId: string,
  problemId: string
): Promise<{ coins: number; assignmentId?: string }> {
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
          data: { userId, amount: ASSIGNMENT_COMPLETE_BONUS, reason: "ASSIGNMENT_COMPLETE", sourceId: a.id },
        }),
        prisma.studentProfile.update({
          where: { userId },
          data: { coins: { increment: ASSIGNMENT_COMPLETE_BONUS } },
        }),
      ]);
      return { coins: ASSIGNMENT_COMPLETE_BONUS, assignmentId: a.id };
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
  topicId: string
): Promise<number> {
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
      data: { userId, amount: TOPIC_COMPLETE_BONUS, reason: "TOPIC_COMPLETE", sourceId: topicId },
    }),
    prisma.studentProfile.update({
      where: { userId },
      data: { coins: { increment: TOPIC_COMPLETE_BONUS } },
    }),
  ]);

  return TOPIC_COMPLETE_BONUS;
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
