import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

type RouteParams = { params: Promise<{ challengeId: string }> };

/** GET /api/challenges/:id — get challenge details with submissions. */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { challengeId } = await params;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      creator: { select: { id: true, name: true } },
      opponent: { select: { id: true, name: true } },
      submissions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!challenge) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Only participants can view
  if (challenge.creatorId !== session.user.id && challenge.opponentId !== session.user.id) {
    return Response.json({ error: "Not a participant" }, { status: 403 });
  }

  // Get the actual problems
  const problemIds = challenge.problems as string[];
  const problems = await prisma.problem.findMany({
    where: { id: { in: problemIds } },
    select: { id: true, type: true, difficulty: true, content: true },
  });

  // Sort problems to match the order in the challenge
  const orderedProblems = problemIds
    .map((id) => problems.find((p) => p.id === id))
    .filter(Boolean);

  return Response.json({ challenge, problems: orderedProblems });
}

/** PATCH /api/challenges/:id — join or submit answer. */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { challengeId } = await params;
  const body = await request.json();
  const action = body.action as string;

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });

  if (!challenge) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Join challenge
  if (action === "join") {
    if (challenge.opponentId) {
      return Response.json({ error: "Challenge already has an opponent" }, { status: 400 });
    }
    if (challenge.creatorId === session.user.id) {
      return Response.json({ error: "Cannot join your own challenge" }, { status: 400 });
    }

    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        opponentId: session.user.id,
        status: "ACTIVE",
        startedAt: new Date(),
      },
    });

    return Response.json({ success: true, message: "Joined challenge" });
  }

  // Submit answer
  if (action === "submit") {
    if (challenge.status !== "ACTIVE") {
      return Response.json({ error: "Challenge not active" }, { status: 400 });
    }

    const isParticipant =
      challenge.creatorId === session.user.id || challenge.opponentId === session.user.id;
    if (!isParticipant) {
      return Response.json({ error: "Not a participant" }, { status: 403 });
    }

    const { problemId, isCorrect, timeSpent } = body as {
      problemId: string;
      isCorrect: boolean;
      timeSpent?: number;
    };

    // Record submission
    await prisma.challengeSubmission.upsert({
      where: {
        challengeId_userId_problemId: { challengeId, userId: session.user.id, problemId },
      },
      create: {
        challengeId,
        userId: session.user.id,
        problemId,
        isCorrect,
        timeSpent,
      },
      update: { isCorrect, timeSpent },
    });

    // Update scores
    const allSubmissions = await prisma.challengeSubmission.findMany({
      where: { challengeId },
    });

    const creatorScore = allSubmissions.filter(
      (s) => s.userId === challenge.creatorId && s.isCorrect
    ).length;
    const opponentScore = allSubmissions.filter(
      (s) => s.userId === challenge.opponentId && s.isCorrect
    ).length;

    // Check if challenge is complete (both players answered all problems)
    const problemIds = challenge.problems as string[];
    const creatorDone =
      allSubmissions.filter((s) => s.userId === challenge.creatorId).length >=
      problemIds.length;
    const opponentDone =
      allSubmissions.filter((s) => s.userId === challenge.opponentId).length >=
      problemIds.length;

    const isComplete = creatorDone && opponentDone;

    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        creatorScore,
        opponentScore,
        ...(isComplete && { status: "COMPLETED", completedAt: new Date() }),
      },
    });

    return Response.json({
      success: true,
      creatorScore,
      opponentScore,
      isComplete,
    });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
