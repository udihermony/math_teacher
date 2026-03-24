import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

const assignSchema = z.object({
  lessonId: z.string().min(1),
  problemIds: z.array(z.string()).optional(),
  dueDate: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

/** GET — list assignments for a class */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params;
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignments = await prisma.classAssignment.findMany({
    where: { classId },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          slug: true,
          topic: { select: { name: true, phase: true } },
          problems: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json({ assignments });
}

/** POST — assign a lesson to a class */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params;
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  // Verify class exists and teacher is a member
  const membership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId, userId: session.user.id } },
  });
  if (!membership || membership.role !== "TEACHER") {
    return Response.json({ error: "Not authorized for this class" }, { status: 403 });
  }

  // Check lesson exists
  const lesson = await prisma.lesson.findUnique({ where: { id: parsed.data.lessonId } });
  if (!lesson) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Create assignment (upsert to avoid duplicates)
  const problemIds = parsed.data.problemIds && parsed.data.problemIds.length > 0
    ? parsed.data.problemIds
    : null;

  const assignment = await prisma.classAssignment.upsert({
    where: { classId_lessonId: { classId, lessonId: parsed.data.lessonId } },
    create: {
      classId,
      lessonId: parsed.data.lessonId,
      problemIds: problemIds as never,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      note: parsed.data.note || null,
    },
    update: {
      problemIds: problemIds as never,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      note: parsed.data.note || null,
    },
  });

  return Response.json({ assignment }, { status: 201 });
}

/** DELETE — remove an assignment */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params;
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const assignmentId = searchParams.get("id");
  if (!assignmentId) {
    return Response.json({ error: "Missing assignment id" }, { status: 400 });
  }

  await prisma.classAssignment.delete({
    where: { id: assignmentId, classId },
  });

  return Response.json({ success: true });
}
