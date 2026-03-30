import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Phase } from "@/generated/prisma/client";
import {
  maxPracticeCoins,
  quizBonus,
  deepDiveBonus,
  topicBonus,
  testTopicBonus,
  testPhaseBonus,
  FINAL_TEST_BONUS,
  totalPossibleCoins,
} from "@/modules/gamification/coin-calculator";

const PHASE_LABELS: Record<string, string> = {
  PHASE_0: "Foundations",
  PHASE_1: "Algebra",
  PHASE_2: "Functions",
  PHASE_3: "Sequences & Series",
  PHASE_4: "Trigonometry",
  PHASE_5: "Vectors & Geometry",
  PHASE_6: "Statistics",
  PHASE_7: "Differentiation",
  PHASE_8: "Integration",
  PHASE_9: "HL Topics",
  PHASE_10: "Exam Prep",
};

/** GET /api/student/bank — returns full bank data with redeemability info. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Determine active class
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { activeClassId: true, coins: true },
  });

  let membership = profile?.activeClassId
    ? await prisma.classMembership.findFirst({
        where: { userId, classId: profile.activeClassId, role: "STUDENT" },
        include: { class: true },
      })
    : null;

  // Fallback: if no activeClassId set, find any class membership and set it
  if (!membership) {
    const fallback = await prisma.classMembership.findFirst({
      where: { userId, role: "STUDENT" },
      include: { class: true },
    });
    if (fallback) {
      await prisma.studentProfile.updateMany({
        where: { userId },
        data: { activeClassId: fallback.classId },
      });
      membership = fallback;
    }
  }

  if (!membership) {
    return Response.json({ hasClass: false });
  }

  const cls = membership.class;
  const phaseOrder: Phase[] = [
    "PHASE_0", "PHASE_1", "PHASE_2", "PHASE_3", "PHASE_4",
    "PHASE_5", "PHASE_6", "PHASE_7", "PHASE_8", "PHASE_9", "PHASE_10",
  ];
  const startIdx = phaseOrder.indexOf(cls.phase);
  const endIdx = phaseOrder.indexOf(cls.endPhase ?? "PHASE_10");
  const activePhases = phaseOrder.slice(startIdx, endIdx + 1);

  // Fetch topics with lessons and assignments for this class
  const topics = await prisma.topic.findMany({
    where: { phase: { in: activePhases } },
    include: {
      lessons: {
        select: {
          id: true,
          title: true,
          coinableCount: true,
          assignments: {
            where: { classId: cls.id },
            select: { id: true },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ phase: "asc" }, { order: "asc" }],
  });

  // Fetch all coin transactions for this user
  const coinTransactions = await prisma.coinTransaction.findMany({
    where: { userId },
    select: { reason: true, sourceId: true, amount: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  // Determine which topics have been unlocked (topic test passed)
  const topicTests = await prisma.testRequest.findMany({
    where: {
      studentId: userId,
      status: "COMPLETED",
      test: {
        classId: cls.id,
        scope: "TOPIC",
      },
    },
    include: {
      test: { select: { scopeId: true, passingGrade: true, questionCount: true } },
    },
  });

  const unlockedTopicIds = new Set<string>();
  for (const tr of topicTests) {
    const passingGrade = tr.test.passingGrade ?? tr.test.questionCount;
    if (tr.score != null && tr.score >= passingGrade) {
      unlockedTopicIds.add(tr.test.scopeId);
    }
  }

  // Check which phase tests have been passed
  const phaseTests = await prisma.testRequest.findMany({
    where: {
      studentId: userId,
      status: "COMPLETED",
      test: {
        classId: cls.id,
        scope: "PHASE",
      },
    },
    include: {
      test: { select: { scopeId: true, passingGrade: true, questionCount: true } },
    },
  });

  const passedPhases = new Set<string>();
  for (const tr of phaseTests) {
    const passingGrade = tr.test.passingGrade ?? tr.test.questionCount;
    if (tr.score != null && tr.score >= passingGrade) {
      passedPhases.add(tr.test.scopeId);
    }
  }

  // Build lesson-to-topic mapping for redeemability lookups
  const lessonToTopic = new Map<string, string>();
  const assignmentToTopic = new Map<string, string>();
  for (const topic of topics) {
    for (const lesson of topic.lessons) {
      lessonToTopic.set(lesson.id, topic.id);
      for (const a of lesson.assignments) {
        assignmentToTopic.set(a.id, topic.id);
      }
    }
  }

  // Categorize coin transactions
  let totalCollected = 0;
  let totalRedeemable = 0;

  // Track per-topic collected coins
  const topicCollected = new Map<string, number>();

  for (const tx of coinTransactions) {
    totalCollected += tx.amount;

    let topicId: string | null = null;
    let alwaysRedeemable = false;

    if (tx.reason === "CORRECT_ANSWER" && tx.sourceId) {
      topicId = lessonToTopic.get(tx.sourceId) ?? null;
    } else if (tx.reason === "ASSIGNMENT_COMPLETE" && tx.sourceId) {
      topicId = assignmentToTopic.get(tx.sourceId) ?? null;
    } else if (tx.reason === "TOPIC_COMPLETE" && tx.sourceId) {
      topicId = tx.sourceId;
    } else if (tx.reason === "TEST_TOPIC_PASS") {
      // Find which topic this test was for
      const matchingTest = topicTests.find((t) => t.id === tx.sourceId);
      if (matchingTest) topicId = matchingTest.test.scopeId;
      alwaysRedeemable = true; // passing the test itself = redeemable
    } else if (tx.reason === "TEST_PHASE_PASS") {
      alwaysRedeemable = true;
    }

    if (topicId) {
      topicCollected.set(topicId, (topicCollected.get(topicId) ?? 0) + tx.amount);
    }

    const isRedeemable = alwaysRedeemable || (topicId != null && unlockedTopicIds.has(topicId));
    if (isRedeemable) {
      totalRedeemable += tx.amount;
    }
  }

  // Calculate total possible coins
  const { grandTotal } = await totalPossibleCoins(cls.id);

  // Euro calculations
  const euroRate = cls.coinsExchangeable && cls.totalEuros && grandTotal > 0
    ? cls.totalEuros / grandTotal
    : null;

  // Build phase breakdown
  const byPhase = new Map<string, typeof topics>();
  for (const t of topics) {
    const list = byPhase.get(t.phase) || [];
    list.push(t);
    byPhase.set(t.phase, list);
  }

  const phases = activePhases.map((phase) => {
    const phaseTopics = byPhase.get(phase) || [];

    const topicData = phaseTopics.map((topic) => {
      const lessons = topic.lessons.map((lesson) => {
        const maxPractice = lesson.coinableCount ?? maxPracticeCoins(phase);
        const maxQuiz = quizBonus(phase);
        const maxDeepDive = deepDiveBonus(phase);

        const practiceEarned = coinTransactions
          .filter((tx) => tx.reason === "CORRECT_ANSWER" && tx.sourceId === lesson.id)
          .reduce((s, tx) => s + tx.amount, 0);

        const quizEarned = lesson.assignments.some((a) =>
          coinTransactions.some((tx) => tx.reason === "ASSIGNMENT_COMPLETE" && tx.sourceId === a.id)
        ) ? quizBonus(phase) : 0;

        const deepDiveEarned = coinTransactions
          .filter((tx) => tx.reason === "DEEP_DIVE" && tx.sourceId === lesson.id)
          .reduce((s, tx) => s + tx.amount, 0);

        return {
          id: lesson.id,
          title: lesson.title,
          practiceCoins: Math.min(practiceEarned, maxPractice),
          maxPractice,
          quizBonus: quizEarned,
          maxQuiz,
          deepDiveBonus: Math.min(deepDiveEarned, maxDeepDive),
          maxDeepDive,
        };
      });

      const collected = topicCollected.get(topic.id) ?? 0;
      const possible = lessons.reduce((s, l) => s + l.maxPractice + l.maxQuiz + l.maxDeepDive, 0)
        + topicBonus(phase) + testTopicBonus(phase);

      return {
        topicId: topic.id,
        topicName: topic.name,
        collected,
        redeemable: unlockedTopicIds.has(topic.id),
        possible,
        lessons,
      };
    });

    const phaseTestBonusEarned = coinTransactions
      .filter((tx) => tx.reason === "TEST_PHASE_PASS")
      .some((tx) => {
        const match = phaseTests.find((pt) => pt.id === tx.sourceId);
        return match && match.test.scopeId === phase;
      });

    return {
      phase,
      label: PHASE_LABELS[phase] ?? phase,
      testPassed: passedPhases.has(phase),
      testBonus: {
        earned: phaseTestBonusEarned ? testPhaseBonus(phase) : 0,
        possible: testPhaseBonus(phase),
      },
      topics: topicData,
    };
  });

  // Final test
  const allPhasesCompleted = phases.every((p) => p.topics.every((t) => t.redeemable));
  const finalTestCompleted = coinTransactions.some(
    (tx) => tx.reason === "ASSIGNMENT_COMPLETE" && tx.sourceId === "FINAL_TEST"
  );

  // Recent transactions (last 20)
  const reasonLabels: Record<string, string> = {
    CORRECT_ANSWER: "Practice",
    ASSIGNMENT_COMPLETE: "Quiz Bonus",
    TOPIC_COMPLETE: "Topic Complete",
    TEST_TOPIC_PASS: "Topic Test",
    TEST_PHASE_PASS: "Level Test",
  };

  const recentTransactions = coinTransactions.slice(0, 20).map((tx) => ({
    amount: tx.amount,
    reason: reasonLabels[tx.reason] ?? tx.reason,
    createdAt: tx.createdAt,
  }));

  return Response.json({
    hasClass: true,
    class: {
      name: cls.name,
      coinsExchangeable: cls.coinsExchangeable,
      totalEuros: cls.totalEuros,
      ibExamBonusEuros: cls.ibExamBonusEuros,
    },
    balance: profile?.coins ?? 0,
    totalCollected,
    totalRedeemable,
    totalPossible: grandTotal,
    euroRate,
    euroEarned: euroRate != null ? Math.round(totalRedeemable * euroRate * 100) / 100 : null,
    euroPossible: cls.totalEuros ?? null,
    phases,
    finalTest: {
      unlocked: allPhasesCompleted,
      completed: finalTestCompleted,
      bonus: FINAL_TEST_BONUS,
    },
    ibExamBonus: {
      euros: cls.ibExamBonusEuros ?? null,
    },
    recentTransactions,
  });
}
