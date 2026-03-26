import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lessonId = request.nextUrl.searchParams.get("lessonId");

  const where: { userId: string; lessonId?: string } = {
    userId: session.user.id,
  };
  if (lessonId) where.lessonId = lessonId;

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      lesson: { select: { title: true } },
      topic: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json(
    conversations.map((c) => ({
      id: c.id,
      lessonId: c.lessonId,
      lessonTitle: c.lesson?.title ?? null,
      topicName: c.topic?.name ?? null,
      lastMessage: c.messages[0]?.content.slice(0, 100) ?? null,
      lastMessageAt: c.messages[0]?.createdAt ?? c.createdAt,
      updatedAt: c.updatedAt,
    }))
  );
}
