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

export interface PendingAssignment {
  id: string;
  lessonId: string;
  lessonTitle: string;
  topicName: string;
  totalProblems: number;
  attempted: number;
  correct: number;
  dueDate: string | null;
  className: string;
}

export default async function StudentDashboard() {
  const session = await auth();
  const userId = session?.user?.id;

  let topicProgress: TopicProgress[] = [];
  let currentPhase = "FOUNDATIONS";
  let pendingAssignments: PendingAssignment[] = [];

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

    // Fetch pending assignments from classes
    const memberships = await prisma.classMembership.findMany({
      where: { userId, role: "STUDENT" },
      include: {
        class: {
          include: {
            assignments: {
              include: {
                lesson: {
                  include: {
                    topic: { select: { name: true } },
                    problems: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const m of memberships) {
      for (const a of m.class.assignments) {
        const assignedIds = a.problemIds as string[] | null;
        const problemIds = assignedIds && assignedIds.length > 0
          ? assignedIds
          : a.lesson.problems.map((p) => p.id);
        let attempted = 0;
        let correct = 0;
        for (const pid of problemIds) {
          const stat = problemStats.get(pid);
          if (stat) {
            attempted++;
            if (stat.correct) correct++;
          }
        }
        // Only show if not fully completed
        if (attempted < problemIds.length) {
          pendingAssignments.push({
            id: a.id,
            lessonId: a.lesson.id,
            lessonTitle: a.lesson.title,
            topicName: a.lesson.topic.name,
            totalProblems: problemIds.length,
            attempted,
            correct,
            dueDate: a.dueDate?.toISOString() ?? null,
            className: m.class.name,
          });
        }
      }
    }
  }

  return (
    <DashboardClient
      userName={session?.user?.name ?? "Explorer"}
      currentPhase={currentPhase}
      topics={topicProgress}
      pendingAssignments={pendingAssignments}
    />
  );
}
