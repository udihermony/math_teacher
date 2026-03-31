import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { validateAnswer } from "@/modules/problems/validators/expression-parser";
import { testTopicBonus, testPhaseBonus } from "@/modules/gamification/coin-calculator";

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
      test: { select: { problemIds: true, durationMinutes: true, passingGrade: true, questionCount: true, scope: true, scopeId: true } },
    },
  });

  if (!testRequest || testRequest.studentId !== session.user.id) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  if (testRequest.status === "COMPLETED") {
    return Response.json({ error: "Test already submitted", score: testRequest.score }, { status: 409 });
  }

  if (testRequest.status !== "STARTED") {
    return Response.json({ error: "Test not in progress" }, { status: 400 });
  }

  // Server-side time enforcement — allow generous grace period for network latency
  // but flag if way past deadline (5 min grace)
  const isOvertime = testRequest.startedAt && testRequest.test.durationMinutes
    ? new Date() > new Date(testRequest.startedAt.getTime() + testRequest.test.durationMinutes * 60 * 1000 + 5 * 60 * 1000)
    : false;

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
      isCorrect = answer.selectedIndex != null && (answer.selectedIndex as number) === (content.correctIndex as number);
    } else if (problem.type === "MULTI_SELECT") {
      const selectedIndices = Array.isArray(answer.selectedIndices)
        ? [...new Set((answer.selectedIndices as number[]).map(Number))].sort((a, b) => a - b)
        : [];
      const correctIndices = Array.isArray(content.correctIndices)
        ? [...new Set((content.correctIndices as number[]).map(Number))].sort((a, b) => a - b)
        : [];
      isCorrect =
        selectedIndices.length === correctIndices.length &&
        selectedIndices.every((value, index) => value === correctIndices[index]);
    } else if (problem.type === "FREE_INPUT") {
      const studentAnswer = (answer.value as string) ?? "";
      const correctAnswer = (content.correctAnswer as string) ?? "";
      isCorrect = studentAnswer !== "" && correctAnswer !== "" && validateAnswer(studentAnswer, correctAnswer);
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

  const passingGrade = testRequest.test.passingGrade ?? testRequest.test.questionCount;
  const passed = score >= passingGrade;

  // Award coins for passing tests
  let coinsAwarded = 0;
  if (passed && testRequest.test.scope && testRequest.test.scopeId) {
    let coinAmount = 0;
    let reason: "TEST_TOPIC_PASS" | "TEST_PHASE_PASS" | null = null;

    if (testRequest.test.scope === "TOPIC") {
      const topic = await prisma.topic.findUnique({
        where: { id: testRequest.test.scopeId },
        select: { phase: true },
      });
      if (topic) {
        coinAmount = testTopicBonus(topic.phase);
        reason = "TEST_TOPIC_PASS";
      }
    } else if (testRequest.test.scope === "PHASE") {
      coinAmount = testPhaseBonus(testRequest.test.scopeId);
      reason = "TEST_PHASE_PASS";
    }

    if (coinAmount > 0 && reason) {
      // Idempotency: check not already awarded
      const existing = await prisma.coinTransaction.findFirst({
        where: { userId: session.user.id, reason, sourceId: requestId },
      });
      if (!existing) {
        await prisma.$transaction([
          prisma.coinTransaction.create({
            data: { userId: session.user.id, amount: coinAmount, reason, sourceId: requestId },
          }),
          prisma.studentProfile.update({
            where: { userId: session.user.id },
            data: { coins: { increment: coinAmount } },
          }),
        ]);
        coinsAwarded = coinAmount;
      }
    }
  }

  return Response.json({
    score,
    total: problemIds.length,
    passingGrade,
    passed,
    results,
    overtime: isOvertime,
    coinsAwarded,
  });
}
