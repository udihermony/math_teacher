"use client";

import { useState, useEffect } from "react";
import { Check, X, Copy, ClipboardList } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

interface PendingRequest {
  id: string;
  studentName: string | null;
  studentEmail: string | null;
  testTitle: string;
  className: string;
  questionCount: number;
  durationMinutes: number | null;
  createdAt: string;
}

export function PendingTestRequests() {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teacher/test-requests")
      .then((r) => r.json())
      .then((d) => {
        setRequests(d.requests ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setProcessing(requestId);
    try {
      const res = await fetch("/api/teacher/test-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        const data = await res.json();
        if (action === "approve" && data.approvalCode) {
          setCodes((prev) => ({ ...prev, [requestId]: data.approvalCode }));
        } else {
          setRequests((prev) => prev.filter((r) => r.id !== requestId));
        }
      }
    } catch {
      // silently fail
    }
    setProcessing(null);
  }

  function copyCode(requestId: string) {
    const code = codes[requestId];
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(requestId);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) return null;
  if (requests.length === 0 && Object.keys(codes).length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Pending Test Requests
      </h3>
      <div className="space-y-2">
        {requests.map((req) => {
          const approved = !!codes[req.id];
          return (
            <Card key={req.id} padding="sm">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {req.studentName ?? req.studentEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.testTitle} · {req.className} · {req.questionCount}Q
                    {req.durationMinutes ? ` · ${req.durationMinutes}min` : ""}
                  </p>
                </div>

                {approved ? (
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-green-100 px-2 py-1 font-mono text-sm font-bold tracking-widest text-green-700 dark:bg-green-950/30 dark:text-green-400">
                      {codes[req.id]}
                    </span>
                    <button
                      onClick={() => copyCode(req.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Copy code"
                    >
                      {copied === req.id ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAction(req.id, "approve")}
                      disabled={processing === req.id}
                      className="flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {processing === req.id ? (
                        <Spinner />
                      ) : (
                        <Check size={12} strokeWidth={3} />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "reject")}
                      disabled={processing === req.id}
                      className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
                    >
                      <X size={12} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
