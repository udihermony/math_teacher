"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Clock, Send, Check, Loader2 } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

interface TestInfo {
  id: string;
  title: string;
  scope: string;
  questionCount: number;
  durationMinutes: number | null;
  request: {
    id: string;
    status: string;
    approvalCode: string | null;
    startedAt: string | null;
    completedAt: string | null;
    score: number | null;
  } | null;
}

export default function TestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<TestInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState<Record<string, string>>({});
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/student/test-requests")
      .then((r) => r.json())
      .then((d) => { setTests(d.tests ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function requestTest(testId: string) {
    setRequesting(testId);
    setError(null);
    try {
      const res = await fetch("/api/student/test-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTests((prev) =>
          prev.map((t) => t.id === testId ? { ...t, request: data.request } : t)
        );
      } else {
        const data = await res.json();
        setError(data.error || "Failed to request test");
      }
    } catch {
      setError("Failed to request test");
    }
    setRequesting(null);
  }

  async function startTest(requestId: string, testId: string) {
    const code = codeInput[testId];
    if (!code?.trim()) return;
    setStarting(requestId);
    setError(null);
    try {
      const res = await fetch(`/api/student/test-requests/${requestId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem(`test-${requestId}`, JSON.stringify(data));
        router.push(`/tests/${requestId}`);
      } else {
        const data = await res.json();
        setError(data.error || "Invalid code");
      }
    } catch {
      setError("Failed to start test");
    }
    setStarting(null);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold flex items-center gap-2">
        <ClipboardList size={24} />
        Tests
      </h1>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {tests.length === 0 && (
        <p className="text-muted-foreground">No tests available for your class.</p>
      )}

      <div className="space-y-3">
        {tests.map((test) => {
          const req = test.request;
          return (
            <div key={test.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{test.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {test.questionCount} questions
                    {test.durationMinutes && (
                      <span className="ml-2 inline-flex items-center gap-1">
                        <Clock size={12} /> {test.durationMinutes} min
                      </span>
                    )}
                  </p>
                </div>

                {/* Status / Actions */}
                {!req && (
                  <button
                    onClick={() => requestTest(test.id)}
                    disabled={requesting === test.id}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {requesting === test.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    Request Test
                  </button>
                )}

                {req?.status === "PENDING" && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    Waiting for approval
                  </span>
                )}

                {req?.status === "REJECTED" && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-950/30 dark:text-red-400">
                    Rejected
                  </span>
                )}

                {req?.status === "COMPLETED" && (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-950/30 dark:text-green-400">
                    <Check size={12} strokeWidth={3} />
                    Score: {req.score}/{test.questionCount}
                  </span>
                )}

                {req?.status === "STARTED" && (
                  <button
                    onClick={() => router.push(`/tests/${req.id}`)}
                    className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                  >
                    Continue Test
                  </button>
                )}
              </div>

              {/* Code entry for approved requests */}
              {req?.status === "APPROVED" && (
                <div className="mt-3 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-3">
                  <input
                    type="text"
                    placeholder="Enter code from teacher"
                    maxLength={8}
                    value={codeInput[test.id] ?? ""}
                    onChange={(e) => setCodeInput((prev) => ({ ...prev, [test.id]: e.target.value.toUpperCase() }))}
                    className="w-32 rounded-md border border-border bg-background px-3 py-1.5 text-center text-sm font-mono uppercase tracking-widest"
                  />
                  <button
                    onClick={() => startTest(req.id, test.id)}
                    disabled={starting === req.id || !codeInput[test.id]?.trim()}
                    className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {starting === req.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ClipboardList size={14} />
                    )}
                    Start Test
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
