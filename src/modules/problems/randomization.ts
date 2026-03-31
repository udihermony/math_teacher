import type {
  FreeInputContent,
  MultiSelectContent,
  MultipleChoiceContent,
  ProblemInstance,
  ProblemRandomization,
  ProblemSolution,
  VariableSpec,
} from "./types";

interface RandomizedProblemLike {
  type: string;
  content: Record<string, unknown>;
  solution?: ProblemSolution | null;
}

interface InstantiatedProblem {
  content: MultipleChoiceContent | MultiSelectContent | FreeInputContent;
  solution?: ProblemSolution | null;
  instance?: ProblemInstance;
}

const SAFE_EXPRESSION = /^[\dA-Za-z_+\-*/().,\s<>=!&|%]+$/;

const MATH_FUNCTIONS: Record<string, number | ((...args: number[]) => number)> = {
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sqrt: Math.sqrt,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  sign: Math.sign,
  PI: Math.PI,
};

const MATH_FUNCTION_NAMES = new Set(Object.keys(MATH_FUNCTIONS));

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    const rounded = Math.round(value * 1e10) / 1e10;
    return String(rounded);
  }
  return String(value);
}

function evaluateExpression(expression: string, variables: Record<string, number>): unknown {
  if (!SAFE_EXPRESSION.test(expression)) {
    throw new Error(`Unsafe expression: ${expression}`);
  }

  const identifiers = expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  for (const identifier of identifiers) {
    if (!(identifier in variables) && !MATH_FUNCTION_NAMES.has(identifier)) {
      throw new Error(`Unknown identifier in expression: ${identifier}`);
    }
  }

  const allKeys = [...Object.keys(MATH_FUNCTIONS), ...Object.keys(variables)];
  const allValues = [...Object.values(MATH_FUNCTIONS), ...Object.values(variables)];
  return Function(...allKeys, `"use strict"; return (${expression});`)(...allValues) as unknown;
}

function evaluateNumericExpression(expression: string, variables: Record<string, number>): number {
  const value = evaluateExpression(expression, variables);
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error(`Expression did not produce a finite number: ${expression}`);
  }
  return Math.abs(value) < 1e-10 ? 0 : Math.round(value * 1e10) / 1e10;
}

function interpolateTemplate(template: string, variables: Record<string, number>): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expr: string) =>
    formatValue(evaluateExpression(expr, variables))
  );
}

function sampleFromSpec(spec: VariableSpec, rng: () => number): number {
  const exclude = new Set(spec.exclude ?? []);

  if (Array.isArray(spec.values) && spec.values.length > 0) {
    const candidates = spec.values.filter((value) => !exclude.has(value));
    if (candidates.length === 0) throw new Error("Variable values list is empty after exclusions");
    return candidates[Math.floor(rng() * candidates.length)];
  }

  if (typeof spec.min !== "number" || typeof spec.max !== "number") {
    throw new Error("Variable range requires min and max");
  }

  const step = spec.step ?? 1;
  if (step <= 0) throw new Error("Variable step must be positive");

  const count = Math.floor((spec.max - spec.min) / step) + 1;
  const candidates = Array.from({ length: Math.max(count, 0) }, (_, idx) => {
    const value = spec.min! + idx * step;
    return Math.round(value * 1e10) / 1e10;
  }).filter((value) => value <= spec.max! + 1e-10 && !exclude.has(value));

  if (candidates.length === 0) {
    throw new Error("Variable range produced no valid candidates");
  }

  return candidates[Math.floor(rng() * candidates.length)];
}

function buildVariables(
  specs: Record<string, VariableSpec>,
  rng: () => number
): Record<string, number> {
  const variables: Record<string, number> = {};

  for (const [name, spec] of Object.entries(specs)) {
    if (spec.formula) {
      variables[name] = evaluateNumericExpression(spec.formula, variables);
    } else {
      variables[name] = sampleFromSpec(spec, rng);
    }
  }

  return variables;
}

function hasDistinctOptions(options: string[]): boolean {
  return new Set(options.map((option) => option.trim())).size === options.length;
}

function hasUniqueIndices(indices: number[]): boolean {
  return new Set(indices).size === indices.length;
}

