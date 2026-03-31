import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { validateProblemContent } from "@/modules/problems/content-validation";

const updateProblemSchema = z.object({
  type: z.enum(["MULTIPLE_CHOICE", "MULTI_SELECT", "FREE_INPUT", "DRAG_AND_DROP", "GRAPHING", "PROOF_BUILDER", "WORKED_SOLUTION"]).optional(),
  difficulty: z.number().int().min(1).max(10).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  commonMistakes: z.record(z.string(), z.unknown()).optional(),
  solution: z.record(z.string(), z.unknown()).optional(),
  skillIds: z.array(z.string()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ problemId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { problemId } = await params;
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: {
      lesson: { select: { id: true, title: true, slug: true } },
      skills: { include: { skill: true } },
      _count: { select: { submissions: true } },
    },
  });

  if (!problem) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(problem);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ problemId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { problemId } = await params;
  const body = await request.json();
  const parsed = updateProblemSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const { skillIds, ...data } = parsed.data;
  if (data.type || data.content) {
    const existing = await prisma.problem.findUnique({
      where: { id: problemId },
      select: { type: true, content: true },
    });
    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

    const nextType = data.type ?? existing.type;
    const nextContent = (data.content ?? (existing.content as Record<string, unknown>)) as Record<string, unknown>;
    const validated = validateProblemContent(nextType, nextContent);
    if (!validated.ok) {
      return Response.json({ error: validated.error }, { status: 400 });
    }
    data.content = validated.content;
  }

  // Cast JSON fields
  const updateData: Record<string, unknown> = { ...data };
  if (data.content) updateData.content = data.content as never;
  if (data.commonMistakes) updateData.commonMistakes = data.commonMistakes as never;
  if (data.solution) updateData.solution = data.solution as never;

  // Update skill links if provided
  if (skillIds) {
    await prisma.problemSkill.deleteMany({ where: { problemId } });
    if (skillIds.length > 0) {
      await prisma.problemSkill.createMany({
        data: skillIds.map((skillId) => ({ problemId, skillId })),
      });
    }
  }

  const problem = await prisma.problem.update({
    where: { id: problemId },
    data: updateData,
    include: { skills: { include: { skill: true } } },
  });

  return Response.json(problem);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ problemId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { problemId } = await params;

  await prisma.submission.deleteMany({ where: { problemId } });
  await prisma.problemSkill.deleteMany({ where: { problemId } });
  await prisma.problem.delete({ where: { id: problemId } });

  return Response.json({ success: true });
}
