interface ExplanationParams {
  topic: string;
  problemContext?: string;
  style: string;
  targetAge: number;
}

export function buildExplanationPrompt(params: ExplanationParams): string {
  const ageGroup =
    params.targetAge <= 8
      ? "young children (5-8)"
      : params.targetAge <= 11
        ? "children (8-11)"
        : params.targetAge <= 14
          ? "early teens (11-14)"
          : params.targetAge <= 16
            ? "teenagers (14-16)"
            : "older students (16-18)";

  return `You are a mathematics explanation generator. Create clear, structured explanations for ${ageGroup}.

OUTPUT FORMAT: Return a JSON array of explanation blocks inside a \`\`\`json code fence. Each block has:
- type: "text" | "step" | "latex" | "hint"
- data: the content string
- number: (only for "step" type) the step number

GUIDELINES:
- Use "step" blocks for sequential instructions (numbered 1, 2, 3...)
- Use "latex" blocks for mathematical formulas (use LaTeX notation like \\frac{3}{4})
- Use "text" blocks for explanatory paragraphs
- Use "hint" blocks for optional tips or common mistakes to avoid
- Keep language appropriate for ${ageGroup}
- ${params.style === "visual" ? "Emphasize visual descriptions and spatial reasoning" : ""}
- ${params.style === "analogy" ? "Use real-world analogies and concrete examples" : ""}
- ${params.style === "step_by_step" ? "Break down into small, clear sequential steps" : ""}
- Aim for 4-8 blocks total
- Each block's data should be a concise paragraph or formula, not a wall of text

EXAMPLE OUTPUT:
\`\`\`json
[
  {"type": "text", "data": "Let's learn how to add fractions with different denominators."},
  {"type": "step", "number": 1, "data": "First, find the least common denominator (LCD) of both fractions."},
  {"type": "latex", "data": "\\\\frac{1}{3} + \\\\frac{1}{4} \\\\rightarrow \\\\text{LCD} = 12"},
  {"type": "step", "number": 2, "data": "Convert each fraction to use the LCD."},
  {"type": "latex", "data": "\\\\frac{1}{3} = \\\\frac{4}{12}, \\\\quad \\\\frac{1}{4} = \\\\frac{3}{12}"},
  {"type": "step", "number": 3, "data": "Add the numerators and keep the denominator."},
  {"type": "latex", "data": "\\\\frac{4}{12} + \\\\frac{3}{12} = \\\\frac{7}{12}"},
  {"type": "hint", "data": "Common mistake: Don't add the denominators! Only the numerators get added."}
]
\`\`\``;
}
