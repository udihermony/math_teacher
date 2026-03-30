"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Check, Loader2, RotateCcw, Code, Eye, Copy, Trash2, ChevronUp, ChevronDown, Plus, ClipboardCopy } from "lucide-react";
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

  const [previewMode, setPreviewMode] = useState<"visual" | "blocks">("visual");
  const [editingBlock, setEditingBlock] = useState<number | null>(null);
  const [blockJson, setBlockJson] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  // Auto-generate on first open, or seed with existing tutorial
  useEffect(() => {
    if (messages.length > 0) return;
    if (existingTutorial) {
      // Seed conversation with existing tutorial so AI has context
      const json = JSON.stringify(existingTutorial.blocks, null, 2);
      setMessages([
        { role: "assistant", content: `Here is the current tutorial:\n\n\`\`\`json\n${json}\n\`\`\`\n\nWhat would you like me to change?` },
      ]);
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

  async function handleCopyPrompt() {
    try {
      const currentMessages = messages.length > 0
        ? messages.map((m) => ({ role: m.role, content: m.content }))
        : [{ role: "user" as const, content: "Generate a tutorial for this lesson." }];

      const res = await fetch("/api/ai/tutorial", {
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
      <div className="flex h-[90vh] w-[95vw] max-w-7xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-lg font-semibold">Tutorial Generator</h2>
            <p className="text-xs text-muted-foreground">{lessonTitle}</p>
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
                onClick={() => { setPreviewMode("visual"); setEditingBlock(null); }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                  previewMode === "visual" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Eye size={12} /> Preview
              </button>
              <button
                onClick={() => { setPreviewMode("blocks"); setEditingBlock(null); }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
                  previewMode === "blocks" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Code size={12} /> Blocks
              </button>
              {previewMode === "blocks" && (
                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(preview, null, 2))}
                  className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
                  title="Copy all JSON"
                >
                  <Copy size={12} /> Copy All
                </button>
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
                <BlockEditor
                  blocks={preview}
                  editingBlock={editingBlock}
                  blockJson={blockJson}
                  onStartEdit={(idx) => {
                    const block = preview[idx];
                    setEditingBlock(idx);
                    setBlockJson(block.type === "p5" ? block.code : JSON.stringify(block, null, 2));
                  }}
                  onCancelEdit={() => { setEditingBlock(null); setBlockJson(""); }}
                  onApplyEdit={(idx) => {
                    try {
                      const block = preview[idx];
                      let updated: TutorialBlock;
                      if (block.type === "p5") {
                        // For p5 blocks, the editor shows just the code
                        updated = { ...block, code: blockJson };
                      } else {
                        updated = JSON.parse(blockJson);
                      }
                      const newBlocks = [...preview];
                      newBlocks[idx] = updated;
                      setPreview(newBlocks);
                      setEditingBlock(null);
                      setBlockJson("");
                    } catch (e) {
                      setError("Invalid JSON: " + (e as Error).message);
                    }
                  }}
                  onBlockJsonChange={setBlockJson}
                  onDelete={(idx) => {
                    setPreview(preview.filter((_, i) => i !== idx));
                    setEditingBlock(null);
                  }}
                  onMove={(idx, dir) => {
                    const newBlocks = [...preview];
                    const target = idx + dir;
                    if (target < 0 || target >= newBlocks.length) return;
                    [newBlocks[idx], newBlocks[target]] = [newBlocks[target], newBlocks[idx]];
                    setPreview(newBlocks);
                  }}
                  onCopyBlock={(idx) => {
                    const block = preview[idx];
                    navigator.clipboard.writeText(
                      block.type === "p5" ? block.code : JSON.stringify(block, null, 2)
                    );
                  }}
                  onPasteNew={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const parsed = JSON.parse(text);
                      if (parsed.type && (parsed.type === "text" || parsed.type === "latex" || parsed.type === "p5")) {
                        setPreview([...preview, parsed]);
                      } else if (Array.isArray(parsed)) {
                        setPreview([...preview, ...parsed]);
                      } else {
                        setError("Clipboard doesn't contain a valid tutorial block");
                      }
                    } catch {
                      setError("Could not parse clipboard content as JSON");
                    }
                  }}
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

const BLOCK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  text: { label: "Text", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  latex: { label: "LaTeX", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400" },
  p5: { label: "p5.js", color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" },
};

function BlockEditor({
  blocks,
  editingBlock,
  blockJson,
  onStartEdit,
  onCancelEdit,
  onApplyEdit,
  onBlockJsonChange,
  onDelete,
  onMove,
  onCopyBlock,
  onPasteNew,
}: {
  blocks: TutorialBlock[];
  editingBlock: number | null;
  blockJson: string;
  onStartEdit: (idx: number) => void;
  onCancelEdit: () => void;
  onApplyEdit: (idx: number) => void;
  onBlockJsonChange: (v: string) => void;
  onDelete: (idx: number) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onCopyBlock: (idx: number) => void;
  onPasteNew: () => void;
}) {
  if (blocks.length === 0) {
    return <p className="text-sm text-muted-foreground">No blocks yet.</p>;
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, idx) => {
        const meta = BLOCK_TYPE_LABELS[block.type] ?? { label: block.type, color: "bg-gray-100 text-gray-700" };
        const isEditing = editingBlock === idx;
        const preview = block.type === "p5"
          ? (block.code.slice(0, 60) + "...")
          : (block.content.slice(0, 80) + (block.content.length > 80 ? "..." : ""));

        return (
          <div key={idx} className={`rounded-lg border ${isEditing ? "border-primary" : "border-border"} bg-background`}>
            {/* Block header */}
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${meta.color}`}>
                #{idx + 1} {meta.label}
              </span>
              {!isEditing && (
                <span className="flex-1 truncate text-xs text-muted-foreground font-mono">
                  {preview}
                </span>
              )}
              <div className="ml-auto flex items-center gap-0.5">
                <button onClick={() => onMove(idx, -1)} disabled={idx === 0} className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30" title="Move up">
                  <ChevronUp size={12} />
                </button>
                <button onClick={() => onMove(idx, 1)} disabled={idx === blocks.length - 1} className="rounded p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30" title="Move down">
                  <ChevronDown size={12} />
                </button>
                <button onClick={() => onCopyBlock(idx)} className="rounded p-1 text-muted-foreground hover:bg-secondary" title="Copy block">
                  <Copy size={12} />
                </button>
                {!isEditing ? (
                  <button onClick={() => onStartEdit(idx)} className="rounded p-1 text-muted-foreground hover:bg-secondary" title="Edit block">
                    <Code size={12} />
                  </button>
                ) : (
                  <button onClick={onCancelEdit} className="rounded p-1 text-muted-foreground hover:bg-secondary" title="Cancel">
                    <X size={12} />
                  </button>
                )}
                <button onClick={() => onDelete(idx)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete block">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Block editor */}
            {isEditing && (
              <div className="border-t border-border px-3 py-2">
                <p className="mb-1 text-[10px] text-muted-foreground">
                  {block.type === "p5" ? "Edit p5.js code:" : `Edit ${block.type} block JSON:`}
                </p>
                <textarea
                  value={blockJson}
                  onChange={(e) => onBlockJsonChange(e.target.value)}
                  rows={block.type === "p5" ? 16 : 6}
                  className="w-full resize-y rounded-md border border-border bg-background p-2 font-mono text-xs leading-relaxed"
                  spellCheck={false}
                />
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={() => onApplyEdit(idx)}
                    className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
                  >
                    <Check size={12} /> Apply
                  </button>
                  <button onClick={onCancelEdit} className="rounded-md border border-border px-3 py-1 text-xs hover:bg-secondary">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Paste new block */}
      <button
        onClick={onPasteNew}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:bg-secondary"
      >
        <Plus size={12} /> Paste block from clipboard
      </button>
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
