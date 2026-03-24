/**
 * Badge definitions for MathQuest.
 *
 * Each badge has a slug (stored in DB), display info, and
 * a check function that determines if the badge should be awarded.
 */

export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  category: "achievement" | "streak" | "mastery" | "explorer" | "special";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export interface BadgeCheckContext {
  totalXP: number;
  level: number;
  streak: number;
  totalProblems: number;
  correctProblems: number;
  totalLessons: number;
  phase: string;
  skillMasteries: number[]; // mastery percentages for each skill
}

export interface BadgeWithCheck extends BadgeDefinition {
  check: (ctx: BadgeCheckContext) => boolean;
}

export const BADGES: BadgeWithCheck[] = [
  // ── Achievement badges ──────────────────────────────
  {
    slug: "first-steps",
    name: "First Steps",
    description: "Solve your first problem",
    icon: "Footprints",
    category: "achievement",
    rarity: "common",
    check: (ctx) => ctx.totalProblems >= 1,
  },
  {
    slug: "problem-solver-10",
    name: "Problem Solver",
    description: "Solve 10 problems",
    icon: "Brain",
    category: "achievement",
    rarity: "common",
    check: (ctx) => ctx.totalProblems >= 10,
  },
  {
    slug: "problem-solver-50",
    name: "Math Enthusiast",
    description: "Solve 50 problems",
    icon: "Zap",
    category: "achievement",
    rarity: "uncommon",
    check: (ctx) => ctx.totalProblems >= 50,
  },
  {
    slug: "problem-solver-200",
    name: "Math Warrior",
    description: "Solve 200 problems",
    icon: "Sword",
    category: "achievement",
    rarity: "rare",
    check: (ctx) => ctx.totalProblems >= 200,
  },
  {
    slug: "problem-solver-1000",
    name: "Math Legend",
    description: "Solve 1000 problems",
    icon: "Crown",
    category: "achievement",
    rarity: "legendary",
    check: (ctx) => ctx.totalProblems >= 1000,
  },
  {
    slug: "perfect-10",
    name: "Perfect 10",
    description: "Get 10 correct answers in a row",
    icon: "Target",
    category: "achievement",
    rarity: "uncommon",
    check: (ctx) => ctx.correctProblems >= 10, // Simplified — actual consecutive tracking done at submission time
  },
  {
    slug: "sharpshooter",
    name: "Sharpshooter",
    description: "Maintain 90%+ accuracy over 50 problems",
    icon: "Crosshair",
    category: "achievement",
    rarity: "rare",
    check: (ctx) =>
      ctx.totalProblems >= 50 && ctx.correctProblems / ctx.totalProblems >= 0.9,
  },

  // ── Streak badges ───────────────────────────────────
  {
    slug: "streak-3",
    name: "Getting Started",
    description: "3-day practice streak",
    icon: "Flame",
    category: "streak",
    rarity: "common",
    check: (ctx) => ctx.streak >= 3,
  },
  {
    slug: "streak-7",
    name: "Week Warrior",
    description: "7-day practice streak",
    icon: "Flame",
    category: "streak",
    rarity: "uncommon",
    check: (ctx) => ctx.streak >= 7,
  },
  {
    slug: "streak-30",
    name: "Monthly Champion",
    description: "30-day practice streak",
    icon: "Flame",
    category: "streak",
    rarity: "rare",
    check: (ctx) => ctx.streak >= 30,
  },
  {
    slug: "streak-100",
    name: "Unstoppable",
    description: "100-day practice streak",
    icon: "Flame",
    category: "streak",
    rarity: "legendary",
    check: (ctx) => ctx.streak >= 100,
  },

  // ── Mastery badges ──────────────────────────────────
  {
    slug: "first-mastery",
    name: "Skill Unlocked",
    description: "Master your first skill (100%)",
    icon: "Star",
    category: "mastery",
    rarity: "uncommon",
    check: (ctx) => ctx.skillMasteries.some((m) => m >= 100),
  },
  {
    slug: "mastery-5",
    name: "Well Rounded",
    description: "Master 5 skills",
    icon: "Stars",
    category: "mastery",
    rarity: "rare",
    check: (ctx) => ctx.skillMasteries.filter((m) => m >= 100).length >= 5,
  },
  {
    slug: "mastery-20",
    name: "Grandmaster",
    description: "Master 20 skills",
    icon: "Trophy",
    category: "mastery",
    rarity: "epic",
    check: (ctx) => ctx.skillMasteries.filter((m) => m >= 100).length >= 20,
  },

  // ── Explorer badges ─────────────────────────────────
  {
    slug: "phase-explorer",
    name: "Phase Explorer",
    description: "Advance to Explorer phase",
    icon: "Compass",
    category: "explorer",
    rarity: "uncommon",
    check: (ctx) => ctx.phase !== "FOUNDATIONS",
  },
  {
    slug: "phase-builder",
    name: "Master Builder",
    description: "Advance to Builder phase",
    icon: "Hammer",
    category: "explorer",
    rarity: "rare",
    check: (ctx) =>
      ["BUILDER", "CHALLENGER", "IB_READY"].includes(ctx.phase),
  },
  {
    slug: "phase-ib",
    name: "IB Scholar",
    description: "Reach IB Ready phase",
    icon: "GraduationCap",
    category: "explorer",
    rarity: "legendary",
    check: (ctx) => ctx.phase === "IB_READY",
  },

  // ── Level badges ────────────────────────────────────
  {
    slug: "level-5",
    name: "Rising Star",
    description: "Reach Level 5",
    icon: "TrendingUp",
    category: "achievement",
    rarity: "common",
    check: (ctx) => ctx.level >= 5,
  },
  {
    slug: "level-10",
    name: "Double Digits",
    description: "Reach Level 10",
    icon: "Medal",
    category: "achievement",
    rarity: "uncommon",
    check: (ctx) => ctx.level >= 10,
  },
  {
    slug: "level-25",
    name: "Veteran",
    description: "Reach Level 25",
    icon: "Shield",
    category: "achievement",
    rarity: "rare",
    check: (ctx) => ctx.level >= 25,
  },
  {
    slug: "level-50",
    name: "Elite",
    description: "Reach Level 50",
    icon: "Gem",
    category: "achievement",
    rarity: "epic",
    check: (ctx) => ctx.level >= 50,
  },
];

/** Get badge definition by slug (display info only). */
export function getBadgeDefinition(slug: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.slug === slug);
}

/** Get all badge definitions (display info only, no check functions). */
export function getAllBadgeDefinitions(): BadgeDefinition[] {
  return BADGES.map(({ check: _, ...rest }) => rest);
}

/** Rarity colors for UI. */
export const RARITY_COLORS: Record<BadgeDefinition["rarity"], string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};
