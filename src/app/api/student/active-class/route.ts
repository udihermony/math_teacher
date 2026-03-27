import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** GET /api/student/active-class — returns all classes + active class id */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [profile, memberships] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId },
      select: { activeClassId: true },
    }),
    prisma.classMembership.findMany({
      where: { userId, role: "STUDENT" },
      include: { class: { select: { id: true, name: true } } },
    }),
  ]);

  const classes = memberships.map((m) => m.class);
  const activeClassId =
    profile?.activeClassId && classes.some((c) => c.id === profile.activeClassId)
      ? profile.activeClassId
      : classes[0]?.id ?? null;

  return Response.json({ classes, activeClassId });
}

/** PATCH /api/student/active-class — set active class */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { classId } = await req.json();

  // Verify the student is a member of this class
  const membership = await prisma.classMembership.findFirst({
    where: { userId, classId, role: "STUDENT" },
  });

  if (!membership) {
    return Response.json({ error: "Not a member of this class" }, { status: 403 });
  }

  await prisma.studentProfile.update({
    where: { userId },
    data: { activeClassId: classId },
  });

  return Response.json({ activeClassId: classId });
}
