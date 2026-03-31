import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Phase } from "@/generated/prisma/client";
import {
  FINAL_TEST_BONUS,
  deepDiveBonus,
  maxPracticeCoins,
  quizBonus,
  testPhaseBonus,
  testTopicBonus,
  topicBonus,
  totalPossibleCoins,
} from "@/modules/gamification/coin-calculator";

type NodeStatus = "locked" | "available" | "in_progress" | "completed";

const PHASE_ORDER: Phase[] = [
  "PHASE_0",
  "PHASE_1",
  "PHASE_2",
  "PHASE_3",
  "PHASE_4",
  "PHASE_5",
  "PHASE_6",
  "PHASE_7",
  "PHASE_8",
  "PHASE_9",
  "PHASE_10",
];

/** GET /api/student/quest-road — returns hierarchical quest road data. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const profile0 = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { activeClassId: true },
  });

  let membership = profile0?.activeClassId
    ? await prisma.classMembership.findFirst({
        where: { userId, classId: profile0.activeClassId, role: "STUDENT" },
        include: { class: true },
      })
    : null;

  if (!membership) {
    membership = await prisma.classMembership.findFirst({
      where: { userId, role: "STUDENT" },
      include: { class: true },
    });
  }

  if (!membership) {
    return Response.json({ hasClass: false });
  }

  const startingPhase = membership.class.phase;
  const endPhase = membership.class.endPhase ?? "PHASE_10";
  const startIndex = PHASE_ORDER.indexOf(startingPhase);
  const endIndex = PHASE_ORDER.indexOf(endPhase);
  const activePhases = PHASE_ORDER.slice(startIndex, endIndex + 1);

  const [topics, submissions, profile, classAssignments, coinTransactions, activeTests, completedTestRequests, contentRequests, possibleCoins] = await Promise.all([
    prisma.topic.findMany({
      where: { phase: { in: activePhases } },
      include: {
        lessons: {
          select: {
            id: true,
            title: true,
            order: true,
            tutorial: true,
            deepDive: true,
            coinableCount: true,
            problems: {
              where: { purpose: "PRACTICE" },
              select: { id: true },
            },
          },
          orderBy: { order: "asc" },
        },
      },
      orderBy: [{ phase: "asc" }, { order: "asc" }],
    }),
    prisma.submission.findMany({
      where: { userId },
      select: { problemId: true, isCorrect: true },
    }),
    prisma.studentProfile.findUnique({
      where: { userId },
      select: { coins: true, xp: true, level: true, streak: true },
    }),
    prisma.classAssignment.findMany({
      where: { classId: membership.classId },
      include: { lesson: { include: { problems: { select: { id: true } } } } },
    }),
    prisma.coinTransaction.findMany({
      where: { userId },
      select: { reason: true, sourceId: true, amount: true },
    }),
    prisma.test.findMany({
      where: {
        classId: membership.classId,
        status: { not: "ARCHIVED" },
      },
      select: {
        id: true,
        scope: true,
        scopeId: true,
        questionCount: true,
        passingGrade: true,
      },
    }),
    prisma.testRequest.findMany({
      where: {
        studentId: userId,
        status: "COMPLETED",
        test: {
          classId: membership.classId,
          status: { not: "ARCHIVED" },
        },
      },
      include: {
        test: {
          select: {
            id: true,
            scope: true,
            scopeId: true,
            questionCount: true,
            passingGrade: true,
          },
        },
      },
    }),
    prisma.contentRequest.findMany({
      where: { classId: membership.classId },
      select: { type: true, lessonId: true, topicId: true, phase: true },
    }),
    totalPossibleCoins(membership.classId),
  ]);

  const problemStats = new Map<string, { attempted: boolean; correct: boolean }>();
  for (const sub of submissions) {
    const existing = problemStats.get(sub.problemId);
    if (existing) {
      existing.correct = existing.correct || sub.isCorrect;
    } else {
      problemStats.set(sub.problemId, { attempted: true, correct: sub.isCorrect });
    }
  }

  const assignmentByLesson = new Map<string, { id: string; problemIds: string[]; passingGrade: number }>();
  for (const assignment of classAssignments) {
    const targets = assignment.studentIds as string[] | null;
    if (targets && !targets.includes(userId)) continue;
    const ids = (assignment.problemIds as string[] | null) ?? assignment.lesson.problems.map((problem) => problem.id);
    assignmentByLesson.set(assignment.lessonId, {
      id: assignment.id,
      problemIds: ids,
      passingGrade: assignment.passingGrade ?? ids.length,
    });
  }

  const practiceCoins = new Map<string, number>();
  const assignmentBonusEarned = new Set<string>();
  const deepDiveCoins = new Map<string, number>();
  const topicCompletionCoins = new Map<string, number>();

  const lessonToTopic = new Map<string, string>();
  const assignmentToTopic = new Map<string, string>();
  for (const topic of topics) {
    for (const lesson of topic.lessons) {
      lessonToTopic.set(lesson.id, topic.id);
      const assignment = assignmentByLesson.get(lesson.id);
      if (assignment) {
        assignmentToTopic.set(assignment.id, topic.id);
      }
    }
  }

  for (const tx of coinTransactions) {
    if (tx.reason === "CORRECT_ANSWER" && tx.sourceId) {
      practiceCoins.set(tx.sourceId, (practiceCoins.get(tx.sourceId) ?? 0) + tx.amount);
    }
    if (tx.reason === "ASSIGNMENT_COMPLETE" && tx.sourceId) {
      assignmentBonusEarned.add(tx.sourceId);
    }
    if (tx.reason === "DEEP_DIVE" && tx.sourceId) {
      deepDiveCoins.set(tx.sourceId, (deepDiveCoins.get(tx.sourceId) ?? 0) + tx.amount);
    }
    if (tx.reason === "TOPIC_COMPLETE" && tx.sourceId) {
      topicCompletionCoins.set(tx.sourceId, (topicCompletionCoins.get(tx.sourceId) ?? 0) + tx.amount);
    }
  }

  const activeTopicTests = new Map<string, { id: string; questionCount: number; passingGrade: number }>();
  const activePhaseTests = new Map<string, { id: string; questionCount: number; passingGrade: number }>();
  for (const test of activeTests) {
    if (test.scope === "TOPIC") {
      activeTopicTests.set(test.scopeId, {
        id: test.id,
        questionCount: test.questionCount,
        passingGrade: test.passingGrade ?? test.questionCount,
      });
    }
    if (test.scope === "PHASE") {
      activePhaseTests.set(test.scopeId, {
        id: test.id,
        questionCount: test.questionCount,
        passingGrade: test.passingGrade ?? test.questionCount,
      });
    }
  }

  const passedTopicIds = new Set<string>();
  const passedPhases = new Set<string>();
  const topicTestBonusCoins = new Map<string, number>();
  const phaseTestBonusCoins = new Map<string, number>();
  const topicTestRequestIdToTopicId = new Map<string, string>();
  const phaseTestRequestIdToPhase = new Map<string, string>();

  for (const request of completedTestRequests) {
    const passingGrade = request.test.passingGrade ?? request.test.questionCount;
    const passed = request.score != null && request.score >= passingGrade;
    if (request.test.scope === "TOPIC") {
      topicTestRequestIdToTopicId.set(request.id, request.test.scopeId);
      if (passed) {
        passedTopicIds.add(request.test.scopeId);
      }
    }
    if (request.test.scope === "PHASE") {
      phaseTestRequestIdToPhase.set(request.id, request.test.scopeId);
      if (passed) {
        passedPhases.add(request.test.scopeId);
      }
    }
  }

  for (const tx of coinTransactions) {
    if (tx.reason === "TEST_TOPIC_PASS" && tx.sourceId) {
      const topicId = topicTestRequestIdToTopicId.get(tx.sourceId);
      if (topicId) {
        topicTestBonusCoins.set(topicId, (topicTestBonusCoins.get(topicId) ?? 0) + tx.amount);
      }
    }
    if (tx.reason === "TEST_PHASE_PASS" && tx.sourceId) {
      const phase = phaseTestRequestIdToPhase.get(tx.sourceId);
      if (phase) {
        phaseTestBonusCoins.set(phase, (phaseTestBonusCoins.get(phase) ?? 0) + tx.amount);
      }
    }
  }

  const deepDiveRequestLessonIds = new Set(
    contentRequests
      .filter((request) => request.type === "DEEP_DIVE" && request.lessonId)
      .map((request) => request.lessonId as string)
  );
  const practiceRequestLessonIds = new Set(
    contentRequests
      .filter((request) => request.type === "PRACTICE" && request.lessonId)
      .map((request) => request.lessonId as string)
  );
  const lessonQuizRequestLessonIds = new Set(
    contentRequests
      .filter((request) => request.type === "LESSON_QUIZ" && request.lessonId)
      .map((request) => request.lessonId as string)
  );
  const topicTestRequestTopicIds = new Set(
    contentRequests
      .filter((request) => request.type === "TOPIC_TEST" && request.topicId)
      .map((request) => request.topicId as string)
  );
  const phaseTestRequestPhases = new Set(
    contentRequests
      .filter((request) => request.type === "PHASE_TEST" && request.phase)
      .map((request) => request.phase as Phase)
  );

  let totalRedeemable = 0;
  for (const tx of coinTransactions) {
    let topicId: string | null = null;
    let alwaysRedeemable = false;

    if (tx.reason === "CORRECT_ANSWER" && tx.sourceId) {
      topicId = lessonToTopic.get(tx.sourceId) ?? null;
    } else if (tx.reason === "ASSIGNMENT_COMPLETE" && tx.sourceId) {
      topicId = assignmentToTopic.get(tx.sourceId) ?? null;
      if (tx.sourceId === "FINAL_TEST") {
        alwaysRedeemable = true;
      }
    } else if (tx.reason === "DEEP_DIVE" && tx.sourceId) {
      topicId = lessonToTopic.get(tx.sourceId) ?? null;
    } else if (tx.reason === "TOPIC_COMPLETE" && tx.sourceId) {
      topicId = tx.sourceId;
    } else if (tx.reason === "TEST_TOPIC_PASS" || tx.reason === "TEST_PHASE_PASS") {
      alwaysRedeemable = true;
    }

    if (alwaysRedeemable || (topicId != null && passedTopicIds.has(topicId))) {
      totalRedeemable += tx.amount;
    }
  }

  const byPhase = new Map<string, typeof topics>();
  for (const topic of topics) {
    const list = byPhase.get(topic.phase) || [];
    list.push(topic);
    byPhase.set(topic.phase, list);
  }

  const phases = activePhases.map((phase) => {
    const phaseTopics = byPhase.get(phase) || [];

    const questTopics = phaseTopics.map((topic) => {
      const lessons = topic.lessons.map((lesson) => {
        const problemIds = lesson.problems.map((problem) => problem.id);
        let attempted = 0;
        let correct = 0;
        for (const problemId of problemIds) {
          const stat = problemStats.get(problemId);
          if (stat) {
            attempted++;
            if (stat.correct) correct++;
          }
        }

        const assignment = assignmentByLesson.get(lesson.id);
        let quizCompleted = false;
        let quizCorrectCount = 0;
        if (assignment) {
          quizCorrectCount = assignment.problemIds.filter((problemId) => problemStats.get(problemId)?.correct).length;
          quizCompleted = quizCorrectCount >= assignment.passingGrade;
        }

        let status: NodeStatus;
        if (quizCompleted) {
          status = "completed";
        } else if (attempted > 0 || (assignment && assignment.problemIds.some((problemId) => problemStats.has(problemId)))) {
          status = "in_progress";
        } else {
          status = "available";
        }

        const phaseMaxPractice = lesson.coinableCount ?? maxPracticeCoins(phase);
        const phaseQuizBonus = quizBonus(phase);
        const phaseDeepDiveBonus = deepDiveBonus(phase);
        const earnedPracticeCoins = Math.min(practiceCoins.get(lesson.id) ?? 0, phaseMaxPractice);
        const earnedQuizBonus = assignment && assignmentBonusEarned.has(assignment.id) ? phaseQuizBonus : 0;
        const earnedDeepDiveCoins = Math.min(deepDiveCoins.get(lesson.id) ?? 0, phaseDeepDiveBonus);

        return {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          status,
          problemCount: problemIds.length,
          completedProblems: correct,
          practice: {
            available: problemIds.length > 0,
            requested: problemIds.length === 0 && practiceRequestLessonIds.has(lesson.id),
          },
          quizAvailable: !!assignment,
          quizRequested: !assignment && lessonQuizRequestLessonIds.has(lesson.id),
          quizCompleted,
          quizCorrect: quizCorrectCount,
          quizTotal: assignment?.problemIds.length ?? 0,
          passingGrade: assignment?.passingGrade ?? 0,
          quizProblemIds: assignment?.problemIds ?? [],
          coins: {
            earned: earnedPracticeCoins + earnedQuizBonus + earnedDeepDiveCoins,
            total: phaseMaxPractice + phaseQuizBonus + phaseDeepDiveBonus,
          },
          hasTutorial: !!lesson.tutorial,
          deepDive: {
            available: !!lesson.deepDive,
            requested: !lesson.deepDive && deepDiveRequestLessonIds.has(lesson.id),
          },
        };
      });

      const topicTest = activeTopicTests.get(topic.id);
      const topicTestPassed = passedTopicIds.has(topic.id);
      const lessonProgress = lessons.some((lesson) => lesson.status === "in_progress" || lesson.status === "completed");
      const allLessonsCompleted = lessons.length > 0 && lessons.every((lesson) => lesson.status === "completed");

      let topicStatus: NodeStatus;
      if (topicTestPassed) {
        topicStatus = "completed";
      } else if (lessonProgress || allLessonsCompleted) {
        topicStatus = "in_progress";
      } else {
        topicStatus = "available";
      }

      const lessonCoinsEarned = lessons.reduce((sum, lesson) => sum + lesson.coins.earned, 0);
      const lessonCoinsTotal = lessons.reduce((sum, lesson) => sum + lesson.coins.total, 0);
      const earnedTopicBonus = topicCompletionCoins.get(topic.id) ?? 0;
      const earnedTopicTestBonus = topicTestBonusCoins.get(topic.id) ?? 0;

      return {
        id: topic.id,
        name: topic.name,
        order: topic.order,
        status: topicStatus,
        lessons,
        coins: {
          earned: lessonCoinsEarned + earnedTopicBonus + earnedTopicTestBonus,
          total: lessonCoinsTotal + topicBonus(phase) + testTopicBonus(phase),
        },
        test: {
          available: !!topicTest,
          passed: topicTestPassed,
          requested: !topicTest && topicTestRequestTopicIds.has(topic.id),
          questionCount: topicTest?.questionCount ?? 0,
          passingGrade: topicTest?.passingGrade ?? 0,
        },
      };
    });

    const phaseTest = activePhaseTests.get(phase);
    const phaseStatus: NodeStatus = passedPhases.has(phase)
      ? "completed"
      : questTopics.some((topic) => topic.status === "in_progress" || topic.status === "completed")
      ? "in_progress"
      : "available";

    const earnedTopicCoins = questTopics.reduce((sum, topic) => sum + topic.coins.earned, 0);
    const totalTopicCoins = questTopics.reduce((sum, topic) => sum + topic.coins.total, 0);
    const earnedPhaseTestBonus = phaseTestBonusCoins.get(phase) ?? 0;

    return {
      phase,
      status: phaseStatus,
      topics: questTopics,
      coins: {
        earned: earnedTopicCoins + earnedPhaseTestBonus,
        total: totalTopicCoins + testPhaseBonus(phase),
      },
      perLesson: {
        practice: maxPracticeCoins(phase),
        quiz: quizBonus(phase),
        deepDive: deepDiveBonus(phase),
      },
      test: {
        available: !!phaseTest,
        passed: passedPhases.has(phase),
        requested: !phaseTest && phaseTestRequestPhases.has(phase),
        questionCount: phaseTest?.questionCount ?? 0,
        passingGrade: phaseTest?.passingGrade ?? 0,
        coins: testPhaseBonus(phase),
      },
    };
  });

  const finalTestCompleted = coinTransactions.some(
    (tx) => tx.reason === "ASSIGNMENT_COMPLETE" && tx.sourceId === "FINAL_TEST"
  );

  return Response.json({
    hasClass: true,
    className: membership.class.name,
    startingPhase,
    profile: {
      coins: profile?.coins ?? 0,
      xp: profile?.xp ?? 0,
      level: profile?.level ?? 1,
      streak: profile?.streak ?? 0,
    },
    phases,
    totalCoins: {
      earned: totalRedeemable,
      total: possibleCoins.grandTotal,
    },
    finalTest: {
      unlocked: phases.every((phase) => phase.test.passed),
      completed: finalTestCompleted,
      coins: FINAL_TEST_BONUS,
    },
  });
}
