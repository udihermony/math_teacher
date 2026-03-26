import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { streamClaude } from "@/modules/ai/claude-client";

/** POST — stream an AI performance summary for the class */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params;
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify teacher is in this class
  const membership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId, userId: session.user.id } },
  });
  if (!membership || membership.role !== "TEACHER") {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  // Get class info
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      members: {
        where: { role: "STUDENT" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              studentProfile: {
                select: { currentPhase: true, xp: true, level: true, streak: true, lastActiveDate: true },
              },
            },
          },
        },
      },
      assignments: {
        include: {
          lesson: { select: { id: true, title: true, topic: { select: { name: true } } } },
        },
      },
    },
  });

  if (!cls) {
    return Response.json({ error: "Class not found" }, { status: 404 });
  }

  // Gather per-student submission stats
  const studentIds = cls.members.map((m) => m.user.id);

  const submissions = await prisma.submission.groupBy({
    by: ["userId"],
    where: { userId: { in: studentIds } },
    _count: { _all: true },
  });

  const correctSubs = await prisma.submission.groupBy({
    by: ["userId"],
    where: { userId: { in: studentIds }, isCorrect: true },
    _count: { _all: true },
  });

  const totalMap = new Map(submissions.map((s) => [s.userId, s._count._all]));
  const correctMap = new Map(correctSubs.map((s) => [s.userId, s._count._all]));

  // Get recent submissions (last 2 weeks) for trend analysis
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentSubs = await prisma.submission.findMany({
    where: {
      userId: { in: studentIds },
      createdAt: { gte: twoWeeksAgo },
    },
    select: {
      userId: true,
      isCorrect: true,
      problem: {
        select: {
          difficulty: true,
          lesson: { select: { title: true, topic: { select: { name: true } } } },
        },
      },
    },
  });

  // Build per-student recent topic performance
  const recentByStudent = new Map<string, { topic: string; total: number; correct: number }[]>();
  for (const sub of recentSubs) {
    const topicName = sub.problem.lesson?.topic?.name ?? "Unknown";
    const list = recentByStudent.get(sub.userId) || [];
    let entry = list.find((e) => e.topic === topicName);
    if (!entry) {
      entry = { topic: topicName, total: 0, correct: 0 };
      list.push(entry);
    }
    entry.total++;
    if (sub.isCorrect) entry.correct++;
    recentByStudent.set(sub.userId, list);
  }

  // Build the data summary for the AI
  const studentSummaries = cls.members.map((m) => {
    const p = m.user.studentProfile;
    const total = totalMap.get(m.user.id) ?? 0;
    const correct = correctMap.get(m.user.id) ?? 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const recent = recentByStudent.get(m.user.id) || [];

    return {
      name: m.user.name,
      phase: p?.currentPhase ?? "PHASE_0",
      level: p?.level ?? 1,
      xp: p?.xp ?? 0,
      streak: p?.streak ?? 0,
      lastActive: p?.lastActiveDate?.toISOString().split("T")[0] ?? "never",
      totalProblems: total,
      correctProblems: correct,
      accuracy,
      recentTopicPerformance: recent,
    };
  });

  const assignedLessons = cls.assignments.map((a) => ({
    lesson: a.lesson.title,
    topic: a.lesson.topic.name,
    dueDate: a.dueDate?.toISOString().split("T")[0] ?? "no due date",
  }));

  const systemPrompt = `You are an experienced math teacher's assistant analyzing student performance data.

Given the class data below, provide a clear, actionable summary for the teacher. Structure your response as:

1. **Class Overview** — Overall health of the class (engagement, average performance, trends).

2. **Individual Student Insights** — For EACH student, a 2-3 sentence summary covering:
   - Their strengths and areas for improvement
   - Whether they're on track, falling behind, or excelling
   - Specific topics they struggle with (based on recent performance)
   - Any concerning patterns (low streak = not practicing, low accuracy on specific topics)

3. **Recommendations** — 3-5 concrete suggestions for the teacher:
   - Which students need extra attention and why
   - Topics that should be reviewed as a class
   - Suggested next assignments based on the data
   - Students who could be paired for peer learning

Keep it professional but warm. Use the student's name. Be specific — don't just say "needs improvement", say which topics and why.`;

  const userMessage = `Class: "${cls.name}"
Students: ${cls.members.length}
Assigned Lessons: ${JSON.stringify(assignedLessons, null, 2)}

Student Data:
${JSON.stringify(studentSummaries, null, 2)}

Today's date: ${new Date().toISOString().split("T")[0]}

Please provide a performance summary and recommendations.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = streamClaude({
          userId: session.user.id,
          systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          maxTokens: 2048,
        });

        for await (const chunk of generator) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "An error occurred";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
