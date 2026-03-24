import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";

export async function GET() {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topics = await prisma.topic.findMany({
    include: {
      lessons: {
        include: {
          _count: { select: { problems: true } },
        },
        orderBy: { order: "asc" },
      },
      skills: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      _count: { select: { skills: true } },
    },
    orderBy: [{ phase: "asc" }, { order: "asc" }],
  });

  return Response.json({ topics });
}
