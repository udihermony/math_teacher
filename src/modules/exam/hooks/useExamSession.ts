"use client";

import { useState, useCallback } from "react";
import type { ExamSession, ExamAnswer, ExamQuestion, PaperType, IBLevel } from "../types";

interface UseExamSessionReturn {
  session: ExamSession | null;
  questions: ExamQuestion[];
  loading: boolean;
  error: string | null;
  startExam: (paperType: PaperType, level: IBLevel) => Promise<void>;
  submitAnswer: (questionId: string, answer: string, maxMarks: number) => void;
  finishExam: () => Promise<void>;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (i: number) => void;
}

export function useExamSession(): UseExamSessionReturn {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const startExam = useCallback(async (paperType: PaperType, level: IBLevel) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperType, level }),
      });
      if (!res.ok) throw new Error("Failed to start exam");
      const data = await res.json();
      setSession(data.session);
      setQuestions(data.questions);
      setCurrentQuestionIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAnswer = useCallback((questionId: string, answer: string, maxMarks: number) => {
    setSession((prev) => {
      if (!prev) return prev;
      const answers = { ...prev.answers };
      answers[questionId] = {
        questionId,
        answer,
        maxMarks,
      };
      return { ...prev, answers };
    });
  }, []);

  const finishExam = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch("/api/exam/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          answers: session.answers,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit exam");
      const data = await res.json();
      setSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }, [session]);

  return {
    session,
    questions,
    loading,
    error,
    startExam,
    submitAnswer,
    finishExam,
    currentQuestionIndex,
    setCurrentQuestionIndex,
  };
}
