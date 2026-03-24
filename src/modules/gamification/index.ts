export {
  getLevelForXP,
  xpToNextLevel,
  levelProgress,
  calculateXPEarned,
  buildXPResult,
  LEVEL_THRESHOLDS,
  MAX_LEVEL,
} from "./xp-calculator";
export type { XPResult } from "./xp-calculator";

export { updateStreak, getStreakInfo } from "./streak-tracker";
export type { StreakResult } from "./streak-tracker";

export {
  getBadgeDefinition,
  getAllBadgeDefinitions,
  RARITY_COLORS,
  BADGES,
} from "./badge-definitions";
export type { BadgeDefinition, BadgeCheckContext } from "./badge-definitions";

export { checkAndAwardBadges, getUserBadges } from "./badge-checker";
