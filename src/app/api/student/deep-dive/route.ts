import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lessonId = request.nextUrl.searchParams.get("lessonId");
  if (!lessonId) {
    return Response.json({ error: "lessonId required" }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      deepDive: true,
      topic: { select: { phase: true } },
    },
  });

  if (!lesson?.deepDive) {
    return Response.json({ error: "No deep dive found" }, { status: 404 });
  }

  // Check if already completed
  const existing = await prisma.coinTransaction.findFirst({
    where: { userId: session.user.id, reason: "DEEP_DIVE", sourceId: lessonId },
  });

  return Response.json({
    title: lesson.title,
    deepDive: lesson.deepDive,
    completed: !!existing,
  });
}
