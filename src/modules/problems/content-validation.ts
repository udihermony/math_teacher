import { z } from "zod";
import { instantiateProblem } from "./randomization";

const variableSpecSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  values: z.array(z.number()).min(1).optional(),
  exclude: z.array(z.number()).optional(),
  formula: z.string().min(1).optional(),
}).superRefine((spec, ctx) => {
  if (!spec.formula && typeof spec.min !== "number" && !spec.values?.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Variable spec needs values, a min/max range, or a formula",
    });
  }

  if (!spec.formula && spec.values == null && (typeof spec.min !== "number" || typeof spec.max !== "number")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Range-based variable specs require both min and max",
    });
  }
});

const randomizationSchema = z.object({
  enabled: z.boolean().optional(),
  questionTemplate: z.string().min(1).optional(),
  optionTemplates: z.array(z.string().min(1)).min(2).optional(),
  hintTemplates: z.array(z.string().min(1)).optional(),
  solutionTemplates: z.array(z.string().min(1)).optional(),
  correctAnswerFormula: z.string().min(1).optional(),
  correctIndex: z.number().int().min(0).optional(),
  correctIndices: z.array(z.number().int().min(0)).min(1).optional(),
  variables: z.record(z.string(), variableSpecSchema).optional(),
  constraints: z.array(z.string().min(1)).optional(),
  maxAttempts: z.number().int().min(1).max(500).optional(),
});

export const problemContentSchema = z.record(z.string(), z.unknown());

export function validateProblemContent(
  type: string,
  rawContent: Record<string, unknown>
): { ok: true; content: Record<string, unknown> } | { ok: false; error: string } {
  const parsedContent = problemContentSchema.safeParse(rawContent);
  if (!parsedContent.success) {
    return { ok: false, error: "Problem content must be a JSON object" };
  }

  const content = parsedContent.data;
  const randomizationRaw =
    content.randomization && typeof content.randomization === "object"
      ? content.randomization
      : null;

  const randomization = randomizationRaw
    ? randomizationSchema.safeParse(randomizationRaw)
    : null;
  const randomizationData = randomization?.success ? randomization.data : null;
  const randomizationError =
    randomization && !randomization.success
      ? randomization.error.issues[0]?.message
      : null;

  if (randomizationRaw && randomizationError) {
    return {
      ok: false,
      error: randomizationError ?? "Invalid randomization config",
    };
  }

  const hasQuestion =
    typeof content.question === "string" && content.question.trim().length > 0;
  const hasQuestionTemplate =
    typeof randomizationData?.questionTemplate === "string" &&
    randomizationData.questionTemplate.trim().length > 0;

  if (!hasQuestion && !hasQuestionTemplate) {
    return {
      ok: false,
      error: "Problem content requires question or randomization.questionTemplate",
    };
  }

  if (type === "MULTIPLE_CHOICE") {
    const staticOptions =
      Array.isArray(content.options) &&
      content.options.every((option) => typeof option === "string" && option.trim().length > 0)
        ? (content.options as string[])
        : null;
    const randomizedOptions = randomizationData?.optionTemplates;
    const correctIndex =
      typeof content.correctIndex === "number"
        ? content.correctIndex
        : randomizationData
          ? randomizationData.correctIndex
          : undefined;

    const options = randomizedOptions ?? staticOptions ?? null;
    if (!options || options.length < 2) {
      return {
        ok: false,
        error: "Multiple choice problems require options or randomization.optionTemplates",
      };
    }
    if (typeof correctIndex !== "number" || correctIndex < 0 || correctIndex >= options.length) {
      return {
        ok: false,
        error: "Multiple choice problems require a valid correctIndex",
      };
    }
  }

  if (type === "MULTI_SELECT") {
    const staticOptions =
      Array.isArray(content.options) &&
      content.options.every((option) => typeof option === "string" && option.trim().length > 0)
        ? (content.options as string[])
        : null;
    const randomizedOptions = randomizationData?.optionTemplates;
    const options = randomizedOptions ?? staticOptions ?? null;
    const correctIndices =
      Array.isArray(content.correctIndices) &&
      content.correctIndices.every((index) => typeof index === "number")
        ? (content.correctIndices as number[])
        : randomizationData?.correctIndices;

    if (!options || options.length < 2) {
      return {
        ok: false,
        error: "Multi select problems require options or randomization.optionTemplates",
      };
    }

    if (!correctIndices || correctIndices.length === 0) {
      return {
        ok: false,
        error: "Multi select problems require correctIndices or randomization.correctIndices",
      };
    }

    const uniqueIndices = new Set(correctIndices);
    if (uniqueIndices.size !== correctIndices.length) {
      return {
        ok: false,
        error: "Multi select problems require unique correctIndices",
      };
    }

    if (correctIndices.some((index) => index < 0 || index >= options.length)) {
      return {
        ok: false,
        error: "Multi select problems require valid correctIndices",
      };
    }
  }

  if (type === "FREE_INPUT") {
    const hasStaticAnswer =
      typeof content.correctAnswer === "string" &&
      content.correctAnswer.trim().length > 0;
    const hasFormula =
      typeof randomizationData?.correctAnswerFormula === "string" &&
      randomizationData.correctAnswerFormula.trim().length > 0;

    if (!hasStaticAnswer && !hasFormula) {
      return {
        ok: false,
        error: "Free input problems require correctAnswer or randomization.correctAnswerFormula",
      };
    }
  }

  // Trial instantiation: try several seeds to catch expression errors and
  // problems that can never produce distinct options.
  if (randomizationData?.variables && Object.keys(randomizationData.variables).length > 0) {
    const seeds = ["__val_1__", "__val_2__", "__val_3__"];
    let lastError: string | null = null;
    let anySucceeded = false;

    for (const seed of seeds) {
      try {
        instantiateProblem(
          { type, content, solution: null },
          seed
        );
        anySucceeded = true;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (!anySucceeded && lastError) {
      return {
        ok: false,
        error: `Randomization trial failed: ${lastError}`,
      };
    }
  }

  return { ok: true, content };
}
