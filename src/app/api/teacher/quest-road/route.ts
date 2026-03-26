import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import type { Phase } from "@/generated/prisma/client";

/** GET /api/teacher/quest-road?classId=X — returns curriculum road for a class. */
export async function GET(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const classId = request.nextUrl.searchParams.get("classId");
  if (!classId) {
    return Response.json({ error: "classId required" }, { status: 400 });
  }

  // Verify teacher is in this class
  const membership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId, userId: session.user.id } },
  });
  if (!membership || membership.role !== "TEACHER") {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { phase: true, endPhase: true },
  });
  if (!cls) {
    return Response.json({ error: "Class not found" }, { status: 404 });
  }

  const phaseOrder: Phase[] = ["FOUNDATIONS", "EXPLORER", "BUILDER", "CHALLENGER", "IB_READY"];
  const startIndex = phaseOrder.indexOf(cls.phase);
  const endIndex = phaseOrder.indexOf(cls.endPhase ?? "IB_READY");
  const activePhases = phaseOrder.slice(startIndex, endIndex + 1);

  // Fetch topics with lessons and problem counts by purpose
  const topics = await prisma.topic.findMany({
    where: { phase: { in: activePhases } },
    include: {
      lessons: {
        include: {
          problems: { select: { id: true, purpose: true } },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ phase: "asc" }, { order: "asc" }],
  });

  // Fetch existing assignments for this class
  const assignments = await prisma.classAssignment.findMany({
    where: { classId },
    select: { lessonId: true, id: true },
  });
  const assignedLessonIds = new Set(assignments.map((a) => a.lessonId));

  // Build hierarchical structure
  const byPhase = new Map<string, typeof topics>();
  for (const t of topics) {
    const list = byPhase.get(t.phase) || [];
    list.push(t);
    byPhase.set(t.phase, list);
  }

  const phases = activePhases.map((phase) => {
    const phaseTopics = (byPhase.get(phase) || []).map((topic) => {
      const lessons = topic.lessons.map((lesson) => {
        const practiceCount = lesson.problems.filter((p) => p.purpose === "PRACTICE").length;
        const assignmentCount = lesson.problems.filter((p) => p.purpose === "ASSIGNMENT").length;
        return {
          id: lesson.id,
          title: lesson.title,
          order: lesson.order,
          practiceCount,
          assignmentCount,
          hasQuiz: assignedLessonIds.has(lesson.id),
        };
      });

      return {
        id: topic.id,
        name: topic.name,
        order: topic.order,
        lessons,
      };
    });

    return { phase, topics: phaseTopics };
  });

  return Response.json({ phases });
}
