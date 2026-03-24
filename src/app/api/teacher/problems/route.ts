import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

const createProblemSchema = z.object({
  lessonId: z.string().optional(),
  type: z.enum(["MULTIPLE_CHOICE", "FREE_INPUT", "DRAG_AND_DROP", "GRAPHING", "PROOF_BUILDER", "WORKED_SOLUTION"]),
  difficulty: z.number().int().min(1).max(10),
  content: z.record(z.string(), z.unknown()),
  commonMistakes: z.record(z.string(), z.unknown()).optional(),
  solution: z.record(z.string(), z.unknown()).optional(),
  skillIds: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const lessonId = searchParams.get("lessonId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const where: Record<string, unknown> = {};
  if (lessonId) where.lessonId = lessonId;

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      include: {
        lesson: { select: { id: true, title: true } },
        skills: { include: { skill: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.problem.count({ where }),
  ]);

  return Response.json({ problems, total });
}

export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createProblemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { skillIds, ...data } = parsed.data;

  const problem = await prisma.problem.create({
    data: {
      ...data,
      content: data.content as never,
      commonMistakes: data.commonMistakes as never,
      solution: data.solution as never,
      ...(skillIds && skillIds.length > 0
        ? { skills: { create: skillIds.map((skillId) => ({ skillId })) } }
        : {}),
    },
    include: {
      skills: { include: { skill: true } },
    },
  });

  return Response.json(problem, { status: 201 });
}
