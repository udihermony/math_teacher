import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAssignmentProblems } from "@/modules/ai/generate-assignment-problems";

/**
 * POST /api/student/retake-quiz
 * Body: { problemIds: string[] }
 *
 * Generates a fresh set of ASSIGNMENT problems for the same lesson
 * and returns their IDs so the student can retake the quiz.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { problemIds } = (await request.json()) as { problemIds?: string[] };
  if (!problemIds?.length) {
    return Response.json({ error: "problemIds required" }, { status: 400 });
  }

  // Look up one of the original problems to find the lesson
  const original = await prisma.problem.findFirst({
    where: { id: { in: problemIds } },
    select: { lessonId: true },
  });
  if (!original?.lessonId) {
    return Response.json({ error: "Could not determine lesson" }, { status: 400 });
  }

  const count = problemIds.length;

  // Generate new quiz problems via AI
  const newIds = await generateAssignmentProblems({
    lessonId: original.lessonId,
    count,
    userId: session.user.id,
  });

  return Response.json({ newIds });
}
