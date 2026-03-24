import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getLevelForXP,
  levelProgress,
  xpToNextLevel,
  getStreakInfo,
  getUserBadges,
} from "@/modules/gamification";

/** GET /api/gamification — returns full gamification state for the current user. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, streakInfo, badges] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: session.user.id },
      select: { xp: true, level: true, currentPhase: true },
    }),
    getStreakInfo(session.user.id),
    getUserBadges(session.user.id),
  ]);

  if (!profile) {
    return Response.json({ error: "Student profile not found" }, { status: 404 });
  }

  const level = getLevelForXP(profile.xp);
  const progress = levelProgress(profile.xp);
  const toNext = xpToNextLevel(profile.xp);

  return Response.json({
    xp: profile.xp,
    level,
    progress,
    xpToNext: toNext,
    phase: profile.currentPhase,
    streak: streakInfo.streak,
    isActiveToday: streakInfo.isActiveToday,
    badges,
  });
}
