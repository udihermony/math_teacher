import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { PHASE_LABELS, getContentRequestLabel, getTeacherContentRequestHref } from "@/modules/content-requests";

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
  const [topicCount, lessonCount, practiceCount, assignmentCount, contentRequests, activeTests, practiceLessons, quizAssignments] = await Promise.all([
    prisma.topic.count(),
    prisma.lesson.count(),
    prisma.problem.count({ where: { purpose: "PRACTICE" } }),
    prisma.problem.count({ where: { purpose: "ASSIGNMENT" } }),
    prisma.contentRequest.findMany({
      where: { classId: { in: classIds } },
      include: {
        class: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true } },
        lesson: { select: { id: true, title: true, deepDive: true } },
        topic: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.test.findMany({
      where: {
        classId: { in: classIds },
        status: { not: "ARCHIVED" },
      },
      select: { classId: true, scope: true, scopeId: true },
    }),
    prisma.problem.findMany({
      where: {
        purpose: "PRACTICE",
        lessonId: { not: null },
      },
      select: { lessonId: true },
      distinct: ["lessonId"],
    }),
    prisma.classAssignment.findMany({
      where: { classId: { in: classIds } },
      select: { classId: true, lessonId: true },
    }),
  ]);

  const testKeySet = new Set(activeTests.map((test) => `${test.classId}:${test.scope}:${test.scopeId}`));
  const practiceLessonIdSet = new Set(practiceLessons.map((problem) => problem.lessonId).filter(Boolean));
  const quizAssignmentKeySet = new Set(quizAssignments.map((assignment) => `${assignment.classId}:${assignment.lessonId}`));

  const pendingContentRequests = contentRequests
    .filter((request) => {
      if (request.type === "PRACTICE") {
        return !!request.lessonId && !practiceLessonIdSet.has(request.lessonId);
      }
      if (request.type === "LESSON_QUIZ") {
        return !!request.lessonId && !quizAssignmentKeySet.has(`${request.classId}:${request.lessonId}`);
      }
      if (request.type === "DEEP_DIVE") {
        return !!request.lesson && !request.lesson.deepDive;
      }
      if (request.type === "TOPIC_TEST" && request.topicId) {
        return !testKeySet.has(`${request.classId}:TOPIC:${request.topicId}`);
      }
      if (request.type === "PHASE_TEST" && request.phase) {
        return !testKeySet.has(`${request.classId}:PHASE:${request.phase}`);
      }
      return false;
    })
    .map((request) => {
      const targetLabel = request.type === "PRACTICE" || request.type === "LESSON_QUIZ" || request.type === "DEEP_DIVE"
        ? request.lesson?.title ?? "Lesson"
        : request.type === "TOPIC_TEST"
        ? request.topic?.name ?? "Topic"
        : request.phase
        ? PHASE_LABELS[request.phase]
        : "Phase";

      return {
        id: request.id,
        type: request.type,
        label: getContentRequestLabel(request.type),
        classId: request.classId,
        className: request.class.name,
        requestedBy: request.requestedBy.name,
        requestedAt: request.createdAt.toISOString(),
        targetLabel,
        href: getTeacherContentRequestHref({
          classId: request.classId,
          type: request.type,
          lessonId: request.lessonId,
          topicId: request.topicId,
          phase: request.phase,
        }),
      };
    });

  return Response.json({
    classes: classesData,
    contentStats: {
      totalTopics: topicCount,
      totalLessons: lessonCount,
      totalProblems: practiceCount + assignmentCount,
      practiceProblems: practiceCount,
      assignmentProblems: assignmentCount,
    },
    contentRequests: pendingContentRequests,
  });
}
