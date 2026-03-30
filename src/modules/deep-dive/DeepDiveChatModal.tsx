"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Check, Loader2, Code, Eye, ClipboardCopy } from "lucide-react";
import { TutorialRenderer } from "@/modules/tutorial/TutorialRenderer";
import type { TutorialBlock } from "@/modules/tutorial/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DeepDiveData {
  blocks: TutorialBlock[];
  quiz: Record<string, unknown>[];
}

interface Props {
  lessonId: string;
  lessonTitle: string;
  existingDeepDive?: DeepDiveData | null;
  onClose: () => void;
  onSaved: () => void;
}

export function DeepDiveChatModal({ lessonId, lessonTitle, existingDeepDive, onClose, onSaved }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState<TutorialBlock[]>(existingDeepDive?.blocks ?? []);
  const [quizPreview, setQuizPreview] = useState<Record<string, unknown>[]>(existingDeepDive?.quiz ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const parseDeepDive = useCallback((text: string): { blocks: TutorialBlock[]; quiz: Record<string, unknown>[] } | null => {
    const fenceMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!fenceMatch) return null;
    try {
      const parsed = JSON.parse(fenceMatch[1]);
      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        return {
          blocks: parsed.blocks,
          quiz: Array.isArray(parsed.quiz) ? parsed.quiz : [],
        };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  async function sendMessage(content: string) {
    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, messages: newMessages }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Failed to generate");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantText += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantText };
                  return updated;
                });
              }
              if (parsed.error) setError(parsed.error);
            } catch { /* skip */ }
          }
        }
      }

      const result = parseDeepDive(assistantText);
      if (result) {
        setPreview(result.blocks);
        setQuizPreview(result.quiz);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
      }
    }

    setStreaming(false);
  }

  async function handleSave() {
    if (!preview.length) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/lessons/${lessonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deepDive: { blocks: preview, quiz: quizPreview } }),
      });
      if (res.ok) onSaved();
      else setError("Failed to save");
    } catch {
      setError("Failed to save");
    }
    setSaving(false);
  }

  async function handleCopyPrompt() {
    try {
      const currentMessages = messages.length > 0
        ? messages.map((m) => ({ role: m.role, content: m.content }))
        : [{ role: "user" as const, content: "Create a Deep Dive for this lesson." }];
      const res = await fetch("/api/ai/deep-dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, messages: currentMessages, promptOnly: true }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      await navigator.clipboard.writeText(data.fullPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      setError("Failed to copy prompt");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    sendMessage(input.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex h-[90vh] w-[95vw] max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold">Deep Dive — {lessonTitle}</h2>
            <p className="text-xs text-muted-foreground">
              Enrichment content: history, real-world connections, and challenging quiz
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPrompt}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
              title="Copy the full AI prompt for use with an external LLM"
            >
              {promptCopied ? <Check size={14} /> : <ClipboardCopy size={14} />}
              {promptCopied ? "Copied!" : "Copy Prompt"}
            </button>
            {preview.length > 0 && (
              <button
                onClick={handleSave}
                disabled={saving || streaming}
                className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {existingDeepDive ? "Update Deep Dive" : "Approve & Save"}
              </button>
            )}
            <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat panel */}
          <div className="flex w-1/2 flex-col border-r border-border">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <p className="text-sm">
                    Click &quot;Generate&quot; or type instructions to create a Deep Dive
                  </p>
                  <button
                    onClick={() => sendMessage("Create a Deep Dive for this lesson.")}
                    disabled={streaming}
                    className="mt-3 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    Generate Deep Dive
                  </button>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {msg.content || (streaming && i === messages.length - 1 ? "..." : "")}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Adjust the deep dive..."
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                disabled={streaming}
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="rounded-md bg-primary p-2 text-primary-foreground disabled:opacity-50"
              >
                {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>

          {/* Preview panel */}
          <div className="flex w-1/2 flex-col">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <button
                onClick={() => setViewMode("visual")}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                  viewMode === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Eye size={12} /> Preview
              </button>
              <button
                onClick={() => setViewMode("json")}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                  viewMode === "json" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Code size={12} /> JSON
              </button>
              {quizPreview.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {preview.length} blocks + {quizPreview.length} quiz questions
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {preview.length === 0 && !streaming ? (
                <p className="text-center text-sm text-muted-foreground mt-8">
                  {existingDeepDive ? "Deep dive loaded. Edit via chat." : "Preview will appear here after generation."}
                </p>
              ) : viewMode === "visual" ? (
                <div>
                  <TutorialRenderer blocks={preview} />
                  {quizPreview.length > 0 && (
                    <div className="mt-6 border-t border-border pt-4">
                      <h3 className="text-sm font-semibold mb-3">Quiz ({quizPreview.length} questions)</h3>
                      <div className="space-y-3">
                        {quizPreview.map((q, i) => {
                          const content = q.content as Record<string, unknown> | undefined;
                          return (
                            <div key={i} className="rounded-lg border border-border p-3 text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-muted-foreground">Q{i + 1}</span>
                                <span className="text-xs text-muted-foreground">Difficulty: {q.difficulty as number}/10</span>
                                <span className="text-xs text-muted-foreground">({q.type as string})</span>
                              </div>
                              <p className="font-medium">{content?.question as string}</p>
                              {q.type === "MULTIPLE_CHOICE" && Array.isArray(content?.options) && (
                                <ul className="mt-1 space-y-0.5">
                                  {(content.options as string[]).map((opt, j) => (
                                    <li key={j} className={`text-xs pl-2 ${j === (content.correctIndex as number) ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                                      {String.fromCharCode(65 + j)}. {opt}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {q.type === "FREE_INPUT" && (
                                <p className="mt-1 text-xs text-green-600">Answer: {content?.correctAnswer as string}</p>
                              )}
                              {typeof content?.explanation === "string" && (
                                <p className="mt-1 text-xs text-muted-foreground italic">{content.explanation}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-xs font-mono">
                  {JSON.stringify({ blocks: preview, quiz: quizPreview }, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
