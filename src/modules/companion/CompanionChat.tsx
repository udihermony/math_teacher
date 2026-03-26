"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, X, Trash2, BookOpen } from "lucide-react";
import { useCompanionChat } from "./hooks/useCompanionChat";
import { useCompanion } from "./hooks/useCompanion";
import { Spinner } from "@/components/ui/Spinner";

function renderMessageContent(content: string, onExplanation: (id: string) => void) {
  // Detect [EXPLANATION:id] markers
  const parts = content.split(/\[EXPLANATION:([^\]]+)\]/g);
  if (parts.length === 1) return content;

  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // This is an explanation ID
      return (
        <button
          key={i}
          onClick={() => onExplanation(part)}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          <BookOpen size={12} />
          View Explanation
        </button>
      );
    }
    return part || null;
  });
}

export function CompanionChat() {
  const { isOpen, close, currentProblemId, openExplanation } = useCompanion();
  const { messages, isStreaming, isLoadingHistory, error, sendMessage, clearMessages } =
    useCompanionChat(currentProblemId ?? undefined);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  }

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed bottom-20 right-4 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            Pi
          </div>
          <div>
            <h3 className="text-sm font-semibold">Pi</h3>
            <p className="text-xs text-muted-foreground">Your math companion</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Clear chat"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={close}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingHistory && (
          <div className="flex items-center justify-center py-4">
            <Spinner size="sm" />
          </div>
        )}

        {!isLoadingHistory && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
              🧮
            </div>
            <p className="text-sm font-medium text-foreground">
              Hi! I&apos;m Pi!
            </p>
            <p className="mt-1 max-w-[250px] text-xs text-muted-foreground">
              Ask me anything about math. I won&apos;t give you the answer
              directly, but I&apos;ll help you figure it out!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-secondary-foreground rounded-bl-md"
              }`}
            >
              {msg.content ? (
                msg.role === "assistant"
                  ? renderMessageContent(msg.content, openExplanation)
                  : msg.content
              ) : (
                <Spinner size="sm" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="border-t border-border p-3"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Pi a question..."
            disabled={isStreaming}
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none transition focus:border-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
