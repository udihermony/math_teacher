import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const joinSchema = z.object({
  code: z.string().length(6),
});

/** POST /api/classes/join — student joins a class with code. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid code" }, { status: 400 });
  }

  const cls = await prisma.class.findUnique({
    where: { code: parsed.data.code.toUpperCase() },
  });

  if (!cls) {
    return Response.json({ error: "Class not found" }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId: cls.id, userId: session.user.id } },
  });

  if (existing) {
    return Response.json({ error: "Already a member" }, { status: 409 });
  }

  await prisma.classMembership.create({
    data: {
      classId: cls.id,
      userId: session.user.id,
      role: "STUDENT",
    },
  });

  // Set as active class if student doesn't have one yet
  await prisma.studentProfile.updateMany({
    where: { userId: session.user.id, activeClassId: null },
    data: { activeClassId: cls.id },
  });

  return Response.json({ success: true, className: cls.name });
}
