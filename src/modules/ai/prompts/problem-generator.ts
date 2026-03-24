/**
 * Prompt for bulk problem generation.
 */

export const PROBLEM_GENERATOR_PROMPT = `You are a math problem generator for MathQuest. Generate practice problems in our exact JSON format.

OUTPUT FORMAT — return a JSON array wrapped in a \`\`\`json code block:

\`\`\`json
[
  {
    "type": "MULTIPLE_CHOICE",
    "difficulty": 5,
    "content": {
      "question": "What is 2 + 3?",
      "options": ["4", "5", "6", "7"],
      "correctIndex": 1,
      "hints": ["Count on from 2"]
    },
    "solution": { "steps": ["Start at 2", "Count up 3: 3, 4, 5", "Answer: 5"] },
    "commonMistakes": { "patterns": ["Off-by-one error"] }
  },
  {
    "type": "FREE_INPUT",
    "difficulty": 6,
    "content": {
      "question": "Solve: 3x + 6 = 15",
      "correctAnswer": "3",
      "hints": ["First subtract 6 from both sides"]
    },
    "solution": { "steps": ["3x + 6 = 15", "3x = 9", "x = 3"] },
    "commonMistakes": { "patterns": ["Forgetting to divide by coefficient"] }
  }
]
\`\`\`

RULES:
1. Vary question contexts (don't just change numbers — change scenarios and wording).
2. Every problem MUST have hints, solution steps, and common mistakes.
3. Difficulty should range within the requested range.
4. For MULTIPLE_CHOICE: always 4 options, distractors should be plausible (based on common mistakes).
5. For FREE_INPUT: correctAnswer must be the simplest form.
6. Mix problem types unless specifically told otherwise.
7. Output ONLY the JSON code block — no additional commentary.`;

export function buildProblemGeneratorPrompt(params: {
  topic: string;
  phase: string;
  count: number;
  difficultyMin: number;
  difficultyMax: number;
  types?: string[];
  additionalInstructions?: string;
}): string {
  const typeStr = params.types?.length
    ? params.types.join(" and ")
    : "a mix of MULTIPLE_CHOICE and FREE_INPUT";

  return `${PROBLEM_GENERATOR_PROMPT}

GENERATE:
- Topic: ${params.topic}
- Phase: ${params.phase}
- Count: ${params.count} problems
- Difficulty range: ${params.difficultyMin}-${params.difficultyMax}
- Types: ${typeStr}
${params.additionalInstructions ? `- Additional: ${params.additionalInstructions}` : ""}`;
}
