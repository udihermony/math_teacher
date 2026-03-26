import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

export async function GET() {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get all classes where this teacher is a member
  const teacherMemberships = await prisma.classMembership.findMany({
    where: { userId, role: "TEACHER" },
    select: { classId: true },
  });

  const classIds = teacherMemberships.map((m) => m.classId);

  // Fetch classes with members
  const classes = await prisma.class.findMany({
    where: { id: { in: classIds } },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              studentProfile: {
                select: { xp: true, level: true, streak: true, currentPhase: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Collect all student IDs across classes
  const classStudentMap = new Map<string, string[]>();
  const allStudentIds: string[] = [];

  for (const cls of classes) {
    const studentIds = cls.members
      .filter((m) => m.role === "STUDENT")
      .map((m) => m.userId);
    classStudentMap.set(cls.id, studentIds);
    allStudentIds.push(...studentIds);
  }

  const uniqueStudentIds = [...new Set(allStudentIds)];

  // Batch query: per-student submission stats
  const [perStudentTotal, perStudentCorrect, recentActivity, lastSubmissions] = await Promise.all([
    uniqueStudentIds.length > 0
      ? prisma.submission.groupBy({
          by: ["userId"],
          where: { userId: { in: uniqueStudentIds } },
          _count: { _all: true },
        })
      : [],
    uniqueStudentIds.length > 0
      ? prisma.submission.groupBy({
          by: ["userId"],
          where: { userId: { in: uniqueStudentIds }, isCorrect: true },
          _count: { _all: true },
        })
      : [],
    uniqueStudentIds.length > 0
      ? prisma.submission.groupBy({
          by: ["userId"],
          where: {
            userId: { in: uniqueStudentIds },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          _count: { _all: true },
        })
      : [],
    // Get last submission date per student
    uniqueStudentIds.length > 0
      ? prisma.submission.groupBy({
          by: ["userId"],
          where: { userId: { in: uniqueStudentIds } },
          _max: { createdAt: true },
        })
      : [],
  ]);

  // Build lookup maps
  const totalByUser = new Map(perStudentTotal.map((r) => [r.userId, r._count._all]));
  const correctByUser = new Map(perStudentCorrect.map((r) => [r.userId, r._count._all]));
  const activeUserIds = new Set(recentActivity.map((r) => r.userId));
  const lastActiveByUser = new Map(lastSubmissions.map((r) => [r.userId, r._max.createdAt]));

  // Get assignments for all classes
  const assignments = await prisma.classAssignment.findMany({
    where: { classId: { in: classIds } },
    include: {
      lesson: { select: { title: true } },
    },
  });

  // For assignment completion: check which students solved all problems per assignment
  const assignmentProblemIds = assignments.flatMap(
    (a) => (a.problemIds as string[] | null) ?? []
  );

  const correctSubmissions = assignmentProblemIds.length > 0
    ? await prisma.submission.findMany({
        where: {
          userId: { in: uniqueStudentIds },
          problemId: { in: assignmentProblemIds },
          isCorrect: true,
        },
        select: { userId: true, problemId: true },
        distinct: ["userId", "problemId"],
      })
    : [];

  // Build set of "userId:problemId" for quick lookup
  const solvedSet = new Set(correctSubmissions.map((s) => `${s.userId}:${s.problemId}`));

  // Build per-class response
  const classesData = classes.map((cls) => {
    const studentIds = classStudentMap.get(cls.id) ?? [];
    const students = cls.members
      .filter((m) => m.role === "STUDENT")
      .map((m) => {
        const total = totalByUser.get(m.userId) ?? 0;
        const correct = correctByUser.get(m.userId) ?? 0;
        return {
          userId: m.userId,
          name: m.user.name ?? "Unknown",
          email: m.user.email ?? "",
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
          totalSubmissions: total,
          lastActiveDate: lastActiveByUser.get(m.userId)?.toISOString() ?? null,
          level: m.user.studentProfile?.level ?? 0,
          streak: m.user.studentProfile?.streak ?? 0,
          xp: m.user.studentProfile?.xp ?? 0,
          currentPhase: m.user.studentProfile?.currentPhase ?? "PHASE_0",
        };
      });

    // Class-level analytics
    const totalSubs = studentIds.reduce((s, id) => s + (totalByUser.get(id) ?? 0), 0);
    const correctSubs = studentIds.reduce((s, id) => s + (correctByUser.get(id) ?? 0), 0);
    const activeCount = studentIds.filter((id) => activeUserIds.has(id)).length;
    const profiles = students.filter((s) => s.level > 0);
    const avgLevel = profiles.length > 0
      ? Math.round(profiles.reduce((s, p) => s + p.level, 0) / profiles.length)
      : 0;
    const avgStreak = profiles.length > 0
      ? Math.round(profiles.reduce((s, p) => s + p.streak, 0) / profiles.length)
      : 0;

    // Assignments for this class
    const classAssignments = assignments.filter((a) => a.classId === cls.id);
    const assignmentSummaries = classAssignments.map((a) => {
      const pIds = (a.problemIds as string[] | null) ?? [];
      const targets = (a.studentIds as string[] | null) ?? studentIds;
      const passingGrade = a.passingGrade ?? pIds.length;
      let completedStudents = 0;
      for (const sid of targets) {
        const solved = pIds.filter((pid) => solvedSet.has(`${sid}:${pid}`)).length;
        if (solved >= passingGrade) completedStudents++;
      }
      return {
        id: a.id,
        lessonTitle: a.lesson.title,
        totalStudents: targets.length,
        completedStudents,
        dueDate: a.dueDate?.toISOString() ?? null,
      };
    });

    const pendingAssignments = assignmentSummaries.filter(
      (a) => a.completedStudents < a.totalStudents
    ).length;

    return {
      id: cls.id,
      name: cls.name,
      code: cls.code,
      phase: cls.phase,
      analytics: {
        studentCount: studentIds.length,
        totalSubmissions: totalSubs,
        correctSubmissions: correctSubs,
        accuracy: totalSubs > 0 ? Math.round((correctSubs / totalSubs) * 100) : 0,
        activeThisWeek: activeCount,
        averageLevel: avgLevel,
        averageStreak: avgStreak,
      },
      students,
      assignments: {
        total: classAssignments.length,
        pendingCount: pendingAssignments,
        items: assignmentSummaries,
      },
    };
  });

  // Content stats (global)
  const [topicCount, lessonCount, practiceCount, assignmentCount] = await Promise.all([
    prisma.topic.count(),
    prisma.lesson.count(),
    prisma.problem.count({ where: { purpose: "PRACTICE" } }),
    prisma.problem.count({ where: { purpose: "ASSIGNMENT" } }),
  ]);

  return Response.json({
    classes: classesData,
    contentStats: {
      totalTopics: topicCount,
      totalLessons: lessonCount,
      totalProblems: practiceCount + assignmentCount,
      practiceProblems: practiceCount,
      assignmentProblems: assignmentCount,
    },
  });
}
