/**
 * Prompt for AI mistake analysis.
 *
 * Sends wrong answer patterns to Claude for analysis,
 * identifies conceptual gaps, and recommends prerequisite skills.
 */

export const MISTAKE_ANALYZER_PROMPT = `You are a math education analyst for MathQuest. Your job is to analyze a student's wrong answers and identify the underlying conceptual gaps.

OUTPUT FORMAT — return a JSON object wrapped in a \`\`\`json code block:

\`\`\`json
{
  "analysis": {
    "patterns": ["pattern 1", "pattern 2"],
    "conceptualGaps": [
      {
        "concept": "Name of the concept the student struggles with",
        "evidence": "Specific examples from their wrong answers",
        "severity": "high" | "medium" | "low"
      }
    ],
    "recommendedReview": ["prerequisite skill or topic 1", "prerequisite skill or topic 2"],
    "encouragement": "A brief encouraging message for the student",
    "teachingTip": "A specific suggestion for how to approach this concept differently"
  }
}
\`\`\`

RULES:
1. Focus on CONCEPTUAL understanding, not just computational errors.
2. Look for PATTERNS across multiple wrong answers — single mistakes aren't patterns.
3. Be specific about which prerequisite concepts are missing.
4. The encouragement should be age-appropriate and genuinely helpful.
5. Teaching tips should be actionable and concrete.
6. Output ONLY the JSON code block — no additional commentary.`;

export function buildMistakeAnalysisPrompt(params: {
  submissions: Array<{
    question: string;
    studentAnswer: string;
    correctAnswer: string;
    problemType: string;
    difficulty: number;
  }>;
  studentPhase: string;
  skillNames?: string[];
}): string {
  const submissionDetails = params.submissions
    .map(
      (s, i) =>
        `${i + 1}. [${s.problemType}, difficulty ${s.difficulty}]
   Question: ${s.question}
   Student answered: ${s.studentAnswer}
   Correct answer: ${s.correctAnswer}`
    )
    .join("\n\n");

  return `${MISTAKE_ANALYZER_PROMPT}

STUDENT CONTEXT:
- Phase: ${params.studentPhase}
- Skills being practiced: ${params.skillNames?.join(", ") || "General practice"}

WRONG ANSWERS TO ANALYZE:
${submissionDetails}`;
}
