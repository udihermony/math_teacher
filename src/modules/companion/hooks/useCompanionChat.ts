"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useCompanion } from "./useCompanion";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface UseCompanionChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoadingHistory: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

let msgIdCounter = 0;
function nextId() {
  return `msg_${Date.now()}_${++msgIdCounter}`;
}

export function useCompanionChat(
  currentProblemId?: string
): UseCompanionChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const {
    currentLessonId,
    conversationId,
    setConversationId,
    openExplanation,
  } = useCompanion();

  // Load conversation history when lessonId changes
  const prevLessonRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentLessonId === prevLessonRef.current) return;
    prevLessonRef.current = currentLessonId;

    if (!currentLessonId) {
      // No lesson context — start fresh (general chat)
      setMessages([]);
      setConversationId(null);
      return;
    }

    // Try to load existing conversation for this lesson
    setIsLoadingHistory(true);
    fetch(`/api/ai/conversations?lessonId=${currentLessonId}`)
      .then((r) => r.json())
      .then((convos: { id: string }[]) => {
        if (convos.length > 0) {
          const convoId = convos[0].id;
          setConversationId(convoId);
          // Load messages for this conversation
          return fetch(`/api/ai/conversations/${convoId}`)
            .then((r) => r.json())
            .then(
              (data: {
                messages: {
                  id: string;
                  role: string;
                  content: string;
                  createdAt: string;
                }[];
              }) => {
                setMessages(
                  data.messages
                    .filter(
                      (m) => m.role === "user" || m.role === "assistant"
                    )
                    .map((m) => ({
                      id: m.id,
                      role: m.role as "user" | "assistant",
                      content: m.content,
                      timestamp: new Date(m.createdAt).getTime(),
                    }))
                );
              }
            );
        } else {
          setMessages([]);
          setConversationId(null);
        }
      })
      .catch(() => {
        // Silently fail — will start fresh conversation
        setMessages([]);
        setConversationId(null);
      })
      .finally(() => setIsLoadingHistory(false));
  }, [currentLessonId, setConversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setError(null);

      const userMsg: ChatMessage = {
        id: nextId(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now(),
      };

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        abortRef.current = new AbortController();

        const res = await fetch("/api/ai/companion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content.trim(),
            conversationId,
            currentProblemId,
            lessonId: currentLessonId,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error("Failed to get response from Pi");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  setError(parsed.error);
                  continue;
                }
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
                // Capture conversation ID from server
                if (parsed.conversationId) {
                  setConversationId(parsed.conversationId);
                }
                // Handle explanation side effects
                if (parsed.type === "explanation_ready" && parsed.data?.explanationId) {
                  openExplanation(parsed.data.explanationId);
                }
              } catch {
                // Skip malformed lines
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong");
        setMessages((prev) =>
          prev.filter(
            (m) => m.id !== assistantMsg.id || m.content.length > 0
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, currentProblemId, conversationId, currentLessonId, setConversationId]
  );

  const clearMessages = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, [setConversationId]);

  return { messages, isStreaming, isLoadingHistory, error, sendMessage, clearMessages };
}
