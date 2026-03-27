import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

/** Generate a unique 6-character uppercase alphanumeric approval code. */
export async function generateApprovalCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomBytes(3).toString("hex").toUpperCase();
    const existing = await prisma.testRequest.findFirst({
      where: { approvalCode: code },
    });
    if (!existing) return code;
  }
  // Fallback: longer code to avoid collision
  return randomBytes(4).toString("hex").toUpperCase();
}
