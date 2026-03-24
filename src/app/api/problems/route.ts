import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { recommendDifficulty } from "@/modules/adaptive/difficulty-adjuster";
import { getSkillsDueForReview } from "@/modules/adaptive/spaced-repetition";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lessonId = searchParams.get("lessonId");
  const topicId = searchParams.get("topicId");
  const type = searchParams.get("type");
  const difficulty = searchParams.get("difficulty");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const adaptive = searchParams.get("adaptive") === "true";

  const where: Record<string, unknown> = {};
  if (lessonId) where.lessonId = lessonId;
  if (type) where.type = type;
  if (difficulty) where.difficulty = parseInt(difficulty, 10);

  // Filter by topic via lesson relation
  if (topicId) {
    where.lesson = { topicId };
  }

  // Adaptive mode: use spaced repetition and difficulty adjustment
  let difficultyInfo = null;
  let reviewSkills: Awaited<ReturnType<typeof getSkillsDueForReview>> = [];

  if (adaptive) {
    const session = await auth();
    if (session?.user?.id) {
      // Get recommended difficulty
      difficultyInfo = await recommendDifficulty(session.user.id);

      // Override difficulty filter with adaptive range
      if (!difficulty) {
        where.difficulty = {
          gte: difficultyInfo.minDifficulty,
          lte: difficultyInfo.maxDifficulty,
        };
      }

      // Get skills due for review
      reviewSkills = await getSkillsDueForReview(session.user.id);

      // If there are review skills, prioritize problems for those skills
      if (reviewSkills.length > 0 && !lessonId && !topicId) {
        const reviewSkillIds = reviewSkills.map((s) => s.skillId);
        where.skills = {
          some: { skillId: { in: reviewSkillIds } },
        };
      }
    }
  }

  const [problems, total] = await Promise.all([
    prisma.problem.findMany({
      where,
      include: {
        lesson: { select: { id: true, title: true, slug: true } },
        skills: { include: { skill: { select: { id: true, name: true, slug: true } } } },
      },
      orderBy: { difficulty: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.problem.count({ where }),
  ]);

  // If adaptive mode found no review-specific problems, fall back to general
  if (adaptive && problems.length === 0 && reviewSkills.length > 0) {
    delete where.skills;
    const fallbackProblems = await prisma.problem.findMany({
      where,
      include: {
        lesson: { select: { id: true, title: true, slug: true } },
        skills: { include: { skill: { select: { id: true, name: true, slug: true } } } },
      },
      orderBy: { difficulty: "asc" },
      take: limit,
      skip: offset,
    });
    const fallbackTotal = await prisma.problem.count({ where });

    return Response.json({
      problems: fallbackProblems,
      total: fallbackTotal,
      limit,
      offset,
      adaptive: difficultyInfo,
      reviewSkills,
    });
  }

  return Response.json({
    problems,
    total,
    limit,
    offset,
    ...(adaptive && {
      adaptive: difficultyInfo,
      reviewSkills,
    }),
  });
}
