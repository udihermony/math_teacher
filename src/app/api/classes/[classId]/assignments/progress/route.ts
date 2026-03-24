import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** GET — completion progress for all assignments in a class */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is a member
  const membership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId, userId: session.user.id } },
  });
  if (!membership) {
    return Response.json({ error: "Not a member" }, { status: 403 });
  }

  // Get assignments with lesson problem IDs
  const assignments = await prisma.classAssignment.findMany({
    where: { classId },
    include: {
      lesson: {
        include: { problems: { select: { id: true } } },
      },
    },
  });

  // Get student IDs in the class
  const studentMembers = await prisma.classMembership.findMany({
    where: { classId, role: "STUDENT" },
    select: { userId: true, user: { select: { name: true } } },
  });
  const studentIds = studentMembers.map((m) => m.userId);

  // Get all submissions for these students on problems in assigned lessons
  const allProblemIds = assignments.flatMap((a) => {
    // Use assignment-specific problemIds if set, otherwise all lesson problems
    const assignedIds = a.problemIds as string[] | null;
    return assignedIds && assignedIds.length > 0
      ? assignedIds
      : a.lesson.problems.map((p) => p.id);
  });

  const submissions = await prisma.submission.findMany({
    where: {
      userId: { in: studentIds },
      problemId: { in: allProblemIds },
    },
    select: { userId: true, problemId: true, isCorrect: true },
  });

  // Build lookup: userId+problemId → best result
  const subMap = new Map<string, boolean>();
  for (const sub of submissions) {
    const key = `${sub.userId}:${sub.problemId}`;
    const existing = subMap.get(key);
    if (existing === undefined || (!existing && sub.isCorrect)) {
      subMap.set(key, sub.isCorrect);
    }
  }

  // Build progress per assignment
  const progress = assignments.map((a) => {
    const assignedIds = a.problemIds as string[] | null;
    const problemIds = assignedIds && assignedIds.length > 0
      ? assignedIds
      : a.lesson.problems.map((p) => p.id);
    const totalProblems = problemIds.length;

    // Per-student progress
    const students = studentMembers.map((m) => {
      let attempted = 0;
      let correct = 0;
      for (const pid of problemIds) {
        const key = `${m.userId}:${pid}`;
        if (subMap.has(key)) {
          attempted++;
          if (subMap.get(key)) correct++;
        }
      }
      return {
        userId: m.userId,
        name: m.user.name,
        attempted,
        correct,
        totalProblems,
        completed: attempted >= totalProblems,
      };
    });

    const completedCount = students.filter((s) => s.completed).length;

    return {
      assignmentId: a.id,
      lessonId: a.lessonId,
      totalProblems,
      studentCount: students.length,
      completedCount,
      students,
    };
  });

  return Response.json({ progress });
}
