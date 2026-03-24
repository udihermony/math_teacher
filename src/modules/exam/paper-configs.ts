import type { PaperConfig } from "./types";

export const PAPER_CONFIGS: PaperConfig[] = [
  {
    type: "PAPER_1",
    level: "SL",
    name: "Paper 1 — SL",
    description: "Short and extended response questions. No calculator allowed.",
    timeLimitMinutes: 90,
    calculatorAllowed: false,
    totalMarks: 80,
    sections: [
      {
        name: "Section A",
        description: "Short answer questions",
        questionCount: 8,
        questionType: "short_answer",
        marksPerQuestion: [5, 5, 6, 6, 7, 7, 7, 7],
      },
      {
        name: "Section B",
        description: "Extended response questions",
        questionCount: 2,
        questionType: "extended_response",
        marksPerQuestion: [15, 15],
      },
    ],
  },
  {
    type: "PAPER_2",
    level: "SL",
    name: "Paper 2 — SL",
    description: "Short and extended response questions. Calculator required.",
    timeLimitMinutes: 90,
    calculatorAllowed: true,
    totalMarks: 80,
    sections: [
      {
        name: "Section A",
        description: "Short answer questions",
        questionCount: 8,
        questionType: "short_answer",
        marksPerQuestion: [5, 5, 6, 6, 7, 7, 7, 7],
      },
      {
        name: "Section B",
        description: "Extended response questions",
        questionCount: 2,
        questionType: "extended_response",
        marksPerQuestion: [15, 15],
      },
    ],
  },
  {
    type: "PAPER_1",
    level: "HL",
    name: "Paper 1 — HL",
    description: "Short and extended response questions. No calculator allowed.",
    timeLimitMinutes: 120,
    calculatorAllowed: false,
    totalMarks: 110,
    sections: [
      {
        name: "Section A",
        description: "Short answer questions",
        questionCount: 10,
        questionType: "short_answer",
        marksPerQuestion: [5, 5, 6, 6, 7, 7, 7, 7, 8, 8],
      },
      {
        name: "Section B",
        description: "Extended response questions",
        questionCount: 3,
        questionType: "extended_response",
        marksPerQuestion: [14, 14, 16],
      },
    ],
  },
  {
    type: "PAPER_2",
    level: "HL",
    name: "Paper 2 — HL",
    description: "Short and extended response questions. Calculator required.",
    timeLimitMinutes: 120,
    calculatorAllowed: true,
    totalMarks: 110,
    sections: [
      {
        name: "Section A",
        description: "Short answer questions",
        questionCount: 10,
        questionType: "short_answer",
        marksPerQuestion: [5, 5, 6, 6, 7, 7, 7, 7, 8, 8],
      },
      {
        name: "Section B",
        description: "Extended response questions",
        questionCount: 3,
        questionType: "extended_response",
        marksPerQuestion: [14, 14, 16],
      },
    ],
  },
];

export function getPaperConfig(type: string, level: string): PaperConfig | undefined {
  return PAPER_CONFIGS.find((p) => p.type === type && p.level === level);
}
