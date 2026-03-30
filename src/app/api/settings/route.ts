import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  aiProvider: z.enum(["ANTHROPIC", "OPENAI", "GEMINI"]).nullable().optional(),
  aiApiKey: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, aiProvider: true, aiApiKey: true },
  });

  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({
    name: user.name,
    email: user.email,
    aiProvider: user.aiProvider,
    hasApiKey: !!user.aiApiKey,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (parsed.data.name !== undefined) {
    data.name = parsed.data.name;
  }

  if (parsed.data.aiProvider !== undefined) {
    data.aiProvider = parsed.data.aiProvider;
  }

  if (parsed.data.aiApiKey !== undefined) {
    // Encrypt before storing, or null to clear
    data.aiApiKey = parsed.data.aiApiKey ? encrypt(parsed.data.aiApiKey) : null;
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, aiProvider: true, aiApiKey: true },
  });

  return Response.json({
    id: user.id,
    name: user.name,
    email: user.email,
    aiProvider: user.aiProvider,
    hasApiKey: !!user.aiApiKey,
  });
}
