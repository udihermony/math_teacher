import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeacher } from "@/lib/teacher-auth";
import { prisma } from "@/lib/db";

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), content: z.string() }),
  z.object({ type: z.literal("latex"), content: z.string() }),
  z.object({ type: z.literal("p5"), code: z.string(), height: z.number().optional() }),
]);

const schema = z.object({
  lessonId: z.string(),
  tutorial: z.object({
    blocks: z.array(blockSchema).min(1),
  }),
});

export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid tutorial data", details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.lesson.update({
    where: { id: parsed.data.lessonId },
    data: { tutorial: parsed.data.tutorial },
  });

  return Response.json({ success: true });
}
