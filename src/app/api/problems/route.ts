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

  const purpose = searchParams.get("purpose"); // "PRACTICE", "ASSIGNMENT", or "ALL"
  const ids = searchParams.get("ids"); // comma-separated problem IDs (for assignments)

  const where: Record<string, unknown> = {};

  // When fetching by specific IDs (e.g., assignment problems), skip purpose filter
  if (ids) {
    where.id = { in: ids.split(",") };
  } else {
    // Default to PRACTICE for student-facing queries
    if (purpose === "ASSIGNMENT") where.purpose = "ASSIGNMENT";
    else if (purpose === "ALL") { /* no filter */ }
    else where.purpose = "PRACTICE";
  }

  if (lessonId) where.lessonId = lessonId;
  if (type) where.type = type;
  if (difficulty) where.difficulty = parseInt(difficulty, 10);

  // Filter by topic via lesson relation
  if (topicId) {
    where.lesson = { topicId };
  }

  // Filter by phase via lesson→topic relation
  const phaseParam = searchParams.get("phase");
  if (phaseParam) {
    where.lesson = { ...(where.lesson as Record<string, unknown> || {}), topic: { phase: phaseParam } };
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

  // Get current user for solved status
  let userId: string | null = null;
  if (!adaptive) {
    const session = await auth();
    userId = session?.user?.id ?? null;
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

  // If we have a user (from adaptive or explicit auth), check which problems are solved
  const resolvedUserId = userId ?? (adaptive ? (await auth())?.user?.id : null);
  let solvedSet = new Set<string>();
  if (resolvedUserId && problems.length > 0) {
    const correctSubs = await prisma.submission.findMany({
      where: {
        userId: resolvedUserId,
        problemId: { in: problems.map((p) => p.id) },
        isCorrect: true,
      },
      select: { problemId: true },
      distinct: ["problemId"],
    });
    solvedSet = new Set(correctSubs.map((s) => s.problemId));
  }

  const problemsWithSolved = problems.map((p) => ({
    ...p,
    solvedByUser: solvedSet.has(p.id),
  }));

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

    // Check solved status for fallback too
    let fbSolvedSet = new Set<string>();
    if (resolvedUserId && fallbackProblems.length > 0) {
      const fbSubs = await prisma.submission.findMany({
        where: { userId: resolvedUserId, problemId: { in: fallbackProblems.map((p) => p.id) }, isCorrect: true },
        select: { problemId: true },
        distinct: ["problemId"],
      });
      fbSolvedSet = new Set(fbSubs.map((s) => s.problemId));
    }

    return Response.json({
      problems: fallbackProblems.map((p) => ({ ...p, solvedByUser: fbSolvedSet.has(p.id) })),
      total: fallbackTotal,
      limit,
      offset,
      adaptive: difficultyInfo,
      reviewSkills,
    });
  }

  return Response.json({
    problems: problemsWithSolved,
    total,
    limit,
    offset,
    ...(adaptive && {
      adaptive: difficultyInfo,
      reviewSkills,
    }),
  });
}
