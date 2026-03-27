import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** GET — list available tests for student's active class + request statuses */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { activeClassId: true },
  });

  // Get active class or first class
  let classId = profile?.activeClassId;
  if (!classId) {
    const membership = await prisma.classMembership.findFirst({
      where: { userId, role: "STUDENT" },
      select: { classId: true },
    });
    classId = membership?.classId ?? null;
  }

  if (!classId) return Response.json({ tests: [] });

  const tests = await prisma.test.findMany({
    where: { classId, status: "ACTIVE" },
    include: {
      requests: {
        where: { studentId: userId },
        select: { id: true, status: true, approvalCode: true, startedAt: true, completedAt: true, score: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    tests: tests.map((t) => ({
      id: t.id,
      title: t.title,
      scope: t.scope,
      questionCount: t.questionCount,
      durationMinutes: t.durationMinutes,
      request: t.requests[0] ?? null,
    })),
  });
}

/** POST — request to take a test */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { testId } = await request.json();
  if (!testId) return Response.json({ error: "testId required" }, { status: 400 });

  const userId = session.user.id;

  // Verify test exists and student is in the class
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { classId: true, status: true },
  });

  if (!test || test.status !== "ACTIVE") {
    return Response.json({ error: "Test not found" }, { status: 404 });
  }

  const membership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId: test.classId, userId } },
  });

  if (!membership) {
    return Response.json({ error: "Not a member of this class" }, { status: 403 });
  }

  // Check for existing request
  const existing = await prisma.testRequest.findUnique({
    where: { testId_studentId: { testId, studentId: userId } },
  });

  if (existing) {
    return Response.json({ error: "Already requested", request: existing }, { status: 409 });
  }

  const testRequest = await prisma.testRequest.create({
    data: { testId, studentId: userId },
  });

  return Response.json({ request: testRequest }, { status: 201 });
}
