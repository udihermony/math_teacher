"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { phaseTokens, ThemeTokens } from "./tokens";

interface ThemeContextType {
  phase: string;
  setPhase: (phase: string) => void;
  tokens: ThemeTokens;
}

const ThemeContext = createContext<ThemeContextType>({
  phase: "PHASE_0",
  setPhase: () => {},
  tokens: phaseTokens.PHASE_0,
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTokens(tokens: ThemeTokens) {
  const root = document.documentElement;
  root.style.setProperty("--primary", tokens.primary);
  root.style.setProperty("--primary-foreground", tokens.primaryForeground);
  root.style.setProperty("--secondary", tokens.secondary);
  root.style.setProperty("--secondary-foreground", tokens.secondaryForeground);
  root.style.setProperty("--accent", tokens.accent);
  root.style.setProperty("--accent-foreground", tokens.accentForeground);
  root.style.setProperty("--background", tokens.background);
  root.style.setProperty("--foreground", tokens.foreground);
  root.style.setProperty("--card", tokens.card);
  root.style.setProperty("--card-foreground", tokens.cardForeground);
  root.style.setProperty("--muted", tokens.muted);
  root.style.setProperty("--muted-foreground", tokens.mutedForeground);
  root.style.setProperty("--border", tokens.border);
  root.style.setProperty("--ring", tokens.ring);
  root.style.setProperty("--radius", tokens.radius);
}

interface ThemeProviderProps {
  initialPhase?: string;
  children: React.ReactNode;
}

export function ThemeProvider({
  initialPhase = "PHASE_0",
  children,
}: ThemeProviderProps) {
  const [phase, setPhase] = useState(initialPhase);
  const tokens = phaseTokens[phase] || phaseTokens.PHASE_0;

  useEffect(() => {
    applyTokens(tokens);
  }, [tokens]);

  return (
    <ThemeContext.Provider value={{ phase, setPhase, tokens }}>
      {children}
    </ThemeContext.Provider>
  );
}
