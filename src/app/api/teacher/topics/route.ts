import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

const createTopicSchema = z.object({
  phase: z.enum(["FOUNDATIONS", "EXPLORER", "BUILDER", "CHALLENGER", "IB_READY"]),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int(),
  iconUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createTopicSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.topic.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return Response.json({ error: "Slug already exists" }, { status: 409 });
  }

  const topic = await prisma.topic.create({ data: parsed.data });
  return Response.json(topic, { status: 201 });
}
