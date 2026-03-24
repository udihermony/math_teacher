import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** GET /api/gamification/world-map — returns topic nodes with completion status. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get student's current phase
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { currentPhase: true },
  });

  const currentPhase = profile?.currentPhase ?? "FOUNDATIONS";

  // Phase ordering for determining what's locked
  const phaseOrder = ["FOUNDATIONS", "EXPLORER", "BUILDER", "CHALLENGER", "IB_READY"];
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase);

  // Get all topics with lesson counts
  const topics = await prisma.topic.findMany({
    orderBy: [{ phase: "asc" }, { order: "asc" }],
    include: {
      lessons: {
        select: { id: true },
      },
    },
  });

  // Get user's submissions to determine completed lessons
  const completedLessonIds = await prisma.submission.findMany({
    where: {
      userId: session.user.id,
      isCorrect: true,
    },
    select: {
      problem: {
        select: { lessonId: true },
      },
    },
    distinct: ["problemId"],
  });

  // Count unique completed lessons (at least one correct answer in that lesson)
  const lessonCompletionMap = new Map<string, boolean>();
  for (const sub of completedLessonIds) {
    if (sub.problem.lessonId) {
      lessonCompletionMap.set(sub.problem.lessonId, true);
    }
  }

  const nodes = topics.map((topic, index) => {
    const topicPhaseIndex = phaseOrder.indexOf(topic.phase);
    const lessonCount = topic.lessons.length;
    const completedLessons = topic.lessons.filter((l) =>
      lessonCompletionMap.has(l.id)
    ).length;

    let status: "locked" | "available" | "in_progress" | "completed";
    if (topicPhaseIndex > currentPhaseIndex) {
      status = "locked";
    } else if (completedLessons >= lessonCount && lessonCount > 0) {
      status = "completed";
    } else if (completedLessons > 0) {
      status = "in_progress";
    } else if (topicPhaseIndex <= currentPhaseIndex) {
      status = "available";
    } else {
      status = "locked";
    }

    return {
      id: `node-${index}`,
      topicId: topic.id,
      name: topic.name,
      phase: topic.phase,
      order: topic.order,
      lessonCount,
      completedLessons,
      status,
    };
  });

  return Response.json({ nodes });
}
