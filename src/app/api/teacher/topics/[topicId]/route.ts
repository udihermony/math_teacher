import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

const updateTopicSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
  iconUrl: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { topicId } = await params;
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      lessons: { orderBy: { order: "asc" }, include: { _count: { select: { problems: true } } } },
      skills: { orderBy: { name: "asc" } },
    },
  });

  if (!topic) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(topic);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { topicId } = await params;
  const body = await request.json();
  const parsed = updateTopicSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const topic = await prisma.topic.update({
    where: { id: topicId },
    data: parsed.data,
  });

  return Response.json(topic);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { topicId } = await params;

  // Check for dependent lessons
  const lessonCount = await prisma.lesson.count({ where: { topicId } });
  if (lessonCount > 0) {
    return Response.json(
      { error: "Cannot delete topic with existing lessons. Remove lessons first." },
      { status: 409 }
    );
  }

  await prisma.topic.delete({ where: { id: topicId } });
  return Response.json({ success: true });
}
