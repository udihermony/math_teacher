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
          problems: { select: { purpose: true } },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: [{ phase: "asc" }, { order: "asc" }],
  });

  // Compute purpose-split counts per lesson
  const enriched = topics.map((t) => ({
    ...t,
    lessons: t.lessons.map((l) => {
      const practiceCount = l.problems.filter((p) => p.purpose === "PRACTICE").length;
      const assignmentCount = l.problems.filter((p) => p.purpose === "ASSIGNMENT").length;
      return {
        id: l.id,
        title: l.title,
        slug: l.slug,
        order: l.order,
        _count: {
          problems: l.problems.length,
          practice: practiceCount,
          assignment: assignmentCount,
        },
      };
    }),
  }));

  return Response.json({ topics: enriched });
}
