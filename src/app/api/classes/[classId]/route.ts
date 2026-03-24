import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ classId: string }> };

/** GET /api/classes/:id — get class details with analytics (teacher view). */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;

  // Verify membership
  const membership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId, userId: session.user.id } },
  });

  if (!membership) {
    return Response.json({ error: "Not a member" }, { status: 403 });
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
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
  });

  if (!cls) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // For teachers, include aggregate analytics
  let analytics = null;
  if (membership.role === "TEACHER") {
    const studentIds = cls.members
      .filter((m) => m.role === "STUDENT")
      .map((m) => m.userId);

    if (studentIds.length > 0) {
      const [totalSubmissions, correctSubmissions, recentActivity] = await Promise.all([
        prisma.submission.count({
          where: { userId: { in: studentIds } },
        }),
        prisma.submission.count({
          where: { userId: { in: studentIds }, isCorrect: true },
        }),
        prisma.submission.groupBy({
          by: ["userId"],
          where: {
            userId: { in: studentIds },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
          _count: { _all: true },
        }),
      ]);

      const profiles = cls.members
        .filter((m) => m.role === "STUDENT" && m.user.studentProfile)
        .map((m) => m.user.studentProfile!);

      const avgXP = profiles.length > 0
        ? Math.round(profiles.reduce((s, p) => s + p.xp, 0) / profiles.length)
        : 0;
      const avgLevel = profiles.length > 0
        ? Math.round(profiles.reduce((s, p) => s + p.level, 0) / profiles.length)
        : 0;
      const avgStreak = profiles.length > 0
        ? Math.round(profiles.reduce((s, p) => s + p.streak, 0) / profiles.length)
        : 0;

      analytics = {
        studentCount: studentIds.length,
        totalSubmissions,
        correctSubmissions,
        accuracy: totalSubmissions > 0 ? Math.round((correctSubmissions / totalSubmissions) * 100) : 0,
        activeThisWeek: recentActivity.length,
        averageXP: avgXP,
        averageLevel: avgLevel,
        averageStreak: avgStreak,
      };
    }
  }

  return Response.json({ class: cls, analytics });
}

/** DELETE /api/classes/:id — remove a student from class (teacher) or leave (student). */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { classId } = await params;
  const { searchParams } = request.nextUrl;
  const targetUserId = searchParams.get("userId") || session.user.id;

  // Verify caller is a teacher in this class or is removing themselves
  const callerMembership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId, userId: session.user.id } },
  });

  if (!callerMembership) {
    return Response.json({ error: "Not a member" }, { status: 403 });
  }

  if (targetUserId !== session.user.id && callerMembership.role !== "TEACHER") {
    return Response.json({ error: "Only teachers can remove students" }, { status: 403 });
  }

  await prisma.classMembership.delete({
    where: { classId_userId: { classId, userId: targetUserId } },
  });

  return Response.json({ success: true });
}
