import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { generateTestProblems } from "@/modules/ai/generate-test-problems";

const createSchema = z.object({
  classId: z.string().min(1),
  scope: z.enum(["LESSON", "TOPIC", "PHASE"]),
  scopeId: z.string().min(1),
  title: z.string().min(1).max(200),
  questionCount: z.number().int().min(1).max(100),
  durationMinutes: z.number().int().min(1).optional(),
  passingGrade: z.number().int().min(1).optional(),
  aiGenerate: z.boolean().default(true),
});

/** GET — list tests for a class */
export async function GET(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const classId = request.nextUrl.searchParams.get("classId");
  if (!classId) return Response.json({ error: "classId required" }, { status: 400 });

  const tests = await prisma.test.findMany({
    where: { classId, status: { not: "ARCHIVED" } },
    include: {
      _count: { select: { requests: true } },
      requests: { where: { status: "PENDING" }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({
    tests: tests.map((t) => ({
      ...t,
      pendingRequests: t.requests.length,
      requests: undefined,
    })),
  });
}

/** POST — create a test */
export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { classId, scope, scopeId, title, questionCount, durationMinutes, passingGrade, aiGenerate } = parsed.data;

  // Verify teacher is in this class
  const membership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId, userId: session.user.id } },
  });
  if (!membership || membership.role !== "TEACHER") {
    return Response.json({ error: "Not authorized for this class" }, { status: 403 });
  }

  let problemIds: string[] = [];
  let recommendedDuration = durationMinutes ?? Math.ceil(questionCount * 3);

  if (aiGenerate) {
    const result = await generateTestProblems({
      scope,
      scopeId,
      count: questionCount,
      userId: session.user.id,
    });
    problemIds = result.problemIds;
    recommendedDuration = durationMinutes ?? result.recommendedDuration;
  }

  const test = await prisma.test.create({
    data: {
      classId,
      scope,
      scopeId,
      title,
      questionCount,
      problemIds: problemIds as never,
      durationMinutes: recommendedDuration,
      passingGrade: passingGrade ?? null,
      aiGenerated: aiGenerate,
      createdById: session.user.id,
    },
  });

  return Response.json({ test, recommendedDuration }, { status: 201 });
}
