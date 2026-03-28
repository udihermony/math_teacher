"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Check, Loader2, RotateCcw, Code, Eye, Copy } from "lucide-react";
import { TutorialRenderer } from "./TutorialRenderer";
import type { TutorialBlock, TutorialData } from "./types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  lessonId: string;
  lessonTitle: string;
  existingTutorial?: TutorialData | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TutorialChatModal({ lessonId, lessonTitle, existingTutorial, onClose, onSaved }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [preview, setPreview] = useState<TutorialBlock[]>(existingTutorial?.blocks ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [previewMode, setPreviewMode] = useState<"visual" | "json">("visual");
  const [jsonEdit, setJsonEdit] = useState("");

  // Auto-generate on first open, or seed with existing tutorial
  useEffect(() => {
    if (messages.length > 0) return;
    if (existingTutorial) {
      // Seed conversation with existing tutorial so AI has context
      const json = JSON.stringify(existingTutorial.blocks, null, 2);
      setMessages([
        { role: "assistant", content: `Here is the current tutorial:\n\n\`\`\`json\n${json}\n\`\`\`\n\nWhat would you like me to change?` },
      ]);
      setJsonEdit(json);
    } else {
      sendMessage("Generate a tutorial for this lesson.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function sendMessage(text: string) {
    if (streaming) return;
    setError(null);

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    // Add empty assistant message for streaming
    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/tutorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, messages: newMessages }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error("Failed to connect to AI");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                fullText += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: fullText };
                  return updated;
                });
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      // Parse tutorial blocks from the full response
      const blocks = extractBlocks(fullText);
      if (blocks.length > 0) {
        setPreview(blocks);
        setJsonEdit(JSON.stringify(blocks, null, 2));
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
    } finally {
      setStreaming(false);
    }
  }

  async function handleSave() {
    if (preview.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/tutorial/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, tutorial: { blocks: preview } }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    sendMessage(input.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex h-[90vh] w-[95vw] max-w-7xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold">Tutorial Generator</h2>
            <p className="text-xs text-muted-foreground">{lessonTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {preview.length > 0 && (
              <button
                onClick={handleSave}
                disabled={saving || streaming}
                className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {existingTutorial ? "Update Tutorial" : "Approve & Save"}
              </button>
            )}
            <button
              onClick={() => {
                abortRef.current?.abort();
                onClose();
              }}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body — two panes */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Chat */}
          <div className="flex w-1/2 flex-col border-r border-border">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "ml-8 bg-primary text-primary-foreground"
                      : "mr-8 bg-secondary text-secondary-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <AssistantMessage content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              ))}
              {streaming && (
                <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground">
                  <Loader2 size={12} className="animate-spin" />
                  Generating...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {error && (
              <div className="px-4 py-2 text-xs text-red-500">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for changes..."
                disabled={streaming}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="rounded-md bg-primary p-2 text-primary-foreground disabled:opacity-50"
              >
                {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
              {preview.length > 0 && !streaming && (
                <button
                  type="button"
                  onClick={() => sendMessage("Regenerate the entire tutorial.")}
                  className="rounded-md p-2 text-muted-foreground hover:bg-secondary"
                  title="Regenerate"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </form>
          </div>

          {/* Right: Preview */}
          <div className="flex w-1/2 flex-col">
            {/* Preview tabs */}
            <div className="flex items-center gap-1 border-b border-border px-4 py-2">
              <button
                onClick={() => setPreviewMode("visual")}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                  previewMode === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Eye size={12} /> Preview
              </button>
              <button
                onClick={() => {
                  setPreviewMode("json");
                  if (preview.length > 0) setJsonEdit(JSON.stringify(preview, null, 2));
                }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                  previewMode === "json" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Code size={12} /> JSON
              </button>
              {previewMode === "json" && (
                <>
                  <button
                    onClick={() => navigator.clipboard.writeText(jsonEdit)}
                    className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
                    title="Copy JSON"
                  >
                    <Copy size={12} /> Copy
                  </button>
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(jsonEdit);
                        const arr = Array.isArray(parsed) ? parsed : parsed?.blocks;
                        if (!Array.isArray(arr)) throw new Error("Expected array");
                        setPreview(arr);
                        setPreviewMode("visual");
                      } catch (e) {
                        setError("Invalid JSON: " + (e as Error).message);
                      }
                    }}
                    className="flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                  >
                    <Check size={12} /> Apply
                  </button>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {previewMode === "visual" ? (
                preview.length > 0 ? (
                  <TutorialRenderer blocks={preview} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {streaming ? "Tutorial preview will appear here..." : "No tutorial generated yet."}
                  </div>
                )
              ) : (
                <textarea
                  value={jsonEdit}
                  onChange={(e) => setJsonEdit(e.target.value)}
                  className="h-full w-full resize-none rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed"
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  // Show text outside of JSON code fences
  const parts = content.split(/```json[\s\S]*?```|```[\s\S]*?```/g);
  const hasJson = /```json/.test(content);

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, i) => (
        <span key={i}>{part.trim()}</span>
      ))}
      {hasJson && (
        <span className="mt-1 block text-xs text-green-600 dark:text-green-400">
          Tutorial blocks generated (see preview →)
        </span>
      )}
    </div>
  );
}

function extractBlocks(text: string): TutorialBlock[] {
  // Find JSON code fence
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1]);
    // Could be { blocks: [...] } or just [...]
    const arr = Array.isArray(parsed) ? parsed : parsed?.blocks;
    if (!Array.isArray(arr)) return [];

    return arr.filter(
      (b: TutorialBlock) =>
        (b.type === "text" && typeof b.content === "string") ||
        (b.type === "latex" && typeof b.content === "string") ||
        (b.type === "p5" && typeof b.code === "string")
    );
  } catch {
    return [];
  }
}
