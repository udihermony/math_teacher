/**
 * Badge checker — evaluates earned badges and awards new ones.
 */

import { prisma } from "@/lib/db";
import { BADGES, type BadgeCheckContext, type BadgeDefinition } from "./badge-definitions";
import { getLevelForXP } from "./xp-calculator";

/** Build the context needed for badge checks from the database. */
export async function buildBadgeContext(userId: string): Promise<BadgeCheckContext> {
  const [profile, totalProblems, correctCount, masteries] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId },
      select: { xp: true, streak: true, currentPhase: true },
    }),
    prisma.submission.count({ where: { userId } }),
    prisma.submission.count({ where: { userId, isCorrect: true } }),
    prisma.progress.findMany({
      where: { userId },
      select: { mastery: true },
    }),
  ]);

  const totalXP = profile?.xp ?? 0;

  return {
    totalXP,
    level: getLevelForXP(totalXP),
    streak: profile?.streak ?? 0,
    totalProblems,
    correctProblems: correctCount,
    totalLessons: 0, // TODO: track lesson completions
    phase: profile?.currentPhase ?? "PHASE_0",
    skillMasteries: masteries.map((m) => m.mastery),
  };
}

/** Check all badges and award any newly earned ones. Returns newly awarded badge slugs. */
export async function checkAndAwardBadges(userId: string): Promise<BadgeDefinition[]> {
  const [context, existingBadges] = await Promise.all([
    buildBadgeContext(userId),
    prisma.userBadge.findMany({
      where: { userId },
      select: { badgeSlug: true },
    }),
  ]);

  const earned = new Set(existingBadges.map((b) => b.badgeSlug));
  const newlyAwarded: BadgeDefinition[] = [];

  for (const badge of BADGES) {
    if (earned.has(badge.slug)) continue;
    if (badge.check(context)) {
      await prisma.userBadge.create({
        data: { userId, badgeSlug: badge.slug },
      });
      const { check: _, ...definition } = badge;
      newlyAwarded.push(definition);
    }
  }

  return newlyAwarded;
}

/** Get all badges a user has earned. */
export async function getUserBadges(userId: string): Promise<
  Array<BadgeDefinition & { earnedAt: Date }>
> {
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    orderBy: { earnedAt: "desc" },
  });

  return userBadges
    .map((ub) => {
      const badge = BADGES.find((b) => b.slug === ub.badgeSlug);
      if (!badge) return null;
      const { check: _, ...definition } = badge;
      return { ...definition, earnedAt: ub.earnedAt };
    })
    .filter((b): b is BadgeDefinition & { earnedAt: Date } => b !== null);
}
