import { prisma } from "@/lib/db";

/** GET /api/health — health check endpoint. */
export async function GET() {
  const checks: Record<string, string> = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "connected";
  } catch {
    checks.database = "disconnected";
    checks.status = "degraded";
  }

  // Anthropic API key check
  checks.ai = process.env.ANTHROPIC_API_KEY ? "configured" : "missing";
  if (!process.env.ANTHROPIC_API_KEY) {
    checks.status = "degraded";
  }

  const statusCode = checks.status === "ok" ? 200 : 503;
  return Response.json(checks, { status: statusCode });
}
