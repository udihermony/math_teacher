"use client";

import { MultipleChoice } from "./components/MultipleChoice";
import { FreeInput } from "./components/FreeInput";
import type {
  MultipleChoiceContent,
  FreeInputContent,
  SubmissionResult,
} from "./types";

interface ProblemData {
  id: string;
  type: string;
  difficulty: number;
  content: Record<string, unknown>;
  solution?: { steps: string[] } | null;
}

interface ProblemRendererProps {
  problem: ProblemData;
  onSubmit: (answer: Record<string, unknown>) => void;
  result?: SubmissionResult | null;
  disabled?: boolean;
}

export function ProblemRenderer({
  problem,
  onSubmit,
  result,
  disabled,
}: ProblemRendererProps) {
  switch (problem.type) {
    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoice
          content={problem.content as unknown as MultipleChoiceContent}
          onSubmit={onSubmit}
          result={result}
          disabled={disabled}
        />
      );

    case "FREE_INPUT":
      return (
        <FreeInput
          content={problem.content as unknown as FreeInputContent}
          onSubmit={onSubmit}
          result={
            result
              ? {
                  isCorrect: result.isCorrect,
                  correctAnswer: result.correctAnswer,
                }
              : null
          }
          disabled={disabled}
        />
      );

    case "DRAG_AND_DROP":
    case "GRAPHING":
    case "PROOF_BUILDER":
    case "WORKED_SOLUTION":
      return (
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">
            {problem.type.replace(/_/g, " ")} problems coming soon!
          </p>
        </div>
      );

    default:
      return (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            Unknown problem type: {problem.type}
          </p>
        </div>
      );
  }
}
