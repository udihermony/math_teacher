import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ explanationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { explanationId } = await params;

  const explanation = await prisma.explanation.findUnique({
    where: { id: explanationId },
  });

  if (!explanation) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    id: explanation.id,
    title: explanation.title,
    content: explanation.content,
    animationUrl: explanation.animationUrl,
    createdAt: explanation.createdAt,
  });
}
