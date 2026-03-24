/**
 * Spaced repetition scheduler for MathQuest.
 *
 * Uses a simplified SM-2 algorithm adapted for math skills.
 * Schedules reviews based on mastery level and performance quality.
 *
 * Intervals (in days):
 *   Quality 0-2 (poor):   reset to 1 day
 *   Quality 3 (okay):     interval * 1.2
 *   Quality 4 (good):     interval * 2.0
 *   Quality 5 (perfect):  interval * 2.5
 */

import { prisma } from "@/lib/db";

/** Quality rating for a review session (0 = complete fail, 5 = perfect). */
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

/** Map a submission result to a quality score. */
export function rateQuality(params: {
  isCorrect: boolean;
  timeSpent?: number;
  expectedTime?: number;
  attempts?: number;
}): ReviewQuality {
  const { isCorrect, timeSpent, expectedTime, attempts = 1 } = params;

  if (!isCorrect) {
    return attempts > 2 ? 0 : 1;
  }

  // Correct answer — rate based on speed and attempts
  if (attempts > 1) return 3;

  if (timeSpent && expectedTime) {
    if (timeSpent < expectedTime * 0.5) return 5; // Very fast
    if (timeSpent < expectedTime) return 4; // Good speed
  }

  return 4; // Default for correct first attempt
}

/** Calculate the next review date based on quality and current interval. */
export function calculateNextReview(params: {
  quality: ReviewQuality;
  lastReview: Date;
  currentIntervalDays?: number;
}): { nextReview: Date; intervalDays: number } {
  const { quality, lastReview, currentIntervalDays = 1 } = params;

  let intervalDays: number;

  if (quality < 3) {
    // Poor performance — reset interval
    intervalDays = 1;
  } else if (quality === 3) {
    // Okay — slight increase
    intervalDays = Math.max(1, Math.round(currentIntervalDays * 1.2));
  } else if (quality === 4) {
    // Good — double
    intervalDays = Math.round(currentIntervalDays * 2.0);
  } else {
    // Perfect — aggressive spacing
    intervalDays = Math.round(currentIntervalDays * 2.5);
  }

  // Cap at 90 days
  intervalDays = Math.min(intervalDays, 90);

  const nextReview = new Date(lastReview);
  nextReview.setDate(nextReview.getDate() + intervalDays);

  return { nextReview, intervalDays };
}

/** Update a skill's review schedule after a practice session. */
export async function updateReviewSchedule(params: {
  userId: string;
  skillId: string;
  quality: ReviewQuality;
}): Promise<{ nextReview: Date; mastery: number }> {
  const { userId, skillId, quality } = params;

  const progress = await prisma.progress.findUnique({
    where: { userId_skillId: { userId, skillId } },
  });

  const lastReview = progress?.lastReview ?? new Date();

  // Calculate current interval from stored dates
  let currentIntervalDays = 1;
  if (progress?.lastReview && progress?.nextReview) {
    currentIntervalDays = Math.max(
      1,
      Math.round(
        (progress.nextReview.getTime() - progress.lastReview.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  }

  const { nextReview, intervalDays: _intervalDays } = calculateNextReview({
    quality,
    lastReview,
    currentIntervalDays,
  });

  // Adjust mastery based on quality
  let masteryDelta: number;
  if (quality >= 4) {
    masteryDelta = 5;
  } else if (quality === 3) {
    masteryDelta = 2;
  } else {
    masteryDelta = -10;
  }

  const now = new Date();
  const updated = await prisma.progress.upsert({
    where: { userId_skillId: { userId, skillId } },
    create: {
      userId,
      skillId,
      mastery: Math.max(0, Math.min(100, 10 + masteryDelta)),
      lastReview: now,
      nextReview,
    },
    update: {
      mastery: { increment: masteryDelta },
      lastReview: now,
      nextReview,
    },
  });

  // Clamp mastery to 0-100
  if (updated.mastery < 0 || updated.mastery > 100) {
    const clamped = Math.max(0, Math.min(100, updated.mastery));
    await prisma.progress.update({
      where: { id: updated.id },
      data: { mastery: clamped },
    });
    return { nextReview, mastery: clamped };
  }

  return { nextReview, mastery: updated.mastery };
}

/** Get skills due for review (nextReview <= now). */
export async function getSkillsDueForReview(userId: string): Promise<
  Array<{ skillId: string; skillName: string; mastery: number; overdueDays: number }>
> {
  const now = new Date();

  const dueSkills = await prisma.progress.findMany({
    where: {
      userId,
      nextReview: { lte: now },
    },
    include: {
      skill: { select: { name: true } },
    },
    orderBy: { nextReview: "asc" },
  });

  return dueSkills.map((p) => ({
    skillId: p.skillId,
    skillName: p.skill.name,
    mastery: p.mastery,
    overdueDays: Math.round(
      (now.getTime() - (p.nextReview?.getTime() ?? now.getTime())) /
        (1000 * 60 * 60 * 24)
    ),
  }));
}
