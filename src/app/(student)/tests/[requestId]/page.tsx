"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, Send, Check, X } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface TestProblem {
  id: string;
  type: string;
  difficulty: number;
  content: {
    question: string;
    options?: string[];
    correctIndex?: number;
    correctAnswer?: string;
    hints?: string[];
  };
}

interface TestSession {
  title: string;
  durationMinutes: number | null;
  startedAt: string;
  problems: TestProblem[];
}

interface TestResult {
  score: number;
  total: number;
  passingGrade: number;
  passed: boolean;
  results: Array<{ problemId: string; isCorrect: boolean }>;
}

export default function TestTakingPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);

  // Load test session from localStorage or redirect
  useEffect(() => {
    const cached = sessionStorage.getItem(`test-${requestId}`);
    if (cached) {
      const data = JSON.parse(cached) as TestSession;
      setSession(data);
      setLoading(false);
    } else {
      // Try to start/resume — if already started, fetch from the start endpoint
      fetch(`/api/student/test-requests/${requestId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "RESUME" }),
      })
        .then(async (r) => {
          if (r.status === 410) {
            // Test expired or already completed
            sessionStorage.removeItem(`test-${requestId}`);
            router.push("/tests");
            return null;
          }
          if (!r.ok) {
            router.push("/tests");
            return null;
          }
          return r.json();
        })
        .then((data) => {
          if (data) {
            sessionStorage.setItem(`test-${requestId}`, JSON.stringify(data));
            setSession(data);
          }
          setLoading(false);
        })
        .catch(() => { router.push("/tests"); });
    }
  }, [requestId, router]);

  // Timer
  useEffect(() => {
    if (!session?.durationMinutes || !session.startedAt) return;

    const startTime = new Date(session.startedAt).getTime();
    const endTime = startTime + session.durationMinutes * 60 * 1000;

    // Check if already expired on load
    const initialRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    setTimeLeft(initialRemaining);
    if (initialRemaining <= 0) {
      setTimeExpired(true);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setTimeExpired(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Auto-submit when time expires
  useEffect(() => {
    if (timeExpired && !submitting && !result && session) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeExpired]);

  const handleSubmit = useCallback(async () => {
    if (submitting || !session) return;
    setSubmitting(true);

    const answerArray = session.problems.map((p) => ({
      problemId: p.id,
      answer: answers[p.id] ?? {},
    }));

    try {
      const res = await fetch(`/api/student/test-requests/${requestId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerArray }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        sessionStorage.removeItem(`test-${requestId}`);
      }
    } catch {
      alert("Failed to submit test");
    }
    setSubmitting(false);
  }, [submitting, session, answers, requestId]);

  function setAnswer(problemId: string, answer: Record<string, unknown>) {
    setAnswers((prev) => ({ ...prev, [problemId]: answer }));
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) return null;

  // Results screen
  if (result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-lg">
          <div className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white ${
            result.passed ? "bg-green-500" : "bg-red-500"
          }`}>
            {result.score}/{result.total}
          </div>
          <h2 className="text-2xl font-bold">{session.title}</h2>
          <p className={`mt-2 text-lg font-semibold ${result.passed ? "text-green-600" : "text-red-600"}`}>
            {result.passed ? "Passed!" : "Not passed"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.score} / {result.total} correct (need {result.passingGrade} to pass)
          </p>

          {/* Per-question results */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {result.results.map((r, i) => (
              <div
                key={r.problemId}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${
                  r.isCorrect ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {r.isCorrect ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/tests")}
            className="mt-6 rounded-md bg-primary px-6 py-2 font-medium text-primary-foreground hover:opacity-90"
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  const problem = session.problems[currentIdx];
  const content = problem.content;
  const answered = session.problems.filter((p) => answers[p.id]).length;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed timer header */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-card px-4 py-2 shadow-sm">
        <h2 className="text-sm font-semibold truncate">{session.title}</h2>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">
            {answered}/{session.problems.length} answered
          </span>
          {timeLeft != null && (
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-mono font-bold ${
              timeLeft <= 60 ? "bg-red-100 text-red-700 animate-pulse dark:bg-red-950/30 dark:text-red-400" :
              timeLeft <= 300 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
              "bg-secondary text-foreground"
            }`}>
              <Clock size={14} />
              {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </div>

      {/* Question navigation dots */}
      <div className="flex flex-wrap gap-1.5 justify-center px-4 py-3 border-b border-border">
        {session.problems.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setCurrentIdx(i)}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i === currentIdx
                ? "bg-primary text-primary-foreground"
                : answers[p.id]
                ? "bg-green-500 text-white"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Problem */}
      <div className="mx-auto max-w-2xl p-6">
        <p className="mb-1 text-xs text-muted-foreground">
          Question {currentIdx + 1} of {session.problems.length}
        </p>
        <h3 className="mb-6 text-lg font-medium whitespace-pre-wrap">{content.question}</h3>

        {/* Multiple choice */}
        {problem.type === "MULTIPLE_CHOICE" && content.options && (
          <div className="space-y-2">
            {content.options.map((option, idx) => {
              const selected = (answers[problem.id]?.selectedIndex as number) === idx;
              return (
                <button
                  key={idx}
                  onClick={() => !timeExpired && setAnswer(problem.id, { selectedIndex: idx })}
                  disabled={timeExpired}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:opacity-50 ${
                    selected
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {/* Free input */}
        {problem.type === "FREE_INPUT" && (
          <input
            type="text"
            value={(answers[problem.id]?.value as string) ?? ""}
            onChange={(e) => !timeExpired && setAnswer(problem.id, { value: e.target.value })}
            disabled={timeExpired}
            placeholder="Type your answer..."
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm disabled:opacity-50"
          />
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          {currentIdx < session.problems.length - 1 ? (
            <button
              onClick={() => setCurrentIdx((i) => i + 1)}
              className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Spinner /> : <Send size={14} />}
              Submit Test
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
