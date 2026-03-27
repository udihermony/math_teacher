import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateAnswer } from "@/modules/problems/validators/expression-parser";

/** POST — submit test answers */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;
  const { answers } = await request.json() as {
    answers: Array<{ problemId: string; answer: Record<string, unknown> }>;
  };

  const testRequest = await prisma.testRequest.findUnique({
    where: { id: requestId },
    include: {
      test: { select: { problemIds: true, durationMinutes: true } },
    },
  });

  if (!testRequest || testRequest.studentId !== session.user.id) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  if (testRequest.status !== "STARTED") {
    return Response.json({ error: "Test not in progress" }, { status: 400 });
  }

  // Server-side time enforcement
  if (testRequest.startedAt && testRequest.test.durationMinutes) {
    const deadline = new Date(testRequest.startedAt.getTime() + testRequest.test.durationMinutes * 60 * 1000 + 30000); // 30s grace
    if (new Date() > deadline) {
      return Response.json({ error: "Time expired" }, { status: 400 });
    }
  }

  // Grade each answer
  const problemIds = testRequest.test.problemIds as string[];
  const problems = await prisma.problem.findMany({
    where: { id: { in: problemIds } },
  });
  const problemMap = new Map(problems.map((p) => [p.id, p]));

  let score = 0;
  const results: Array<{ problemId: string; isCorrect: boolean }> = [];

  for (const { problemId, answer } of answers) {
    const problem = problemMap.get(problemId);
    if (!problem) continue;

    const content = problem.content as Record<string, unknown>;
    let isCorrect = false;

    if (problem.type === "MULTIPLE_CHOICE") {
      isCorrect = (answer.selectedIndex as number) === (content.correctIndex as number);
    } else if (problem.type === "FREE_INPUT") {
      isCorrect = validateAnswer(answer.value as string, content.correctAnswer as string);
    }

    if (isCorrect) score++;
    results.push({ problemId, isCorrect });

    // Create submission record
    await prisma.submission.create({
      data: {
        userId: session.user.id,
        problemId,
        answer: answer as never,
        isCorrect,
      },
    });
  }

  // Mark test as completed
  await prisma.testRequest.update({
    where: { id: requestId },
    data: { status: "COMPLETED", completedAt: new Date(), score },
  });

  return Response.json({
    score,
    total: problemIds.length,
    results,
  });
}
