import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { generateApprovalCode } from "@/lib/generate-code";

/** GET — list pending test requests across teacher's classes */
export async function GET() {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Get all classes where this teacher is a member
  const memberships = await prisma.classMembership.findMany({
    where: { userId: session.user.id, role: "TEACHER" },
    select: { classId: true, class: { select: { name: true } } },
  });
  const classIds = memberships.map((m) => m.classId);

  const requests = await prisma.testRequest.findMany({
    where: {
      test: { classId: { in: classIds } },
      status: "PENDING",
    },
    include: {
      test: { select: { title: true, classId: true, questionCount: true, durationMinutes: true } },
      student: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Attach class name
  const classMap = Object.fromEntries(memberships.map((m) => [m.classId, m.class.name]));

  return Response.json({
    requests: requests.map((r) => ({
      id: r.id,
      studentName: r.student.name,
      studentEmail: r.student.email,
      testTitle: r.test.title,
      className: classMap[r.test.classId] ?? "",
      questionCount: r.test.questionCount,
      durationMinutes: r.test.durationMinutes,
      createdAt: r.createdAt,
    })),
  });
}

/** PATCH — approve or reject a test request */
export async function PATCH(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId, action } = await request.json();
  if (!requestId || !["approve", "reject"].includes(action)) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const testRequest = await prisma.testRequest.findUnique({
    where: { id: requestId },
    include: { test: { select: { classId: true } } },
  });

  if (!testRequest || testRequest.status !== "PENDING") {
    return Response.json({ error: "Request not found or already processed" }, { status: 404 });
  }

  // Verify teacher owns this class
  const membership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId: testRequest.test.classId, userId: session.user.id } },
  });
  if (!membership || membership.role !== "TEACHER") {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  if (action === "reject") {
    await prisma.testRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });
    return Response.json({ status: "REJECTED" });
  }

  // Approve — generate code
  const approvalCode = await generateApprovalCode();
  await prisma.testRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED", approvalCode },
  });

  return Response.json({ status: "APPROVED", approvalCode });
}
