import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

/**
 * GET /api/teacher/export-content
 * Returns all curriculum content as a single JSON download.
 * Teacher can save this or use the CLI scripts for file-based export.
 */
export async function GET() {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Topics + lessons
  const topics = await prisma.topic.findMany({
    orderBy: [{ phase: "asc" }, { order: "asc" }],
    include: {
      lessons: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          content: true,
          order: true,
          xpReward: true,
        },
      },
    },
  });

  const curriculum = topics.map((t) => ({
    id: t.id,
    phase: t.phase,
    name: t.name,
    slug: t.slug,
    description: t.description,
    order: t.order,
    lessons: t.lessons,
  }));

  // Problems
  const problems = await prisma.problem.findMany({
    include: {
      lesson: { select: { slug: true } },
      skills: { include: { skill: { select: { slug: true, name: true } } } },
    },
    orderBy: [{ lessonId: "asc" }, { difficulty: "asc" }],
  });

  const problemsExport = problems.map((p) => ({
    id: p.id,
    lessonSlug: p.lesson?.slug ?? null,
    type: p.type,
    purpose: p.purpose,
    difficulty: p.difficulty,
    content: p.content,
    solution: p.solution,
    commonMistakes: p.commonMistakes,
    skills: p.skills.map((s) => ({ slug: s.skill.slug, name: s.skill.name })),
  }));

  // Skills
  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, topicId: true },
  });

  const topicMap = new Map(topics.map((t) => [t.id, t.slug]));
  const skillsExport = skills.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    topicSlug: s.topicId ? topicMap.get(s.topicId) ?? null : null,
  }));

  const exportData = {
    exportedAt: new Date().toISOString(),
    curriculum,
    problems: problemsExport,
    skills: skillsExport,
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mathquest-content-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