function instantiateRandomizedProblem(
  problem: RandomizedProblemLike,
  randomization: ProblemRandomization,
  seed: string
): InstantiatedProblem {
  const maxAttempts = randomization.maxAttempts ?? 50;
  const specs = randomization.variables ?? {};

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const rng = createRng(`${seed}:${attempt}`);
    const variables = buildVariables(specs, rng);
    const constraints = randomization.constraints ?? [];
    const constraintsPass = constraints.every((constraint) => Boolean(evaluateExpression(constraint, variables)));
    if (!constraintsPass) continue;

    const questionTemplate =
      randomization.questionTemplate ??
      (typeof problem.content.question === "string" ? (problem.content.question as string) : "");
    const hints = (
      randomization.hintTemplates ??
      (Array.isArray(problem.content.hints) ? (problem.content.hints as string[]) : undefined)
    )?.map((hint) => interpolateTemplate(hint, variables));

    const solutionSteps = (
      randomization.solutionTemplates ??
      (Array.isArray(problem.solution?.steps) ? problem.solution.steps : undefined)
    )?.map((step) => interpolateTemplate(step, variables));

    if (problem.type === "MULTIPLE_CHOICE") {
      const optionTemplates =
        randomization.optionTemplates ??
        (Array.isArray(problem.content.options) ? (problem.content.options as string[]) : []);
      const options = optionTemplates.map((option) => interpolateTemplate(option, variables));
      const correctIndex =
        randomization.correctIndex ??
        (typeof problem.content.correctIndex === "number" ? (problem.content.correctIndex as number) : -1);

      if (!questionTemplate || options.length < 2 || correctIndex < 0 || correctIndex >= options.length) {
        throw new Error("Invalid randomized multiple choice problem configuration");
      }
      if (!hasDistinctOptions(options)) continue;

      return {
        content: {
          question: interpolateTemplate(questionTemplate, variables),
          options,
          correctIndex,
          hints,
        },
        solution: solutionSteps ? { steps: solutionSteps } : problem.solution,
        instance: {
          seed,
          variables,
          content: {
            question: interpolateTemplate(questionTemplate, variables),
            options,
            correctIndex,
            hints,
          },
        },
      };
    }

    if (problem.type === "MULTI_SELECT") {
      const optionTemplates =
        randomization.optionTemplates ??
        (Array.isArray(problem.content.options) ? (problem.content.options as string[]) : []);
      const options = optionTemplates.map((option) => interpolateTemplate(option, variables));
      const correctIndices =
        randomization.correctIndices ??
        (Array.isArray(problem.content.correctIndices) ? (problem.content.correctIndices as number[]) : []);

      if (!questionTemplate || options.length < 2 || correctIndices.length === 0) {
        throw new Error("Invalid randomized multi select problem configuration");
      }
      if (!hasDistinctOptions(options) || !hasUniqueIndices(correctIndices)) continue;
      if (correctIndices.some((index) => index < 0 || index >= options.length)) continue;

      return {
        content: {
          question: interpolateTemplate(questionTemplate, variables),
          options,
          correctIndices,
          hints,
        },
        solution: solutionSteps ? { steps: solutionSteps } : problem.solution,
        instance: {
          seed,
          variables,
          content: {
            question: interpolateTemplate(questionTemplate, variables),
            options,
            correctIndices,
            hints,
          },
        },
      };
    }

    if (problem.type === "FREE_INPUT") {
      let answerFormula =
        randomization.correctAnswerFormula ??
        (typeof problem.content.correctAnswer === "string" ? (problem.content.correctAnswer as string) : "");
      if (!questionTemplate || !answerFormula) {
        throw new Error("Invalid randomized free input problem configuration");
      }

      // Auto-fix common LLM mistake: "a + '/' + b" → "{{a}}/{{b}}"
      answerFormula = answerFormula.replace(
        /^(\w+)\s*\+\s*['"]\/['"]\s*\+\s*(\w+)$/,
        "{{$1}}/{{$2}}"
      );

      const correctAnswer = answerFormula.includes("{{")
        ? interpolateTemplate(answerFormula, variables)
        : formatValue(evaluateExpression(answerFormula, variables));

      return {
        content: {
          question: interpolateTemplate(questionTemplate, variables),
          correctAnswer,
          hints,
          acceptEquivalent: Boolean(problem.content.acceptEquivalent),
        },
        solution: solutionSteps ? { steps: solutionSteps } : problem.solution,
        instance: {
          seed,
          variables,
          content: {
            question: interpolateTemplate(questionTemplate, variables),
            correctAnswer,
            hints,
            acceptEquivalent: Boolean(problem.content.acceptEquivalent),
          },
        },
      };
    }
  }

  // Diagnose why we failed — check for always-identical option pairs
  const optionTemplates =
    randomization.optionTemplates ??
    (Array.isArray(problem.content.options) ? (problem.content.options as string[]) : []);

  if (optionTemplates.length >= 2) {
    const alwaysIdentical: [number, number][] = [];
    const sampleCount = 20;

    for (let i = 0; i < optionTemplates.length; i++) {
      for (let j = i + 1; j < optionTemplates.length; j++) {
        let identicalCount = 0;
        for (let s = 0; s < sampleCount; s++) {
          try {
            const rng = createRng(`__diag_${s}__`);
            const vars = buildVariables(specs, rng);
            const a = interpolateTemplate(optionTemplates[i], vars).trim();
            const b = interpolateTemplate(optionTemplates[j], vars).trim();
            if (a === b) identicalCount++;
          } catch {
            // skip failed samples
          }
        }
        if (identicalCount === sampleCount) {
          alwaysIdentical.push([i, j]);
        }
      }
    }

    if (alwaysIdentical.length > 0) {
      const pairs = alwaysIdentical
        .map(([i, j]) => `option ${i + 1} "${optionTemplates[i]}" and option ${j + 1} "${optionTemplates[j]}"`)
        .join("; ");
      throw new Error(
        `Options are always identical: ${pairs}. Use algebraically different expressions for distractors.`
      );
    }
  }

  throw new Error("Could not generate a valid randomized problem instance after " + maxAttempts + " attempts. Add constraints to ensure options produce distinct values and constraints are satisfiable.");
}

export function getProblemRandomization(content: Record<string, unknown>): ProblemRandomization | null {
  if (!content.randomization || typeof content.randomization !== "object") return null;
  const randomization = content.randomization as ProblemRandomization;
  if (randomization.enabled === false) return null;
  return randomization;
}

export function instantiateProblem(
  problem: RandomizedProblemLike,
  seed: string
): InstantiatedProblem {
  const randomization = getProblemRandomization(problem.content);

  if (!randomization || (problem.type !== "MULTIPLE_CHOICE" && problem.type !== "MULTI_SELECT" && problem.type !== "FREE_INPUT")) {
    return {
      content: problem.content as unknown as MultipleChoiceContent | MultiSelectContent | FreeInputContent,
      solution: problem.solution,
    };
  }

  return instantiateRandomizedProblem(problem, randomization, seed);
}

export type { InstantiatedProblem };
