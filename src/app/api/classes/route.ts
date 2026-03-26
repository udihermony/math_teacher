import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** GET /api/classes — list user's classes. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.classMembership.findMany({
    where: { userId: session.user.id },
    include: {
      class: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, role: true } },
            },
          },
          assignments: {
            include: {
              lesson: {
                select: {
                  id: true,
                  title: true,
                  topic: { select: { name: true, phase: true } },
                  problems: { select: { id: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  const classes = memberships.map((m) => ({
    ...m.class,
    myRole: m.role,
    memberCount: m.class.members.length,
  }));

  return Response.json({ classes });
}

const phaseEnum = z.enum(["FOUNDATIONS", "EXPLORER", "BUILDER", "CHALLENGER", "IB_READY"]);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  phase: phaseEnum.optional(),
  endPhase: phaseEnum.optional(),
});

/** POST /api/classes — teacher creates a class. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TEACHER") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  // Generate unique 6-character join code
  const code = generateClassCode();

  const cls = await prisma.class.create({
    data: {
      name: parsed.data.name,
      code,
      phase: parsed.data.phase ?? "FOUNDATIONS",
      endPhase: parsed.data.endPhase ?? "IB_READY",
      members: {
        create: {
          userId: session.user.id,
          role: "TEACHER",
        },
      },
    },
  });

  return Response.json({ class: cls });
}

function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
