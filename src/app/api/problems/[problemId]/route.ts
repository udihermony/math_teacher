import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ problemId: string }> }
) {
  const { problemId } = await params;

  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: {
      lesson: { select: { id: true, title: true, slug: true } },
      skills: {
        include: { skill: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  if (!problem) {
    return Response.json({ error: "Problem not found" }, { status: 404 });
  }

  return Response.json(problem);
}
