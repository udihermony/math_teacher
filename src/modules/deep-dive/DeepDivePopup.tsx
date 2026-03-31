"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Maximize2, Minimize2, Compass, Trophy, Coins, Check, XCircle } from "lucide-react";
import { TutorialRenderer } from "@/modules/tutorial/TutorialRenderer";
import type { TutorialBlock } from "@/modules/tutorial/types";

interface QuizQuestion {
  type: "MULTIPLE_CHOICE" | "FREE_INPUT";
  difficulty: number;
  content: {
    question: string;
    options?: string[];
    correctIndex?: number;
    correctAnswer?: string;
    explanation?: string;
  };
}

interface Props {
  lessonId: string;
  onClose: () => void;
  onCoinsEarned?: (earned: number, balance: number) => void;
}

export function DeepDivePopup({ lessonId, onClose, onCoinsEarned }: Props) {
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<TutorialBlock[]>([]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<"default" | "large" | "full">("large");

  // Quiz state
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quizResults, setQuizResults] = useState<{
    results: { correct: boolean; questionIndex: number }[];
    correctCount: number;
    totalQuestions: number;
    passed: boolean;
    coinsAwarded: number;
  } | null>(null);

  const sizeClasses = {
    default: "h-[60vh] w-[90vw] max-w-2xl",
    large: "h-[85vh] w-[90vw] max-w-4xl",
    full: "h-[95vh] w-[95vw] max-w-7xl",
  };

  useEffect(() => {
    fetch(`/api/student/deep-dive?lessonId=${lessonId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Deep dive not available");
        return res.json();
      })
      .then((data) => {
        setTitle(data.title);
        const dd = data.deepDive;
        setBlocks(Array.isArray(dd?.blocks) ? dd.blocks : []);
        setQuiz(Array.isArray(dd?.quiz) ? dd.quiz : []);
        setAlreadyCompleted(data.completed);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [lessonId]);

  function setAnswer(qIndex: number, value: number | string) {
    setAnswers((prev) => ({ ...prev, [qIndex]: value }));
  }

  async function handleSubmitQuiz() {
    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([idx, answer]) => ({
        questionIndex: parseInt(idx),
        answer,
      }));

      const res = await fetch("/api/student/deep-dive/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, answers: answerArray }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      const data = await res.json();
      setQuizResults(data);
      setSubmitted(true);

      if (data.coinsAwarded > 0 && onCoinsEarned) {
        onCoinsEarned(data.coinsAwarded, data.coinBalance);
      }
    } catch {
      setError("Failed to submit quiz");
    }
    setSubmitting(false);
  }

  const allAnswered = quiz.length > 0 && Object.keys(answers).length >= quiz.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl transition-all duration-200 ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Compass size={20} className="text-purple-500" />
            <div>
              <h2 className="text-lg font-semibold">Deep Dive</h2>
              <p className="text-xs text-muted-foreground">{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {alreadyCompleted && !quizResults && (
              <span className="mr-2 flex items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-medium text-green-600">
                <Check size={12} /> Completed
              </span>
            )}
            <button
              onClick={() => setSize(size === "full" ? "default" : size === "large" ? "full" : "large")}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
              title={size === "full" ? "Shrink" : "Expand"}
            >
              {size === "full" ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {error}
            </div>
          )}
          {!loading && !error && (
            <div>
              {/* Tutorial blocks */}
              <TutorialRenderer blocks={blocks} />

              {/* Quiz section */}
              {quiz.length > 0 && (
                <div className="mt-8 border-t border-border pt-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Trophy size={18} className="text-purple-500" />
                    Deep Dive Challenge
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Answer these challenging questions to earn bonus coins. Get at least half correct to pass!
                  </p>

                  <div className="space-y-6">
                    {quiz.map((q, i) => {
                      const resultForQ = quizResults?.results.find((r) => r.questionIndex === i);
                      return (
                        <div
                          key={i}
                          className={`rounded-lg border p-4 ${
                            submitted
                              ? resultForQ?.correct
                                ? "border-green-500/50 bg-green-500/5"
                                : "border-red-500/50 bg-red-500/5"
                              : "border-border"
                          }`}
                        >
                          <div className="mb-3 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/15 text-xs font-bold text-purple-600">
                              {i + 1}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Difficulty: {q.difficulty}/10
                            </span>
                            {submitted && resultForQ && (
                              resultForQ.correct
                                ? <Check size={16} className="text-green-500" />
                                : <XCircle size={16} className="text-red-500" />
                            )}
                          </div>

                          <p className="mb-3 text-sm font-medium">{q.content.question}</p>

                          {q.type === "MULTIPLE_CHOICE" && q.content.options && (
                            <div className="space-y-2">
                              {q.content.options.map((opt, j) => (
                                <button
                                  key={j}
                                  onClick={() => !submitted && setAnswer(i, j)}
                                  disabled={submitted}
                                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                                    submitted
                                      ? j === q.content.correctIndex
                                        ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                                        : answers[i] === j && !resultForQ?.correct
                                        ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                                        : "border-border text-muted-foreground"
                                      : answers[i] === j
                                      ? "border-purple-500 bg-purple-500/10"
                                      : "border-border hover:bg-secondary"
                                  }`}
                                >
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">
                                    {String.fromCharCode(65 + j)}
                                  </span>
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}

                          {q.type === "FREE_INPUT" && (
                            <input
                              type="text"
                              value={(answers[i] as string) ?? ""}
                              onChange={(e) => setAnswer(i, e.target.value)}
                              disabled={submitted}
                              placeholder="Type your answer..."
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                            />
                          )}

                          {submitted && q.content.explanation && (
                            <p className="mt-2 text-xs italic text-muted-foreground">
                              {q.content.explanation}
                            </p>
                          )}

                          {submitted && q.type === "FREE_INPUT" && (
                            <p className="mt-1 text-xs text-green-600">
                              Correct answer: {q.content.correctAnswer}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit / Results */}
                  {!submitted ? (
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={!allAnswered || submitting}
                        className="flex items-center gap-2 rounded-md bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trophy size={16} />
                        )}
                        Submit Answers
                      </button>
                    </div>
                  ) : quizResults && (
                    <div className={`mt-6 rounded-lg p-4 text-center ${
                      quizResults.passed
                        ? "bg-green-500/10 border border-green-500/30"
                        : "bg-red-500/10 border border-red-500/30"
                    }`}>
                      <p className="text-lg font-bold">
                        {quizResults.correctCount} / {quizResults.totalQuestions} correct
                      </p>
                      {quizResults.passed ? (
                        <>
                          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                            Challenge passed!
                          </p>
                          {quizResults.coinsAwarded > 0 && (
                            <p className="mt-2 flex items-center justify-center gap-1 text-lg font-bold text-amber-500">
                              <Coins size={20} /> +{quizResults.coinsAwarded} coins
                            </p>
                          )}
                          {quizResults.coinsAwarded === 0 && alreadyCompleted && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Bonus already earned
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          Need at least {Math.ceil(quizResults.totalQuestions * 0.5)} correct to pass. Try again!
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
