import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateAnswer } from "@/modules/problems/validators/expression-parser";
import { instantiateProblem } from "@/modules/problems/randomization";
import {
  calculateXPEarned,
  buildXPResult,
  getLevelForXP,
} from "@/modules/gamification/xp-calculator";
import { updateStreak } from "@/modules/gamification/streak-tracker";
import { checkAndAwardBadges } from "@/modules/gamification/badge-checker";
import { rateQuality, updateReviewSchedule } from "@/modules/adaptive/spaced-repetition";
import {
  awardAnswerCoin,
  checkAssignmentCompletion,
  checkTopicCompletion,
} from "@/modules/gamification/coin-calculator";

const submissionSchema = z.object({
  problemId: z.string(),
  answer: z.record(z.string(), z.unknown()),
  timeSpent: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { problemId, answer, timeSpent } = parsed.data;

  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: {
      lesson: { select: { xpReward: true, id: true, topicId: true, coinableCount: true, topic: { select: { phase: true } } } },
      skills: { select: { skillId: true } },
    },
  });

  if (!problem) {
    return Response.json({ error: "Problem not found" }, { status: 404 });
  }

  // Determine correctness based on problem type
  const submissionInstance =
    answer.__instance && typeof answer.__instance === "object"
      ? (answer.__instance as { seed?: string })
      : null;

  const instantiated = instantiateProblem(
    {
      type: problem.type,
      content: problem.content as Record<string, unknown>,
      solution: (problem.solution as { steps: string[] } | null) ?? null,
    },
    submissionInstance?.seed ?? problemId
  );

  const content = instantiated.content as unknown as Record<string, unknown>;
  let isCorrect = false;

  if (problem.type === "MULTIPLE_CHOICE") {
    const selectedIndex = answer.selectedIndex as number;
    const correctIndex = content.correctIndex as number;
    isCorrect = selectedIndex === correctIndex;
  } else if (problem.type === "MULTI_SELECT") {
    const selectedIndices = Array.isArray(answer.selectedIndices)
      ? [...new Set((answer.selectedIndices as number[]).map(Number))].sort((a, b) => a - b)
      : [];
    const correctIndices = Array.isArray(content.correctIndices)
      ? [...new Set((content.correctIndices as number[]).map(Number))].sort((a, b) => a - b)
      : [];
    isCorrect =
      selectedIndices.length === correctIndices.length &&
      selectedIndices.every((value, index) => value === correctIndices[index]);
  } else if (problem.type === "FREE_INPUT") {
    const studentValue = answer.value as string;
    const correctAnswer = content.correctAnswer as string;
    isCorrect = validateAnswer(studentValue, correctAnswer);
  }

  // Check if this is the first attempt at this problem
  const previousAttempts = await prisma.submission.count({
    where: { userId: session.user.id, problemId },
  });

  // Record the submission
  const submission = await prisma.submission.create({
    data: {
      userId: session.user.id,
      problemId,
      answer: answer as never,
      isCorrect,
      timeSpent,
    },
  });

  // Update streak on any activity
  const streakResult = await updateStreak(session.user.id);

  // Award XP and coins if correct
  let xpResult = null;
  let coinsEarned = 0;
  let newBadges: Awaited<ReturnType<typeof checkAndAwardBadges>> = [];

  if (isCorrect) {
    // Get current XP before awarding
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { xp: true },
    });
    const previousXP = profile?.xp ?? 0;

    // Calculate XP with bonuses
    const xpEarned = calculateXPEarned({
      difficulty: problem.difficulty,
      timeSpent: timeSpent ?? undefined,
      streak: streakResult.streak,
      isFirstAttempt: previousAttempts === 0,
      lessonXPReward: problem.lesson?.xpReward,
    });

    // Update XP and level in DB
    const newLevel = getLevelForXP(previousXP + xpEarned);
    await prisma.studentProfile.update({
      where: { userId: session.user.id },
      data: {
        xp: { increment: xpEarned },
        level: newLevel,
      },
    });

    xpResult = buildXPResult(previousXP, xpEarned);

    // Update skill mastery via spaced repetition
    const quality = rateQuality({
      isCorrect: true,
      timeSpent: timeSpent ?? undefined,
      expectedTime: problem.difficulty * 30,
      attempts: previousAttempts + 1,
    });

    for (const { skillId } of problem.skills) {
      await updateReviewSchedule({
        userId: session.user.id,
        skillId,
        quality,
      });
    }

    // Check for new badges
    newBadges = await checkAndAwardBadges(session.user.id);

    // Award coins — only if this is the first correct answer for this problem
    const alreadySolvedThis = await prisma.submission.findFirst({
      where: {
        userId: session.user.id,
        problemId,
        isCorrect: true,
        id: { not: submission.id }, // exclude the submission we just created
      },
    });

    if (!alreadySolvedThis && problem.lesson?.id) {
      const phase = problem.lesson.topic?.phase ?? "PHASE_0";

      // Look up practicePayableCount from student's active class assignment
      let payableCount: number | null = null;
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: session.user.id },
        select: { activeClassId: true },
      });
      if (studentProfile?.activeClassId) {
        const classAssignment = await prisma.classAssignment.findUnique({
          where: { classId_lessonId: { classId: studentProfile.activeClassId, lessonId: problem.lesson.id } },
          select: { practicePayableCount: true },
        });
        payableCount = classAssignment?.practicePayableCount ?? null;
      }
      // Fall back to lesson-level coinableCount if no class assignment override
      if (payableCount == null) {
        payableCount = problem.lesson.coinableCount;
      }

      const answerCoin = await awardAnswerCoin(session.user.id, problem.lesson.id, problem.difficulty, phase, payableCount);
      coinsEarned += answerCoin;

      const assignmentResult = await checkAssignmentCompletion(session.user.id, problemId, phase);
      coinsEarned += assignmentResult.coins;

      if (assignmentResult.coins > 0 && problem.lesson.topicId) {
        const topicBonusCoins = await checkTopicCompletion(session.user.id, problem.lesson.topicId, phase);
        coinsEarned += topicBonusCoins;
      }
    }
  } else {
    // Wrong answer — still update spaced repetition (lower quality)
    const quality = rateQuality({
      isCorrect: false,
      attempts: previousAttempts + 1,
    });

    for (const { skillId } of problem.skills) {
      await updateReviewSchedule({
        userId: session.user.id,
        skillId,
        quality,
      });
    }
  }

  // Get updated coin balance
  let coinBalance = 0;
  if (coinsEarned > 0) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { coins: true },
    });
    coinBalance = profile?.coins ?? 0;
  }

  // Build response
  const result: Record<string, unknown> = {
    submissionId: submission.id,
    isCorrect,
    xp: xpResult,
    coins: coinsEarned > 0 ? { earned: coinsEarned, balance: coinBalance } : undefined,
    streak: {
      current: streakResult.streak,
      isNewDay: streakResult.isNewDay,
      broken: streakResult.broken,
    },
    newBadges: newBadges.length > 0 ? newBadges : undefined,
  };

  if (!isCorrect) {
    if (problem.type === "MULTIPLE_CHOICE") {
      const options = content.options as string[];
      const correctIndex = content.correctIndex as number;
      result.correctAnswer = options[correctIndex];
    } else if (problem.type === "MULTI_SELECT") {
      const options = Array.isArray(content.options) ? (content.options as string[]) : [];
      const correctIndices = Array.isArray(content.correctIndices) ? (content.correctIndices as number[]) : [];
      result.correctAnswer = correctIndices.map((index) => options[index] ?? String(index)).join(", ");
    } else if (problem.type === "FREE_INPUT") {
      result.correctAnswer = content.correctAnswer;
    }
  }

  return Response.json(result);
}
