import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Fetch all topics with their lessons and PRACTICE problem IDs
  const topics = await prisma.topic.findMany({
    include: {
      lessons: {
        include: {
          problems: {
            where: { purpose: "PRACTICE" },
            select: { id: true },
          },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ phase: "asc" }, { order: "asc" }],
  });

  // Fetch all submissions for this user
  const submissions = await prisma.submission.findMany({
    where: { userId },
    select: { problemId: true, isCorrect: true },
  });

  // Build a map: problemId -> { attempted, correct }
  const problemStats = new Map<string, { attempted: boolean; correct: boolean }>();
  for (const sub of submissions) {
    const existing = problemStats.get(sub.problemId);
    if (existing) {
      existing.correct = existing.correct || sub.isCorrect;
    } else {
      problemStats.set(sub.problemId, { attempted: true, correct: sub.isCorrect });
    }
  }

  // Build response with per-lesson progress
  const result = topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    phase: topic.phase,
    lessons: topic.lessons.map((lesson) => {
      const problemIds = lesson.problems.map((p) => p.id);
      let attempted = 0;
      let correct = 0;
      for (const pid of problemIds) {
        const stat = problemStats.get(pid);
        if (stat) {
          attempted++;
          if (stat.correct) correct++;
        }
      }
      return {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        totalProblems: problemIds.length,
        attempted,
        correct,
      };
    }),
  }));

  return Response.json({ topics: result });
}
