import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ClassDashboard } from "./ClassDashboard";

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
  note: string | null;
}

export default async function StudentDashboard() {
  const session = await auth();
  const userId = session?.user?.id;

  let coins = 0;
  let xp = 0;
  let level = 1;
  let streak = 0;
  let totalLessons = 0;
  let completedLessons = 0;
  let className: string | null = null;
  let teacherName: string | null = null;
  let pendingAssignments: PendingAssignment[] = [];
  let hasClass = false;

  if (userId) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { coins: true, xp: true, level: true, streak: true },
    });
    coins = profile?.coins ?? 0;
    xp = profile?.xp ?? 0;
    level = profile?.level ?? 1;
    streak = profile?.streak ?? 0;

    // Check class membership
    const membership = await prisma.classMembership.findFirst({
      where: { userId, role: "STUDENT" },
      include: {
        class: {
          include: {
            members: {
              where: { role: "TEACHER" },
              include: { user: { select: { name: true } } },
            },
            assignments: {
              include: {
                lesson: {
                  include: {
                    topic: { select: { name: true } },
                    problems: { where: { purpose: "PRACTICE" }, select: { id: true } },
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (membership) {
      hasClass = true;
      className = membership.class.name;
      teacherName = membership.class.members[0]?.user?.name ?? null;

      // Get submissions for progress tracking
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

      // Count lessons and build pending assignments
      for (const a of membership.class.assignments) {
        // Filter by studentIds: null = all, array = only listed students
        const targets = (a as { studentIds?: string[] | null }).studentIds;
        if (targets && !targets.includes(userId)) continue;

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

        totalLessons++;
        if (correct >= assignedIds.length) {
          completedLessons++;
        } else {
          pendingAssignments.push({
            id: a.id,
            lessonId: a.lesson.id,
            lessonTitle: a.lesson.title,
            topicName: a.lesson.topic.name,
            totalProblems: assignedIds.length,
            attempted,
            correct,
            dueDate: a.dueDate?.toISOString() ?? null,
            className: membership.class.name,
            assignedProblemIds: assignedIds,
            note: a.note,
          });
        }
      }
    }
  }

  return (
    <ClassDashboard
      userName={session?.user?.name ?? "Explorer"}
      hasClass={hasClass}
      className={className}
      teacherName={teacherName}
      coins={coins}
      xp={xp}
      level={level}
      streak={streak}
      totalAssignments={totalLessons}
      completedAssignments={completedLessons}
      pendingAssignments={pendingAssignments}
    />
  );
}
