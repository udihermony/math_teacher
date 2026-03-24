"use client";

import { create } from "zustand";

interface CompanionState {
  isOpen: boolean;
  currentProblemId: string | null;
  lastHint: string | null;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setProblemContext: (problemId: string | null) => void;
  showHint: (hint: string) => void;
  dismissHint: () => void;
}

export const useCompanion = create<CompanionState>((set) => ({
  isOpen: false,
  currentProblemId: null,
  lastHint: null,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  setProblemContext: (problemId) => set({ currentProblemId: problemId }),
  showHint: (hint) => set({ lastHint: hint }),
  dismissHint: () => set({ lastHint: null }),
}));
