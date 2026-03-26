import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import type { Phase } from "@/generated/prisma/client";
import { maxPracticeCoins, quizBonus } from "@/modules/gamification/coin-calculator";

type NodeStatus = "locked" | "available" | "in_progress" | "completed";

/** GET /api/teacher/student-progress?classId=X&studentId=Y */
export async function GET(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classId = request.nextUrl.searchParams.get("classId");
  const studentId = request.nextUrl.searchParams.get("studentId");
  if (!classId || !studentId) {
    return Response.json({ error: "classId and studentId required" }, { status: 400 });
  }

  // Verify teacher is in this class
  const teacherMembership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId, userId: session.user.id } },
  });
  if (!teacherMembership || teacherMembership.role !== "TEACHER") {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  // Verify student is in this class
  const studentMembership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId, userId: studentId } },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!studentMembership || studentMembership.role !== "STUDENT") {
    return Response.json({ error: "Student not found in class" }, { status: 404 });
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { phase: true, endPhase: true },
  });
  if (!cls) {
    return Response.json({ error: "Class not found" }, { status: 404 });
  }

  const phaseOrder: Phase[] = ["FOUNDATIONS", "EXPLORER", "BUILDER", "CHALLENGER", "IB_READY"];
  const startIndex = phaseOrder.indexOf(cls.phase);
  const endIndex = phaseOrder.indexOf(cls.endPhase ?? "IB_READY");
  const activePhases = phaseOrder.slice(startIndex, endIndex + 1);

  // Fetch topics with lessons and PRACTICE problems
  const topics = await prisma.topic.findMany({
    where: { phase: { in: activePhases } },
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

  // Fetch student submissions
  const submissions = await prisma.submission.findMany({
    where: { userId: studentId },
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

  // Fetch profile, assignments, coins
  const [profile, classAssignments, coinTransactions] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: { coins: true, xp: true, level: true, streak: true },
    }),
    prisma.classAssignment.findMany({
      where: { classId },
      include: { lesson: { include: { problems: { select: { id: true } } } } },
    }),
    prisma.coinTransaction.findMany({
      where: { userId: studentId },
      select: { reason: true, sourceId: true, amount: true },
    }),
  ]);

  // Filter assignments by studentIds
  const assignmentByLesson = new Map<string, { id: string; problemIds: string[]; passingGrade: number }>();
  for (const a of classAssignments) {
    const targets = a.studentIds as string[] | null;
    if (targets && !targets.includes(studentId)) continue;
    const ids = (a.problemIds as string[] | null) ?? a.lesson.problems.map((p) => p.id);
    assignmentByLesson.set(a.lessonId, {
      id: a.id,
      problemIds: ids,
      passingGrade: a.passingGrade ?? ids.length,
    });
  }

  // Coin maps
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

  // Build phases
  const byPhase = new Map<string, typeof topics>();
  for (const t of topics) {
    const list = byPhase.get(t.phase) || [];
    list.push(t);
    byPhase.set(t.phase, list);
  }

  const phases = activePhases.map((phase) => {
    const phaseTopics = (byPhase.get(phase) || []).map((topic) => {
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

        const assignment = assignmentByLesson.get(lesson.id);
        let quizCompleted = false;
        if (assignment) {
          const quizCorrect = assignment.problemIds.filter((pid) => problemStats.get(pid)?.correct).length;
          quizCompleted = quizCorrect >= assignment.passingGrade;
        }

        // Lesson is "completed" (passed) when quiz is passed
        let status: NodeStatus;
        if (quizCompleted) {
          status = "completed";
        } else if (attempted > 0 || (assignment && assignment.problemIds.some((pid) => problemStats.has(pid)))) {
          status = "in_progress";
        } else {
          status = "available";
        }

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
          coins: { earned: earnedCoins, total: totalPossibleCoins },
        };
      });

      const passedLessons = lessons.filter((l) => l.status === "completed").length;
      const hasProgress = lessons.some((l) => l.status === "in_progress" || l.status === "completed");
      const topicCoinsEarned = lessons.reduce((s, l) => s + l.coins.earned, 0);
      const topicCoinsTotal = lessons.reduce((s, l) => s + l.coins.total, 0);

      let topicStatus: NodeStatus;
      if (lessons.length > 0 && passedLessons === lessons.length) topicStatus = "completed";
      else if (hasProgress) topicStatus = "in_progress";
      else topicStatus = "available";

      return {
        id: topic.id, name: topic.name, order: topic.order,
        status: topicStatus, lessons,
        coins: { earned: topicCoinsEarned, total: topicCoinsTotal },
      };
    });

    const completedTopics = phaseTopics.filter((t) => t.status === "completed").length;
    const hasProgress = phaseTopics.some((t) => t.status === "in_progress" || t.status === "completed");
    const phaseCoinsEarned = phaseTopics.reduce((s, t) => s + t.coins.earned, 0);
    const phaseCoinsTotal = phaseTopics.reduce((s, t) => s + t.coins.total, 0);

    let phaseStatus: NodeStatus;
    if (phaseTopics.length > 0 && completedTopics === phaseTopics.length) phaseStatus = "completed";
    else if (hasProgress) phaseStatus = "in_progress";
    else phaseStatus = "available";

    return { phase, status: phaseStatus, topics: phaseTopics, coins: { earned: phaseCoinsEarned, total: phaseCoinsTotal } };
  });

  const totalCoinsEarned = phases.reduce((s, p) => s + p.coins.earned, 0);
  const totalCoinsPossible = phases.reduce((s, p) => s + p.coins.total, 0);

  return Response.json({
    student: {
      id: studentId,
      name: studentMembership.user.name,
      email: studentMembership.user.email,
    },
    profile: {
      coins: profile?.coins ?? 0,
      xp: profile?.xp ?? 0,
      level: profile?.level ?? 1,
      streak: profile?.streak ?? 0,
    },
    phases,
    totalCoins: { earned: totalCoinsEarned, total: totalCoinsPossible },
  });
}
