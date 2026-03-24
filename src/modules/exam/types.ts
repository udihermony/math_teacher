/**
 * IB Mathematics: Analysis and Approaches exam types.
 */

export type PaperType = "PAPER_1" | "PAPER_2";
export type IBLevel = "SL" | "HL";

export interface PaperConfig {
  type: PaperType;
  level: IBLevel;
  name: string;
  description: string;
  timeLimitMinutes: number;
  calculatorAllowed: boolean;
  sections: SectionConfig[];
  totalMarks: number;
}

export interface SectionConfig {
  name: string;
  description: string;
  questionCount: number;
  questionType: "short_answer" | "extended_response";
  marksPerQuestion: number[];
}

export interface ExamSession {
  id: string;
  paperType: PaperType;
  level: IBLevel;
  status: "not_started" | "in_progress" | "paused" | "completed" | "timed_out";
  startedAt?: string;
  completedAt?: string;
  timeRemainingSeconds: number;
  totalMarks: number;
  earnedMarks: number;
  answers: Record<string, ExamAnswer>;
}

export interface ExamAnswer {
  questionId: string;
  answer: string;
  marksAwarded?: number;
  maxMarks: number;
  feedback?: string;
  rubricBreakdown?: RubricMark[];
}

export interface RubricMark {
  criterion: "M" | "A" | "R" | "AG" | "FT";
  label: string;
  awarded: number;
  maximum: number;
  comment?: string;
}

export interface ExamQuestion {
  id: string;
  section: number;
  questionNumber: number;
  parts: QuestionPart[];
  totalMarks: number;
  topic: string;
}

export interface QuestionPart {
  partLabel: string; // "a", "b", "c(i)", etc.
  prompt: string;
  marks: number;
  markScheme?: string;
}

/** IB grade boundaries (approximate, based on historical data). */
export const IB_GRADE_BOUNDARIES: Record<IBLevel, { grade: number; minPercent: number }[]> = {
  SL: [
    { grade: 7, minPercent: 80 },
    { grade: 6, minPercent: 68 },
    { grade: 5, minPercent: 56 },
    { grade: 4, minPercent: 44 },
    { grade: 3, minPercent: 32 },
    { grade: 2, minPercent: 20 },
    { grade: 1, minPercent: 0 },
  ],
  HL: [
    { grade: 7, minPercent: 76 },
    { grade: 6, minPercent: 64 },
    { grade: 5, minPercent: 52 },
    { grade: 4, minPercent: 40 },
    { grade: 3, minPercent: 28 },
    { grade: 2, minPercent: 16 },
    { grade: 1, minPercent: 0 },
  ],
};

/** Get IB grade from percentage. */
export function getIBGrade(percent: number, level: IBLevel): number {
  const boundaries = IB_GRADE_BOUNDARIES[level];
  for (const b of boundaries) {
    if (percent >= b.minPercent) return b.grade;
  }
  return 1;
}
