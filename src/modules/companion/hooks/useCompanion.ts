"use client";

import { create } from "zustand";

interface CompanionState {
  isOpen: boolean;
  currentProblemId: string | null;
  currentLessonId: string | null;
  conversationId: string | null;
  explanationId: string | null;
  lastHint: string | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setProblemContext: (problemId: string | null) => void;
  setLessonContext: (lessonId: string | null) => void;
  setConversationId: (id: string | null) => void;
  openExplanation: (id: string) => void;
  closeExplanation: () => void;
  showHint: (hint: string) => void;
  dismissHint: () => void;
}

export const useCompanion = create<CompanionState>((set) => ({
  isOpen: false,
  currentProblemId: null,
  currentLessonId: null,
  conversationId: null,
  explanationId: null,
  lastHint: null,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  setProblemContext: (problemId) => set({ currentProblemId: problemId }),
  setLessonContext: (lessonId) =>
    set({ currentLessonId: lessonId, conversationId: null }),
  setConversationId: (id) => set({ conversationId: id }),
  openExplanation: (id) => set({ explanationId: id }),
  closeExplanation: () => set({ explanationId: null }),
  showHint: (hint) => set({ lastHint: hint }),
  dismissHint: () => set({ lastHint: null }),
}));
