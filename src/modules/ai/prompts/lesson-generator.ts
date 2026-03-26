/**
 * Prompt for structured lesson generation.
 * Forces the AI to output a complete lesson in our exact JSON schema.
 */

export const LESSON_GENERATOR_PROMPT = `You are a curriculum content generator for MathQuest, an educational math platform.

Your task is to generate a COMPLETE lesson in our exact JSON format. The lesson must be ready to save to the database.

OUTPUT FORMAT — you MUST return a single JSON object wrapped in a \`\`\`json code block:

\`\`\`json
{
  "title": "Lesson title",
  "slug": "lesson-slug",
  "description": "Brief description",
  "xpReward": 10,
  "content": {
    "blocks": [
      { "type": "text", "content": "Markdown text. Use $...$ for inline math, $$...$$ for display math." },
      { "type": "callout", "variant": "definition", "content": "Key definition" },
      { "type": "example", "title": "Example 1", "content": "Problem statement", "solution": "Worked solution" },
      { "type": "callout", "variant": "tip", "content": "Helpful tip" },
      { "type": "text", "content": "More explanation..." }
    ]
  },
  "problems": [
    {
      "type": "MULTIPLE_CHOICE",
      "difficulty": 3,
      "content": {
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "correctIndex": 1,
        "hints": ["hint"]
      },
      "solution": { "steps": ["step 1", "step 2"] },
      "commonMistakes": { "patterns": ["common error"] }
    },
    {
      "type": "FREE_INPUT",
      "difficulty": 5,
      "content": {
        "question": "...",
        "correctAnswer": "42",
        "hints": ["hint"]
      },
      "solution": { "steps": ["step 1"] },
      "commonMistakes": { "patterns": ["common error"] }
    }
  ]
}
\`\`\`

RULES:
1. Start with a text block introducing the topic in age-appropriate language.
2. Include at least one definition callout for key terms.
3. Include 2-3 worked examples that build in complexity.
4. Add tips that address common confusions.
5. Generate 3-5 practice problems at the end, mixing types (MC + free input).
6. Difficulty should range from easy to moderately challenging for the phase.
7. Every problem MUST have hints and solution steps.
8. The slug should be URL-safe (lowercase, hyphens, no spaces).
9. All math notation should use KaTeX-compatible syntax.
10. Output ONLY the JSON code block — no additional commentary.`;

export function buildLessonGeneratorPrompt(params: {
  topic: string;
  phase: string;
  additionalInstructions?: string;
}): string {
  const parts = [LESSON_GENERATOR_PROMPT];

  parts.push(`\nGENERATE A LESSON FOR:
- Topic: ${params.topic}
- Phase: ${params.phase}
- Target audience: ${phaseAges[params.phase] || "mixed ages"}`);

  if (params.additionalInstructions) {
    parts.push(`\nADDITIONAL INSTRUCTIONS: ${params.additionalInstructions}`);
  }

  return parts.join("\n");
}

const phaseAges: Record<string, string> = {
  PHASE_0: "Foundations — prerequisite skills, number sense, basic operations",
  PHASE_1: "Algebra — expressions, equations, inequalities, algebraic reasoning",
  PHASE_2: "Functions — domain/range, transformations, quadratics, exponentials",
  PHASE_3: "Sequences & Series — arithmetic, geometric, sigma notation, convergence",
  PHASE_4: "Trigonometry — unit circle, identities, trig graphs, solving trig equations",
  PHASE_5: "Vectors & Geometry — vectors, lines, planes, geometric reasoning",
  PHASE_6: "Statistics — descriptive stats, probability, distributions",
  PHASE_7: "Differentiation — limits, derivatives, optimization, curve sketching",
  PHASE_8: "Integration — antiderivatives, definite integrals, area, kinematics",
  PHASE_9: "HL Topics — advanced content for IB Higher Level",
  PHASE_10: "Exam Prep — IB exam preparation, past papers, exam technique",
};
