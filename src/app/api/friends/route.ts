import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** GET /api/friends — list friends and pending requests. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [friends, pendingReceived, pendingSent] = await Promise.all([
    // Accepted friendships (both directions)
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, studentProfile: { select: { xp: true, level: true, streak: true, currentPhase: true } } },
        },
        receiver: {
          select: { id: true, name: true, email: true, studentProfile: { select: { xp: true, level: true, streak: true, currentPhase: true } } },
        },
      },
    }),
    // Pending requests received
    prisma.friendship.findMany({
      where: { receiverId: userId, status: "PENDING" },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    }),
    // Pending requests sent
    prisma.friendship.findMany({
      where: { requesterId: userId, status: "PENDING" },
      include: {
        receiver: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  // Map friends to a clean list
  const friendsList = friends.map((f) => {
    const friend = f.requesterId === userId ? f.receiver : f.requester;
    return {
      friendshipId: f.id,
      user: friend,
      since: f.updatedAt,
    };
  });

  return Response.json({
    friends: friendsList,
    pendingReceived: pendingReceived.map((r) => ({
      friendshipId: r.id,
      from: r.requester,
      sentAt: r.createdAt,
    })),
    pendingSent: pendingSent.map((r) => ({
      friendshipId: r.id,
      to: r.receiver,
      sentAt: r.createdAt,
    })),
  });
}

const addFriendSchema = z.object({
  email: z.string(),
});

/** POST /api/friends — send a friend request by email. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = addFriendSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true },
  });

  if (!targetUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  if (targetUser.id === session.user.id) {
    return Response.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  // Check for existing friendship in either direction
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: session.user.id, receiverId: targetUser.id },
        { requesterId: targetUser.id, receiverId: session.user.id },
      ],
    },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") {
      return Response.json({ error: "Already friends" }, { status: 409 });
    }
    if (existing.status === "PENDING") {
      return Response.json({ error: "Request already pending" }, { status: 409 });
    }
    // If declined, allow re-request by updating
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "PENDING", requesterId: session.user.id, receiverId: targetUser.id },
    });
    return Response.json({ success: true, message: "Friend request re-sent" });
  }

  await prisma.friendship.create({
    data: {
      requesterId: session.user.id,
      receiverId: targetUser.id,
    },
  });

  return Response.json({ success: true, message: "Friend request sent" });
}

/** PATCH /api/friends — accept or decline a friend request. */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { friendshipId, action } = body as { friendshipId: string; action: "accept" | "decline" };

  if (!friendshipId || !["accept", "decline"].includes(action)) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });

  if (!friendship || friendship.receiverId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (friendship.status !== "PENDING") {
    return Response.json({ error: "Request already handled" }, { status: 400 });
  }

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: action === "accept" ? "ACCEPTED" : "DECLINED" },
  });

  return Response.json({ success: true });
}

/** DELETE /api/friends — remove a friend. */
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const friendshipId = searchParams.get("id");
  if (!friendshipId) {
    return Response.json({ error: "Missing friendship id" }, { status: 400 });
  }

  const friendship = await prisma.friendship.findUnique({
    where: { id: friendshipId },
  });

  if (
    !friendship ||
    (friendship.requesterId !== session.user.id && friendship.receiverId !== session.user.id)
  ) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.friendship.delete({ where: { id: friendshipId } });

  return Response.json({ success: true });
}
