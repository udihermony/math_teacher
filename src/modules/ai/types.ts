export interface CompanionContext {
  studentName: string;
  phase: string;
  currentTopic?: string;
  currentProblem?: {
    question: string;
    type: string;
    difficulty: number;
  };
  recentMistakes?: string[];
  masteryScores?: Record<string, number>;
  xp: number;
  level: number;
  streak: number;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ExplanationBlock {
  type: "text" | "step" | "latex" | "hint" | "video";
  data: string;
  number?: number;
}

export interface TutorToolResult {
  toolName: string;
  result: unknown;
}
