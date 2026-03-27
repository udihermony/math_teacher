import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Phase } from "@/generated/prisma/client";
import { maxPracticeCoins, quizBonus } from "@/modules/gamification/coin-calculator";

type NodeStatus = "locked" | "available" | "in_progress" | "completed";

/** GET /api/student/quest-road — returns hierarchical quest road data. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Determine active class
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
  const endPhase = membership.class.endPhase ?? ("PHASE_10" as Phase);
  const phaseOrder: Phase[] = ["PHASE_0", "PHASE_1", "PHASE_2", "PHASE_3", "PHASE_4", "PHASE_5", "PHASE_6", "PHASE_7", "PHASE_8", "PHASE_9", "PHASE_10"];
  const startIndex = phaseOrder.indexOf(startingPhase);
  const endIndex = phaseOrder.indexOf(endPhase);
  const activePhases = phaseOrder.slice(startIndex, endIndex + 1);

  // Fetch topics from starting phase to end phase, with lessons and PRACTICE problems
  const topics = await prisma.topic.findMany({
    where: {
      phase: { in: activePhases },
    },
    include: {
      lessons: {
        include: {
          problems: {
            where: { purpose: "PRACTICE" },
            select: { id: true },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ phase: "asc" }, { order: "asc" }],
  });

  // Fetch all submissions for this user
  const submissions = await prisma.submission.findMany({
    where: { userId },
    select: { problemId: true, isCorrect: true },
  });

  const problemStats = new Map<string, { attempted: boolean; correct: boolean }>();
  for (const sub of submissions) {
    const existing = problemStats.get(sub.problemId);
    if (existing) {
      existing.correct = existing.correct || sub.isCorrect;
    } else {
      problemStats.set(sub.problemId, { attempted: true, correct: sub.isCorrect });
    }
  }

  // Fetch student profile, class assignments, and coin transactions
  const [profile, classAssignments, coinTransactions] = await Promise.all([
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
  ]);

  // Build assignment map: lessonId -> { assignmentId, problemIds, passingGrade }
  // Filter by studentIds: null = all students, array = only those students
  const assignmentByLesson = new Map<string, { id: string; problemIds: string[]; passingGrade: number }>();
  for (const a of classAssignments) {
    const targets = a.studentIds as string[] | null;
    if (targets && !targets.includes(userId)) continue; // not assigned to this student
    const ids = (a.problemIds as string[] | null) ?? a.lesson.problems.map((p) => p.id);
    assignmentByLesson.set(a.lessonId, {
      id: a.id,
      problemIds: ids,
      passingGrade: a.passingGrade ?? ids.length, // default: all questions
    });
  }

  // Build coin maps: lessonId -> practice coins earned, assignmentId -> bonus earned
  const practiceCoins = new Map<string, number>();
  const assignmentBonusEarned = new Set<string>();
  for (const tx of coinTransactions) {
    if (tx.reason === "CORRECT_ANSWER" && tx.sourceId) {
      practiceCoins.set(tx.sourceId, (practiceCoins.get(tx.sourceId) ?? 0) + tx.amount);
    }
    if (tx.reason === "ASSIGNMENT_COMPLETE" && tx.sourceId) {
      assignmentBonusEarned.add(tx.sourceId);
    }
  }

  // Build hierarchical structure
  const byPhase = new Map<string, typeof topics>();
  for (const t of topics) {
    const list = byPhase.get(t.phase) || [];
    list.push(t);
    byPhase.set(t.phase, list);
  }

  const phases = activePhases.map((phase) => {
    const phaseTopics = byPhase.get(phase) || [];

    const questTopics = phaseTopics.map((topic) => {
      const lessons = topic.lessons.map((lesson) => {
        const problemIds = lesson.problems.map((p) => p.id);
        let attempted = 0;
        let correct = 0;
        for (const pid of problemIds) {
          const stat = problemStats.get(pid);
          if (stat) {
            attempted++;
            if (stat.correct) correct++;
          }
        }

        // Quiz (assignment) status for this lesson
        const assignment = assignmentByLesson.get(lesson.id);
        let quizCompleted = false;
        let quizCorrectCount = 0;
        if (assignment) {
          quizCorrectCount = assignment.problemIds.filter((pid) => problemStats.get(pid)?.correct).length;
          quizCompleted = quizCorrectCount >= assignment.passingGrade;
        }

        // Lesson is "completed" (passed) when quiz is passed
        // Practice progress is tracked separately
        let status: NodeStatus;
        if (quizCompleted) {
          status = "completed";
        } else if (attempted > 0 || (assignment && assignment.problemIds.some((pid) => problemStats.has(pid)))) {
          status = "in_progress";
        } else if (problemIds.length === 0 && !assignment) {
          status = "available";
        } else {
          status = "available";
        }

        // Coins (scaled by phase)
        const phaseMaxPractice = maxPracticeCoins(phase);
        const phaseQuizBonus = quizBonus(phase);
        const earnedPracticeCoins = Math.min(practiceCoins.get(lesson.id) ?? 0, phaseMaxPractice);
        const earnedQuizBonus = assignment && assignmentBonusEarned.has(assignment.id) ? phaseQuizBonus : 0;
        const totalPossibleCoins = phaseMaxPractice + (assignment ? phaseQuizBonus : 0);
        const earnedCoins = earnedPracticeCoins + earnedQuizBonus;

        return {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          status,
          problemCount: problemIds.length,
          completedProblems: correct,
          hasQuiz: !!assignment,
          quizCompleted,
          quizCorrect: quizCorrectCount,
          quizTotal: assignment?.problemIds.length ?? 0,
          passingGrade: assignment?.passingGrade ?? 0,
          quizProblemIds: assignment?.problemIds ?? [],
          coins: { earned: earnedCoins, total: totalPossibleCoins },
        };
      });

      const passedLessons = lessons.filter((l) => l.status === "completed").length;
      const hasProgress = lessons.some((l) => l.status === "in_progress" || l.status === "completed");

      let topicStatus: NodeStatus;
      if (lessons.length > 0 && passedLessons === lessons.length) {
        topicStatus = "completed";
      } else if (hasProgress) {
        topicStatus = "in_progress";
      } else {
        topicStatus = "available";
      }

      const topicCoinsEarned = lessons.reduce((s, l) => s + l.coins.earned, 0);
      const topicCoinsTotal = lessons.reduce((s, l) => s + l.coins.total, 0);

      return {
        id: topic.id,
        name: topic.name,
        order: topic.order,
        status: topicStatus,
        lessons,
        coins: { earned: topicCoinsEarned, total: topicCoinsTotal },
      };
    });

    const completedTopics = questTopics.filter((t) => t.status === "completed").length;
    const hasProgress = questTopics.some((t) => t.status === "in_progress" || t.status === "completed");

    let phaseStatus: NodeStatus;
    if (questTopics.length > 0 && completedTopics === questTopics.length) {
      phaseStatus = "completed";
    } else if (hasProgress) {
      phaseStatus = "in_progress";
    } else {
      phaseStatus = "available";
    }

    const phaseCoinsEarned = questTopics.reduce((s, t) => s + t.coins.earned, 0);
    const phaseCoinsTotal = questTopics.reduce((s, t) => s + t.coins.total, 0);

    return {
      phase,
      status: phaseStatus,
      topics: questTopics,
      coins: { earned: phaseCoinsEarned, total: phaseCoinsTotal },
    };
  });

  // Overall coins
  const totalCoinsEarned = phases.reduce((s, p) => s + p.coins.earned, 0);
  const totalCoinsPossible = phases.reduce((s, p) => s + p.coins.total, 0);

  // Final test: all phases completed
  const FINAL_TEST_BONUS = 50;
  const allPhasesCompleted = phases.every((p) => p.status === "completed");
  const finalTestEarned = assignmentBonusEarned.has("FINAL_TEST") ? FINAL_TEST_BONUS : 0;

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
    totalCoins: { earned: totalCoinsEarned + finalTestEarned, total: totalCoinsPossible + FINAL_TEST_BONUS },
    finalTest: {
      unlocked: allPhasesCompleted,
      completed: finalTestEarned > 0,
      coins: FINAL_TEST_BONUS,
    },
  });
}
