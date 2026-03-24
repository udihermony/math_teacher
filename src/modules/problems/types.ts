export type { Problem, Submission, ProblemType } from "@/generated/prisma/client";

export interface MultipleChoiceContent {
  question: string;
  options: string[];
  correctIndex: number;
  hints?: string[];
}

export interface FreeInputContent {
  question: string;
  correctAnswer: string;
  hints?: string[];
  acceptEquivalent?: boolean;
}

export interface ProblemSolution {
  steps: string[];
}

export interface SubmissionResult {
  isCorrect: boolean;
  correctAnswer?: string;
  explanation?: string;
  xpEarned?: number;
  xp?: {
    totalXP: number;
    xpEarned: number;
    level: number;
    previousLevel: number;
    leveledUp: boolean;
    progress: number;
    xpToNext: number;
  };
  coins?: {
    earned: number;
    balance: number;
  };
  streak?: {
    current: number;
    isNewDay: boolean;
    broken: boolean;
  };
  newBadges?: Array<{
    slug: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
  }>;
}
