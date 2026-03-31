"use client";

import { useState, useCallback } from "react";
import type { ProblemInstance, SubmissionResult } from "../types";

interface ProblemData {
  id: string;
  type: string;
  difficulty: number;
  content: Record<string, unknown>;
  solution?: { steps: string[] } | null;
  instance?: ProblemInstance;
}

interface UseProblemReturn {
  problem: ProblemData | null;
  loading: boolean;
  result: SubmissionResult | null;
  submitting: boolean;
  error: string | null;
  fetchProblems: (params?: Record<string, string>) => Promise<ProblemData[]>;
  fetchProblem: (id: string) => Promise<void>;
  submitAnswer: (answer: Record<string, unknown>) => Promise<void>;
  nextProblem: () => void;
}

function getProblemInstanceCacheKey(id: string): string {
  return `problem-instance:${id}`;
}

export function useProblem(): UseProblemReturn {
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  const fetchProblems = useCallback(
    async (params?: Record<string, string>): Promise<ProblemData[]> => {
      // Default to adaptive mode
      const finalParams = { adaptive: "true", ...params };
      const qs = new URLSearchParams(finalParams).toString();
      const res = await fetch(`/api/problems${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch problems");
      const data = await res.json();
      return data.problems;
    },
    []
  );

  const fetchProblem = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const cached =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem(getProblemInstanceCacheKey(id))
          : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as ProblemData;
          setProblem(parsed);
          setStartTime(Date.now());
          return;
        } catch {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(getProblemInstanceCacheKey(id));
          }
        }
      }

      const res = await fetch(`/api/problems/${id}`);
      if (!res.ok) throw new Error("Failed to fetch problem");
      const data = await res.json();
      setProblem(data);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(getProblemInstanceCacheKey(id), JSON.stringify(data));
      }
      setStartTime(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswer = useCallback(
    async (answer: Record<string, unknown>) => {
      if (!problem || submitting) return;
      setSubmitting(true);
      setError(null);

      try {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            problemId: problem.id,
            answer: problem.instance
              ? {
                  ...answer,
                  __instance: problem.instance,
                }
              : answer,
            timeSpent,
          }),
        });

        if (!res.ok) throw new Error("Failed to submit answer");

        const data = await res.json();
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(getProblemInstanceCacheKey(problem.id));
        }
        setResult({
          isCorrect: data.isCorrect,
          correctAnswer: data.correctAnswer,
          xpEarned: data.xp?.xpEarned,
          xp: data.xp ?? undefined,
          coins: data.coins ?? undefined,
          streak: data.streak ?? undefined,
          newBadges: data.newBadges ?? undefined,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submission failed");
      } finally {
        setSubmitting(false);
      }
    },
    [problem, submitting, startTime]
  );

  const nextProblem = useCallback(() => {
    setProblem(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    problem,
    loading,
    result,
    submitting,
    error,
    fetchProblems,
    fetchProblem,
    submitAnswer,
    nextProblem,
  };
}
