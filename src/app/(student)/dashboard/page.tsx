import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DashboardClient } from "./DashboardClient";

export interface TopicProgress {
  id: string;
  name: string;
  phase: string;
  lessons: LessonProgress[];
}

export interface LessonProgress {
  id: string;
  title: string;
  order: number;
  totalProblems: number;
  attempted: number;
  correct: number;
}

export default async function StudentDashboard() {
  const session = await auth();
  const userId = session?.user?.id;

  let topicProgress: TopicProgress[] = [];
  let currentPhase = "FOUNDATIONS";

  if (userId) {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: { currentPhase: true },
    });
    currentPhase = profile?.currentPhase ?? "FOUNDATIONS";

    // Get all topics with lessons and problem counts
    const topics = await prisma.topic.findMany({
      orderBy: [{ phase: "asc" }, { order: "asc" }],
      include: {
        lessons: {
          orderBy: { order: "asc" },
          include: {
            problems: { select: { id: true } },
          },
        },
      },
    });

    // Get all of this student's submissions grouped by problem
    const submissions = await prisma.submission.findMany({
      where: { userId },
      select: { problemId: true, isCorrect: true },
    });

    // Build lookup: problemId → { attempted, gotCorrect }
    const problemStats = new Map<string, { attempted: boolean; correct: boolean }>();
    for (const sub of submissions) {
      const existing = problemStats.get(sub.problemId);
      if (existing) {
        existing.correct = existing.correct || sub.isCorrect;
      } else {
        problemStats.set(sub.problemId, { attempted: true, correct: sub.isCorrect });
      }
    }

    topicProgress = topics
      .filter((t) => t.lessons.length > 0)
      .map((topic) => ({
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
  }

  return (
    <DashboardClient
      userName={session?.user?.name ?? "Explorer"}
      currentPhase={currentPhase}
      topics={topicProgress}
    />
  );
}
