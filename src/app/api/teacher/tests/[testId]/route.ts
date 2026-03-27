import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

/** PATCH — update a test */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { testId } = await params;
  const body = await request.json();

  const test = await prisma.test.update({
    where: { id: testId },
    data: {
      ...(body.title != null && { title: body.title }),
      ...(body.durationMinutes != null && { durationMinutes: body.durationMinutes }),
      ...(body.status != null && { status: body.status }),
    },
  });

  return Response.json({ test });
}

/** DELETE — archive a test */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { testId } = await params;

  await prisma.test.update({
    where: { id: testId },
    data: { status: "ARCHIVED" },
  });

  return Response.json({ success: true });
}
