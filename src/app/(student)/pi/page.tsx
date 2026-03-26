"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { MessageCircle, BookOpen, ChevronRight, Clock } from "lucide-react";
import { useCompanion } from "@/modules/companion";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";

interface ConversationSummary {
  id: string;
  title: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  topicName: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  updatedAt: string;
}

interface ConversationMessage {
  id: string;
  role: string;
  content: string;
  metadata: { sideEffects?: { type: string; data: { explanationId?: string; title?: string } }[] } | null;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  title: string | null;
  lessonTitle: string | null;
  topicName: string | null;
  summary: string | null;
  messages: ConversationMessage[];
}

export default function PiHistoryPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const { openExplanation } = useCompanion();

  useEffect(() => {
    fetch("/api/ai/conversations")
      .then((r) => r.json())
      .then((data: ConversationSummary[]) => {
        setConversations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function loadConversation(id: string) {
    setLoadingDetail(true);
    fetch(`/api/ai/conversations/${id}`)
      .then((r) => r.json())
      .then((data: ConversationDetail) => {
        setSelectedConvo(data);
        setLoadingDetail(false);
      })
      .catch(() => setLoadingDetail(false));
  }

  function convoDisplayName(convo: ConversationSummary) {
    return convo.title || convo.lessonTitle || convo.topicName || "General Chat";
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }

  function getExplanations(msg: ConversationMessage) {
    if (!msg.metadata?.sideEffects) return [];
    return msg.metadata.sideEffects
      .filter((e) => e.type === "explanation_ready" && e.data?.explanationId)
      .map((e) => ({
        id: e.data.explanationId!,
        title: e.data.title ?? "Explanation",
      }));
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pi Tutor</h1>
        <p className="text-sm text-muted-foreground">
          Your conversation history with Pi, your AI math companion.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Conversation list */}
        <div className="w-80 shrink-0 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Conversations
          </h2>

          {conversations.length === 0 ? (
            <Card padding="sm">
              <div className="flex flex-col items-center py-4 text-center">
                <MessageCircle size={24} className="mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No conversations yet. Start chatting with Pi while practicing!
                </p>
              </div>
            </Card>
          ) : (
            conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => loadConversation(convo.id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  selectedConvo?.id === convo.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">
                    {convoDisplayName(convo)}
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                </div>
                {convo.topicName && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {convo.topicName}
                  </p>
                )}
                {convo.lastMessage && (
                  <p className="mt-1 text-xs text-muted-foreground truncate">
                    {convo.lastMessage}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock size={10} />
                  {formatDate(convo.lastMessageAt)}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Conversation detail */}
        <div className="flex-1">
          {loadingDetail ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner />
            </div>
          ) : selectedConvo ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  Pi
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedConvo.title || selectedConvo.lessonTitle || "General Chat"}
                  </h2>
                  {selectedConvo.topicName && (
                    <p className="text-xs text-muted-foreground">
                      {selectedConvo.topicName}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-card p-4 max-h-[60vh] overflow-y-auto">
                {selectedConvo.messages.map((msg) => {
                  const explanations = getExplanations(msg);
                  return (
                    <div key={msg.id}>
                      <div
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-secondary text-secondary-foreground rounded-bl-md"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>

                      {explanations.length > 0 && (
                        <div className="mt-1.5 flex justify-start gap-2">
                          {explanations.map((exp) => (
                            <button
                              key={exp.id}
                              onClick={() => openExplanation(exp.id)}
                              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                            >
                              <BookOpen size={12} />
                              {exp.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
              <MessageCircle size={32} className="mb-2" />
              <p className="text-sm">Select a conversation to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
