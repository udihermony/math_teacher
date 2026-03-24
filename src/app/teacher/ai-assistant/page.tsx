"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  BookOpen,
  HelpCircle,
  Upload,
  Save,
  Loader2,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { FileUploader, UploadedFile } from "@/modules/teacher/components/FileUploader";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type Mode = "chat" | "generate-lesson" | "generate-problems" | "synthesize";

const PHASES = [
  { value: "FOUNDATIONS", label: "Foundations (5-8)" },
  { value: "EXPLORER", label: "Explorer (8-11)" },
  { value: "BUILDER", label: "Builder (11-14)" },
  { value: "CHALLENGER", label: "Challenger (14-16)" },
  { value: "IB_READY", label: "IB Ready (16-18)" },
];

let idCounter = 0;

export default function AIAssistantPage() {
  return (
    <Suspense>
      <AIAssistantInner />
    </Suspense>
  );
}

function AIAssistantInner() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("chat");
  const [saving, setSaving] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Generate lesson form state
  const [genTopic, setGenTopic] = useState("");
  const [genPhase, setGenPhase] = useState("BUILDER");
  const [genInstructions, setGenInstructions] = useState("");

  // Generate problems form state
  const [probTopic, setProbTopic] = useState("");
  const [probPhase, setProbPhase] = useState("BUILDER");
  const [probCount, setProbCount] = useState(10);
  const [probDiffMin, setProbDiffMin] = useState(3);
  const [probDiffMax, setProbDiffMax] = useState(7);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [synthPhase, setSynthPhase] = useState("BUILDER");
  const [synthInstructions, setSynthInstructions] = useState("");

  // Topics for save flow
  const [topics, setTopics] = useState<{ id: string; name: string; phase: string }[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [initFromParams, setInitFromParams] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/teacher/curriculum")
      .then((r) => r.json())
      .then((data) => {
        const loadedTopics = data.topics || [];
        setTopics(loadedTopics);

        // Auto-select topic if topicId is in query params
        const topicId = searchParams.get("topicId");
        if (topicId) {
          setSelectedTopicId(topicId);
        }
      });
  }, [searchParams]);

  // Handle query params from curriculum tree AI buttons
  useEffect(() => {
    if (initFromParams) return;
    const action = searchParams.get("action");
    if (!action) return;

    const phase = searchParams.get("phase") || "BUILDER";

    if (action === "suggest-topics") {
      setMode("chat");
      const phaseLabel = PHASES.find((p) => p.value === phase)?.label || phase;
      setInput(`Suggest 3-5 topics for the ${phaseLabel} phase. For each topic, provide a name, brief description, and suggested lesson sequence.`);
      setInitFromParams(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (action === "generate-lesson") {
      setMode("generate-lesson");
      const topicName = searchParams.get("topicName") || "";
      setGenTopic(topicName);
      setGenPhase(phase);
      setInitFromParams(true);
    } else if (action === "generate-problems") {
      setMode("generate-problems");
      const lessonTitle = searchParams.get("lessonTitle") || "";
      setProbTopic(lessonTitle);
      setProbPhase(phase);
      setInitFromParams(true);
    }
  }, [searchParams, initFromParams]);

  // Stream response from an SSE endpoint
  const streamResponse = useCallback(
    async (
      url: string,
      body: Record<string, unknown>,
      userContent: string
    ) => {
      const userMsg: Message = {
        id: `msg_${++idCounter}`,
        role: "user",
        content: userContent,
      };
      const assistantMsg: Message = {
        id: `msg_${++idCounter}`,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error("Request failed");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  accumulated += parsed.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, content: accumulated }
                        : m
                    )
                  );
                }
              } catch {
                // skip
              }
            }
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: "Sorry, something went wrong. Please try again." }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  // Chat mode
  async function handleChat(content: string) {
    if (!content.trim() || isStreaming) return;

    const apiMessages = [...messages, { role: "user" as const, content: content.trim() }].map(
      (m) => ({ role: m.role, content: m.content })
    );

    await streamResponse("/api/ai/teacher", { messages: apiMessages }, content);
  }

  // Generate lesson
  async function handleGenerateLesson() {
    if (!genTopic || isStreaming) return;
    await streamResponse(
      "/api/ai/generate-lesson",
      { topic: genTopic, phase: genPhase, additionalInstructions: genInstructions || undefined },
      `Generate a lesson: "${genTopic}" for ${genPhase}${genInstructions ? ` (${genInstructions})` : ""}`
    );
  }

  // Generate problems
  async function handleGenerateProblems() {
    if (!probTopic || isStreaming) return;
    await streamResponse(
      "/api/ai/generate-problems",
      {
        topic: probTopic,
        phase: probPhase,
        count: probCount,
        difficultyMin: probDiffMin,
        difficultyMax: probDiffMax,
      },
      `Generate ${probCount} problems: "${probTopic}" for ${probPhase}, difficulty ${probDiffMin}-${probDiffMax}`
    );
  }

  // Synthesize from file
  async function handleSynthesize() {
    if (!uploadedFile || isStreaming) return;
    await streamResponse(
      "/api/ai/synthesize",
      {
        fileName: uploadedFile.name,
        fileType: uploadedFile.type,
        fileBase64: uploadedFile.base64,
        phase: synthPhase,
        instructions: synthInstructions || undefined,
      },
      `Synthesize lesson from uploaded file: ${uploadedFile.name} for ${synthPhase}`
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = input;
    setInput("");
    handleChat(msg);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  // Extract JSON from a message and save to DB
  async function saveGeneratedContent(msgContent: string, saveType: "lesson" | "problems") {
    const jsonMatch = msgContent.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      alert("No JSON code block found in this response.");
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[1]);
    } catch {
      alert("Failed to parse JSON. The generated content may be malformed.");
      return;
    }

    if (saveType === "lesson") {
      if (!selectedTopicId) {
        alert("Please select a topic first.");
        return;
      }

      // Normalize AI output into the format the save API expects
      const problems = parsed.problems || [];
      delete parsed.problems;

      // The AI may return blocks at top level or nested under content
      const blocks = parsed.blocks || parsed.content?.blocks || [];

      // Derive title and slug from the AI output
      const title = parsed.title || parsed.topic || "Untitled Lesson";
      const slug = parsed.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
      const description = parsed.description || parsed.learningObjectives?.join("; ") || "";

      setSaving(saveType);
      try {
        const res = await fetch("/api/ai/save-generated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "lesson",
            topicId: selectedTopicId,
            data: {
              title,
              slug,
              description,
              content: { blocks },
              problems,
            },
          }),
        });

        if (res.ok) {
          const result = await res.json();
          setSaveSuccess(`Saved lesson "${result.lesson.title}" with ${result.problemsCreated} problems`);
          setTimeout(() => setSaveSuccess(null), 5000);
        } else {
          const err = await res.json();
          alert(err.error || "Failed to save");
        }
      } finally {
        setSaving(null);
      }
    } else {
      const problems = Array.isArray(parsed) ? parsed : [parsed];

      setSaving(saveType);
      try {
        const res = await fetch("/api/ai/save-generated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "problems",
            data: problems,
          }),
        });

        if (res.ok) {
          const result = await res.json();
          setSaveSuccess(`Saved ${result.problemsCreated} problems`);
          setTimeout(() => setSaveSuccess(null), 5000);
        } else {
          const err = await res.json();
          alert(err.error || "Failed to save");
        }
      } finally {
        setSaving(null);
      }
    }
  }

  // Render message content with JSON highlighting and save buttons
  function renderContent(content: string, msgId: string) {
    const parts = content.split(/(```(?:json)?\n[\s\S]*?\n```)/g);

    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const code = part.replace(/```(?:json)?\n?/, "").replace(/\n?```$/, "");
        const hasLesson = code.includes('"blocks"') && (code.includes('"title"') || code.includes('"topic"') || code.includes('"learningObjectives"'));
        const hasProblems =
          code.includes('"difficulty"') &&
          (code.includes('"correctIndex"') || code.includes('"correctAnswer"'));

        return (
          <div key={i} className="relative my-3">
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
              <code>{code}</code>
            </pre>
            <div className="absolute right-2 top-2 flex gap-1">
              <button
                onClick={() => copyToClipboard(code, `${msgId}_code_${i}`)}
                className="rounded bg-gray-700 p-1.5 text-gray-300 hover:bg-gray-600"
                title="Copy"
              >
                {copied === `${msgId}_code_${i}` ? (
                  <Check size={12} />
                ) : (
                  <Copy size={12} />
                )}
              </button>
              {hasLesson && (
                <button
                  onClick={() => saveGeneratedContent(content, "lesson")}
                  disabled={!!saving}
                  className="flex items-center gap-1 rounded bg-green-700 px-2 py-1 text-xs text-green-100 hover:bg-green-600 disabled:opacity-50"
                  title="Save lesson to database"
                >
                  {saving === "lesson" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  Save Lesson
                </button>
              )}
              {hasProblems && !hasLesson && (
                <button
                  onClick={() => saveGeneratedContent(content, "problems")}
                  disabled={!!saving}
                  className="flex items-center gap-1 rounded bg-blue-700 px-2 py-1 text-xs text-blue-100 hover:bg-blue-600 disabled:opacity-50"
                  title="Save problems to database"
                >
                  {saving === "problems" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Save size={12} />
                  )}
                  Save Problems
                </button>
              )}
            </div>
          </div>
        );
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      {/* Header with mode tabs */}
      <div className="border-b border-border">
        <div className="flex items-center gap-4 px-4 py-2">
          <h1 className="text-lg font-bold">AI Assistant</h1>
          <div className="ml-4 flex gap-1">
            {[
              { key: "chat" as Mode, label: "Chat", icon: Bot },
              { key: "generate-lesson" as Mode, label: "Lesson", icon: BookOpen },
              { key: "generate-problems" as Mode, label: "Problems", icon: HelpCircle },
              { key: "synthesize" as Mode, label: "Upload", icon: Upload },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Topic selector for save flow */}
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Save to topic:</label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="">Select topic...</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.phase}] {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Success banner */}
        {saveSuccess && (
          <div className="bg-green-50 px-4 py-2 text-xs font-medium text-green-800 flex items-center gap-2">
            <Check size={14} />
            {saveSuccess}
          </div>
        )}
      </div>

      {/* Mode-specific forms */}
      {mode !== "chat" && (
        <div className="border-b border-border bg-secondary/30 p-4">
          {mode === "generate-lesson" && (
            <div className="mx-auto max-w-3xl space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={genTopic}
                  onChange={(e) => setGenTopic(e.target.value)}
                  placeholder="Topic (e.g. Completing the square)"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <select
                  value={genPhase}
                  onChange={(e) => setGenPhase(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {PHASES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <input
                value={genInstructions}
                onChange={(e) => setGenInstructions(e.target.value)}
                placeholder="Additional instructions (optional)"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={handleGenerateLesson}
                disabled={!genTopic || isStreaming}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isStreaming ? "Generating..." : "Generate Lesson"}
              </button>
            </div>
          )}

          {mode === "generate-problems" && (
            <div className="mx-auto max-w-3xl space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={probTopic}
                  onChange={(e) => setProbTopic(e.target.value)}
                  placeholder="Topic"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <select
                  value={probPhase}
                  onChange={(e) => setProbPhase(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {PHASES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={probCount}
                    onChange={(e) => setProbCount(parseInt(e.target.value) || 10)}
                    min={1}
                    max={30}
                    className="w-20 rounded-md border border-border bg-background px-2 py-2 text-sm"
                    placeholder="Count"
                  />
                  <input
                    type="number"
                    value={probDiffMin}
                    onChange={(e) => setProbDiffMin(parseInt(e.target.value) || 1)}
                    min={1}
                    max={10}
                    className="w-16 rounded-md border border-border bg-background px-2 py-2 text-sm"
                    title="Min difficulty"
                  />
                  <span className="self-center text-xs text-muted-foreground">-</span>
                  <input
                    type="number"
                    value={probDiffMax}
                    onChange={(e) => setProbDiffMax(parseInt(e.target.value) || 10)}
                    min={1}
                    max={10}
                    className="w-16 rounded-md border border-border bg-background px-2 py-2 text-sm"
                    title="Max difficulty"
                  />
                </div>
              </div>
              <button
                onClick={handleGenerateProblems}
                disabled={!probTopic || isStreaming}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isStreaming ? "Generating..." : `Generate ${probCount} Problems`}
              </button>
            </div>
          )}

          {mode === "synthesize" && (
            <div className="mx-auto max-w-3xl space-y-3">
              <FileUploader onFileReady={setUploadedFile} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={synthPhase}
                  onChange={(e) => setSynthPhase(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {PHASES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <input
                  value={synthInstructions}
                  onChange={(e) => setSynthInstructions(e.target.value)}
                  placeholder="Additional instructions (optional)"
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={handleSynthesize}
                disabled={!uploadedFile || isStreaming}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {isStreaming ? "Analyzing..." : "Synthesize Lesson from File"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot size={48} className="mb-4 text-muted-foreground/50" />
            <h2 className="text-lg font-semibold">How can I help?</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Generate lessons and problems, upload files for synthesis,
              or chat freely about curriculum design.
            </p>
            {mode === "chat" && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {[
                  "Create a lesson on fractions for Explorer phase",
                  "Generate 10 algebra problems, difficulty 4-6",
                  "Suggest a topic sequence for the Builder phase",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      inputRef.current?.focus();
                    }}
                    className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot size={16} className="text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}
              >
                {msg.content ? renderContent(msg.content, msg.id) : <Spinner size="sm" />}
              </div>
              {msg.role === "user" && (
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User size={16} className="text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat input (only in chat mode) */}
      {mode === "chat" && (
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isStreaming}
              placeholder="Ask me anything about curriculum design..."
              className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            <div className="flex gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMessages([])}
                  disabled={isStreaming}
                  className="rounded-xl border border-border p-3 text-muted-foreground hover:bg-secondary disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="rounded-xl bg-primary p-3 text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
