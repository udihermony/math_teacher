import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardClient, ClassInfo } from "./DashboardClient";

export interface PendingAssignment {
  id: string;
  lessonId: string;
  lessonTitle: string;
  topicName: string;
  totalProblems: number;
  attempted: number;
  correct: number;
  dueDate: string | null;
  className: string;
  assignedProblemIds: string[];
}

export default async function StudentDashboard() {
  const session = await auth();
  const userId = session?.user?.id;

  let currentPhase = "FOUNDATIONS";
  let coins = 0;
  let xp = 0;
  let level = 1;
  let streak = 0;
  let totalLessons = 0;
  let completedLessons = 0;
  let classes: ClassInfo[] = [];
  let pendingAssignments: PendingAssignment[] = [];

  if (userId) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { currentPhase: true, coins: true, xp: true, level: true, streak: true },
    });
    currentPhase = profile?.currentPhase ?? "FOUNDATIONS";
    coins = profile?.coins ?? 0;
    xp = profile?.xp ?? 0;
    level = profile?.level ?? 1;
    streak = profile?.streak ?? 0;

    // Count total/completed lessons (practice problems only)
    const topics = await prisma.topic.findMany({
      include: {
        lessons: {
          include: { problems: { where: { purpose: "PRACTICE" }, select: { id: true } } },
        },
      },
    });

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

    for (const topic of topics) {
      for (const lesson of topic.lessons) {
        if (lesson.problems.length === 0) continue;
        totalLessons++;
        const allCorrect = lesson.problems.every((p) => problemStats.get(p.id)?.correct);
        if (allCorrect) completedLessons++;
      }
    }

    // Fetch classes
    const memberships = await prisma.classMembership.findMany({
      where: { userId, role: "STUDENT" },
      include: {
        class: {
          include: {
            members: { where: { role: "TEACHER" }, include: { user: { select: { name: true } } } },
            assignments: {
              include: {
                lesson: {
                  include: {
                    topic: { select: { name: true } },
                    problems: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const m of memberships) {
      const teacher = m.class.members[0]?.user?.name ?? "Unknown";
      let assignmentCount = 0;
      let completedCount = 0;

      for (const a of m.class.assignments) {
        assignmentCount++;
        const assignedIds = (a.problemIds as string[] | null) ?? a.lesson.problems.map((p) => p.id);

        let attempted = 0;
        let correct = 0;
        for (const pid of assignedIds) {
          const stat = problemStats.get(pid);
          if (stat) {
            attempted++;
            if (stat.correct) correct++;
          }
        }

        const isComplete = attempted >= assignedIds.length;
        if (isComplete) completedCount++;

        // Add to pending if not complete
        if (!isComplete) {
          pendingAssignments.push({
            id: a.id,
            lessonId: a.lesson.id,
            lessonTitle: a.lesson.title,
            topicName: a.lesson.topic.name,
            totalProblems: assignedIds.length,
            attempted,
            correct,
            dueDate: a.dueDate?.toISOString() ?? null,
            className: m.class.name,
            assignedProblemIds: assignedIds,
          });
        }
      }

      classes.push({
        id: m.class.id,
        name: m.class.name,
        phase: m.class.phase,
        teacherName: teacher,
        assignmentCount,
        completedCount,
      });
    }
  }

  return (
    <DashboardClient
      userName={session?.user?.name ?? "Explorer"}
      currentPhase={currentPhase}
      coins={coins}
      xp={xp}
      level={level}
      streak={streak}
      totalLessons={totalLessons}
      completedLessons={completedLessons}
      classes={classes}
      pendingAssignments={pendingAssignments}
    />
  );
}
