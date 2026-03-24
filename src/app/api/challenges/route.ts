import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** GET /api/challenges — list user's challenges. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [{ creatorId: userId }, { opponentId: userId }],
    },
    include: {
      creator: { select: { id: true, name: true } },
      opponent: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Also find open challenges from friends that can be joined
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { receiverId: userId }],
    },
    select: { requesterId: true, receiverId: true },
  });

  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.receiverId : f.requesterId
  );

  const openChallenges = await prisma.challenge.findMany({
    where: {
      creatorId: { in: friendIds },
      opponentId: null,
      status: "WAITING",
    },
    include: {
      creator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return Response.json({ challenges, openChallenges });
}

const createSchema = z.object({
  topicId: z.string().optional(),
  difficulty: z.number().int().min(1).max(10).default(5),
  problemCount: z.number().int().min(3).max(10).default(5),
  timeLimit: z.number().int().min(60).max(600).default(300),
  opponentId: z.string().optional(),
});

/** POST /api/challenges — create a new challenge. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { topicId, difficulty, problemCount, timeLimit, opponentId } = parsed.data;

  // Select random problems matching criteria
  const where: Record<string, unknown> = {
    difficulty: { gte: Math.max(1, difficulty - 1), lte: Math.min(10, difficulty + 1) },
  };
  if (topicId) {
    where.lesson = { topicId };
  }

  const allProblems = await prisma.problem.findMany({
    where,
    select: { id: true },
  });

  if (allProblems.length < problemCount) {
    return Response.json(
      { error: `Not enough problems found (need ${problemCount}, found ${allProblems.length})` },
      { status: 400 }
    );
  }

  // Shuffle and pick
  const shuffled = allProblems.sort(() => Math.random() - 0.5);
  const selectedIds = shuffled.slice(0, problemCount).map((p) => p.id);

  const challenge = await prisma.challenge.create({
    data: {
      creatorId: session.user.id,
      opponentId: opponentId || null,
      topicId: topicId || null,
      difficulty,
      problemCount,
      timeLimit,
      problems: selectedIds as never,
      status: opponentId ? "ACTIVE" : "WAITING",
      startedAt: opponentId ? new Date() : null,
    },
  });

  return Response.json({ challenge });
}
