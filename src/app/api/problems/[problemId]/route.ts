import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { instantiateProblem } from "@/modules/problems/randomization";

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

  const instantiated = instantiateProblem(
    {
      type: problem.type,
      content: problem.content as Record<string, unknown>,
      solution: (problem.solution as { steps: string[] } | null) ?? null,
    },
    randomUUID()
  );

  return Response.json({
    ...problem,
    content: instantiated.content,
    solution: instantiated.solution,
    instance: instantiated.instance,
  });
}
