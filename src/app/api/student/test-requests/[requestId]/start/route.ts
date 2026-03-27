import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** POST — enter approval code and start the test */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;
  const { code } = await request.json();

  if (!code) return Response.json({ error: "Code required" }, { status: 400 });

  const testRequest = await prisma.testRequest.findUnique({
    where: { id: requestId },
    include: {
      test: { select: { problemIds: true, durationMinutes: true, title: true } },
    },
  });

  if (!testRequest || testRequest.studentId !== session.user.id) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  // Already started — allow resume, but check if time expired
  if (testRequest.status === "STARTED") {
    if (
      testRequest.startedAt &&
      testRequest.test.durationMinutes &&
      new Date() > new Date(testRequest.startedAt.getTime() + testRequest.test.durationMinutes * 60 * 1000)
    ) {
      // Time expired — auto-complete with score 0
      await prisma.testRequest.update({
        where: { id: requestId },
        data: { status: "COMPLETED", completedAt: new Date(), score: 0 },
      });
      return Response.json({ error: "Time expired", expired: true }, { status: 410 });
    }

    const problemIds = testRequest.test.problemIds as string[];
    const problems = await prisma.problem.findMany({
      where: { id: { in: problemIds } },
      select: { id: true, type: true, difficulty: true, content: true },
    });

    return Response.json({
      title: testRequest.test.title,
      durationMinutes: testRequest.test.durationMinutes,
      startedAt: testRequest.startedAt?.toISOString() ?? new Date().toISOString(),
      problems,
    });
  }

  // Already completed
  if (testRequest.status === "COMPLETED") {
    return Response.json({ error: "Test already completed", expired: true }, { status: 410 });
  }

  if (testRequest.status !== "APPROVED") {
    return Response.json({ error: "Request not approved yet" }, { status: 400 });
  }

  if (testRequest.approvalCode !== code.toUpperCase()) {
    return Response.json({ error: "Invalid code" }, { status: 403 });
  }

  const now = new Date();
  await prisma.testRequest.update({
    where: { id: requestId },
    data: { status: "STARTED", codeUsedAt: now, startedAt: now },
  });

  // Fetch the actual problems
  const problemIds = testRequest.test.problemIds as string[];
  const problems = await prisma.problem.findMany({
    where: { id: { in: problemIds } },
    select: { id: true, type: true, difficulty: true, content: true },
  });

  return Response.json({
    title: testRequest.test.title,
    durationMinutes: testRequest.test.durationMinutes,
    startedAt: now.toISOString(),
    problems,
  });
}
