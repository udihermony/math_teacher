import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

const createLessonSchema = z.object({
  topicId: z.string(),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  content: z.object({ blocks: z.array(z.record(z.string(), z.unknown())) }),
  order: z.number().int(),
  xpReward: z.number().int().default(10),
  coinableCount: z.number().int().min(0).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createLessonSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.lesson.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return Response.json({ error: "Slug already exists" }, { status: 409 });
  }

  const lesson = await prisma.lesson.create({
    data: {
      ...parsed.data,
      content: parsed.data.content as never,
      createdById: session.user.id,
    },
  });

  return Response.json(lesson, { status: 201 });
}
