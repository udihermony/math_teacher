import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { generateAssignmentProblems } from "@/modules/ai/generate-assignment-problems";

/** POST /api/teacher/generate-quiz — generate ASSIGNMENT problems for a lesson (no auto-assign). */
export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId, count = 5 } = await request.json();
  if (!lessonId) {
    return Response.json({ error: "lessonId required" }, { status: 400 });
  }

  // Check existing assignment problems
  const existing = await prisma.problem.count({
    where: { lessonId, purpose: "ASSIGNMENT" },
  });

  const needed = Math.max(0, count - existing);
  let created = 0;

  if (needed > 0) {
    const newIds = await generateAssignmentProblems({
      lessonId,
      count: needed,
      userId: session.user.id,
    });
    created = newIds.length;
  }

  const total = existing + created;

  return Response.json({ success: true, existing, created, total });
}
