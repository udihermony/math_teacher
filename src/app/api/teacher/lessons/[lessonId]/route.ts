import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.object({ blocks: z.array(z.record(z.string(), z.unknown())) }).optional(),
  order: z.number().int().optional(),
  xpReward: z.number().int().optional(),
  coinableCount: z.number().int().min(0).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      topic: { select: { id: true, name: true, phase: true } },
      problems: {
        include: { skills: { include: { skill: true } } },
        orderBy: { difficulty: "asc" },
      },
    },
  });

  if (!lesson) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(lesson);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  const body = await request.json();
  const parsed = updateLessonSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (data.content) {
    data.content = data.content as never;
  }

  const lesson = await prisma.lesson.update({
    where: { id: lessonId },
    data,
  });

  return Response.json(lesson);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;

  // Delete associated problems first
  const problems = await prisma.problem.findMany({
    where: { lessonId },
    select: { id: true },
  });
  const problemIds = problems.map((p) => p.id);

  if (problemIds.length > 0) {
    await prisma.submission.deleteMany({ where: { problemId: { in: problemIds } } });
    await prisma.problemSkill.deleteMany({ where: { problemId: { in: problemIds } } });
    await prisma.problem.deleteMany({ where: { lessonId } });
  }

  await prisma.lesson.delete({ where: { id: lessonId } });
  return Response.json({ success: true });
}
