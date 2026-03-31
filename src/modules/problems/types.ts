export type { Problem, Submission, ProblemType } from "@/generated/prisma/client";

export interface VariableSpec {
  min?: number;
  max?: number;
  step?: number;
  values?: number[];
  exclude?: number[];
  formula?: string;
}

export interface ProblemRandomization {
  enabled?: boolean;
  questionTemplate?: string;
  optionTemplates?: string[];
  hintTemplates?: string[];
  solutionTemplates?: string[];
  correctAnswerFormula?: string;
  correctIndex?: number;
  correctIndices?: number[];
  variables?: Record<string, VariableSpec>;
  constraints?: string[];
  maxAttempts?: number;
}

export interface MultipleChoiceContent {
  question: string;
  options: string[];
  correctIndex: number;
  hints?: string[];
  randomization?: ProblemRandomization;
}

export interface MultiSelectContent {
  question: string;
  options: string[];
  correctIndices: number[];
  hints?: string[];
  randomization?: ProblemRandomization;
}

export interface FreeInputContent {
  question: string;
  correctAnswer: string;
  hints?: string[];
  acceptEquivalent?: boolean;
  randomization?: ProblemRandomization;
}

export interface ProblemSolution {
  steps: string[];
}

export interface ProblemInstance {
  seed: string;
  variables?: Record<string, number>;
  content: MultipleChoiceContent | MultiSelectContent | FreeInputContent;
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
