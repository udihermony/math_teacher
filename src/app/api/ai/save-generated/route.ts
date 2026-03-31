import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { validateProblemContent } from "@/modules/problems/content-validation";

const problemSchema = z.object({
  type: z.enum(["MULTIPLE_CHOICE", "FREE_INPUT", "DRAG_AND_DROP", "GRAPHING", "PROOF_BUILDER", "WORKED_SOLUTION"]),
  difficulty: z.number().int().min(1).max(10),
  content: z.record(z.string(), z.unknown()),
  solution: z.record(z.string(), z.unknown()).optional(),
  commonMistakes: z.record(z.string(), z.unknown()).optional(),
});

const saveLessonSchema = z.object({
  type: z.literal("lesson"),
  topicId: z.string(),
  data: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    xpReward: z.number().int().optional(),
    content: z.object({ blocks: z.array(z.record(z.string(), z.unknown())) }),
    problems: z.array(problemSchema).optional(),
  }),
});

const saveProblemsSchema = z.object({
  type: z.literal("problems"),
  lessonId: z.string().optional(),
  purpose: z.enum(["PRACTICE", "ASSIGNMENT"]).default("PRACTICE"),
  data: z.array(problemSchema),
});

const schema = z.union([saveLessonSchema, saveProblemsSchema]);

export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  if (parsed.data.type === "lesson") {
    const { topicId, data } = parsed.data;

    // Check topic exists
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) {
      return Response.json({ error: "Topic not found" }, { status: 404 });
    }

    // Check slug uniqueness
    const existingLesson = await prisma.lesson.findUnique({ where: { slug: data.slug } });
    if (existingLesson) {
      return Response.json({ error: "Lesson slug already exists" }, { status: 409 });
    }

    // Get next order
    const lastLesson = await prisma.lesson.findFirst({
      where: { topicId },
      orderBy: { order: "desc" },
    });

    const lesson = await prisma.lesson.create({
      data: {
        topicId,
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        xpReward: data.xpReward || 10,
        content: data.content as never,
        order: (lastLesson?.order ?? 0) + 1,
        createdById: session.user.id,
      },
    });

    // Create associated problems
    let problemCount = 0;
    if (data.problems && data.problems.length > 0) {
      for (const p of data.problems) {
        const validated = validateProblemContent(p.type, p.content);
        if (!validated.ok) {
          return Response.json({ error: validated.error }, { status: 400 });
        }
        await prisma.problem.create({
          data: {
            lessonId: lesson.id,
            type: p.type,
            difficulty: p.difficulty,
            content: validated.content as never,
            solution: p.solution as never ?? undefined,
            commonMistakes: p.commonMistakes as never ?? undefined,
          },
        });
        problemCount++;
      }
    }

    return Response.json({
      success: true,
      lesson: { id: lesson.id, title: lesson.title },
      problemsCreated: problemCount,
    });
  }

  if (parsed.data.type === "problems") {
    const { lessonId, purpose, data } = parsed.data;

    const created = [];
    for (const p of data) {
      const validated = validateProblemContent(p.type, p.content);
      if (!validated.ok) {
        return Response.json({ error: validated.error }, { status: 400 });
      }
      const problem = await prisma.problem.create({
        data: {
          lessonId: lessonId || null,
          purpose,
          type: p.type,
          difficulty: p.difficulty,
          content: validated.content as never,
          solution: p.solution as never ?? undefined,
          commonMistakes: p.commonMistakes as never ?? undefined,
        },
      });
      created.push(problem.id);
    }

    return Response.json({
      success: true,
      problemsCreated: created.length,
      problemIds: created,
    });
  }
}
