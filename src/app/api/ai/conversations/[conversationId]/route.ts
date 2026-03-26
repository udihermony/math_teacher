import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
      },
      lesson: { select: { title: true } },
      topic: { select: { name: true } },
    },
  });

  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    id: conversation.id,
    title: conversation.title,
    lessonId: conversation.lessonId,
    lessonTitle: conversation.lesson?.title ?? null,
    topicName: conversation.topic?.name ?? null,
    summary: conversation.summary,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      createdAt: m.createdAt,
    })),
  });
}
