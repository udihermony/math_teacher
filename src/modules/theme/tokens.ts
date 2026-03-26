export interface ThemeTokens {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  ring: string;
  radius: string;
}

export const phaseTokens: Record<string, ThemeTokens> = {
  PHASE_0: {
    // Foundations: Green tones
    primary: "#16a34a",       // Green 600
    primaryForeground: "#ffffff",
    secondary: "#dcfce7",     // Green 100
    secondaryForeground: "#166534",
    accent: "#22c55e",        // Green 500
    accentForeground: "#ffffff",
    background: "#f0fdf4",    // Green 50
    foreground: "#1c1917",
    card: "#ffffff",
    cardForeground: "#1c1917",
    muted: "#dcfce7",
    mutedForeground: "#6b7280",
    border: "#d1d5db",
    ring: "#16a34a",
    radius: "1rem",
  },
  PHASE_1: {
    // Algebra: Blue tones
    primary: "#2563eb",       // Blue 600
    primaryForeground: "#ffffff",
    secondary: "#dbeafe",     // Blue 100
    secondaryForeground: "#1e40af",
    accent: "#3b82f6",        // Blue 500
    accentForeground: "#ffffff",
    background: "#eff6ff",    // Blue 50
    foreground: "#0f172a",
    card: "#ffffff",
    cardForeground: "#0f172a",
    muted: "#dbeafe",
    mutedForeground: "#64748b",
    border: "#e2e8f0",
    ring: "#2563eb",
    radius: "0.75rem",
  },
  PHASE_2: {
    // Functions: Indigo tones
    primary: "#4f46e5",       // Indigo 600
    primaryForeground: "#ffffff",
    secondary: "#e0e7ff",     // Indigo 100
    secondaryForeground: "#3730a3",
    accent: "#6366f1",        // Indigo 500
    accentForeground: "#ffffff",
    background: "#eef2ff",    // Indigo 50
    foreground: "#1e1b4b",
    card: "#ffffff",
    cardForeground: "#1e1b4b",
    muted: "#e0e7ff",
    mutedForeground: "#6b7280",
    border: "#c7d2fe",
    ring: "#4f46e5",
    radius: "0.75rem",
  },
  PHASE_3: {
    // Sequences & Series: Purple tones
    primary: "#9333ea",       // Purple 600
    primaryForeground: "#ffffff",
    secondary: "#f3e8ff",     // Purple 100
    secondaryForeground: "#6b21a8",
    accent: "#a855f7",        // Purple 500
    accentForeground: "#ffffff",
    background: "#faf5ff",    // Purple 50
    foreground: "#1c1917",
    card: "#ffffff",
    cardForeground: "#1c1917",
    muted: "#f3e8ff",
    mutedForeground: "#78716c",
    border: "#e9d5ff",
    ring: "#9333ea",
    radius: "0.625rem",
  },
  PHASE_4: {
    // Trigonometry: Amber tones
    primary: "#d97706",       // Amber 600
    primaryForeground: "#ffffff",
    secondary: "#fef3c7",     // Amber 100
    secondaryForeground: "#92400e",
    accent: "#f59e0b",        // Amber 500
    accentForeground: "#ffffff",
    background: "#fffbeb",    // Amber 50
    foreground: "#1c1917",
    card: "#ffffff",
    cardForeground: "#1c1917",
    muted: "#fef3c7",
    mutedForeground: "#78716c",
    border: "#fde68a",
    ring: "#d97706",
    radius: "0.5rem",
  },
  PHASE_5: {
    // Vectors & Geometry: Teal tones
    primary: "#0d9488",       // Teal 600
    primaryForeground: "#ffffff",
    secondary: "#ccfbf1",     // Teal 100
    secondaryForeground: "#115e59",
    accent: "#14b8a6",        // Teal 500
    accentForeground: "#ffffff",
    background: "#f0fdfa",    // Teal 50
    foreground: "#0f172a",
    card: "#ffffff",
    cardForeground: "#0f172a",
    muted: "#ccfbf1",
    mutedForeground: "#64748b",
    border: "#99f6e4",
    ring: "#0d9488",
    radius: "0.5rem",
  },
  PHASE_6: {
    // Statistics: Rose tones
    primary: "#e11d48",       // Rose 600
    primaryForeground: "#ffffff",
    secondary: "#ffe4e6",     // Rose 100
    secondaryForeground: "#9f1239",
    accent: "#f43f5e",        // Rose 500
    accentForeground: "#ffffff",
    background: "#fff1f2",    // Rose 50
    foreground: "#18181b",
    card: "#ffffff",
    cardForeground: "#18181b",
    muted: "#ffe4e6",
    mutedForeground: "#71717a",
    border: "#fecdd3",
    ring: "#e11d48",
    radius: "0.5rem",
  },
  PHASE_7: {
    // Differentiation: Orange tones
    primary: "#ea580c",       // Orange 600
    primaryForeground: "#ffffff",
    secondary: "#ffedd5",     // Orange 100
    secondaryForeground: "#9a3412",
    accent: "#f97316",        // Orange 500
    accentForeground: "#ffffff",
    background: "#fff7ed",    // Orange 50
    foreground: "#1c1917",
    card: "#ffffff",
    cardForeground: "#1c1917",
    muted: "#ffedd5",
    mutedForeground: "#78716c",
    border: "#fed7aa",
    ring: "#ea580c",
    radius: "0.5rem",
  },
  PHASE_8: {
    // Integration: Red tones
    primary: "#dc2626",       // Red 600
    primaryForeground: "#ffffff",
    secondary: "#fee2e2",     // Red 100
    secondaryForeground: "#991b1b",
    accent: "#ef4444",        // Red 500
    accentForeground: "#ffffff",
    background: "#fef2f2",    // Red 50
    foreground: "#18181b",
    card: "#ffffff",
    cardForeground: "#18181b",
    muted: "#fee2e2",
    mutedForeground: "#71717a",
    border: "#fecaca",
    ring: "#dc2626",
    radius: "0.375rem",
  },
  PHASE_9: {
    // HL Topics: Violet tones
    primary: "#7c3aed",       // Violet 600
    primaryForeground: "#ffffff",
    secondary: "#ede9fe",     // Violet 100
    secondaryForeground: "#5b21b6",
    accent: "#8b5cf6",        // Violet 500
    accentForeground: "#ffffff",
    background: "#f5f3ff",    // Violet 50
    foreground: "#18181b",
    card: "#ffffff",
    cardForeground: "#18181b",
    muted: "#ede9fe",
    mutedForeground: "#71717a",
    border: "#ddd6fe",
    ring: "#7c3aed",
    radius: "0.375rem",
  },
  PHASE_10: {
    // Exam Prep: Slate tones
    primary: "#475569",       // Slate 600
    primaryForeground: "#ffffff",
    secondary: "#f1f5f9",     // Slate 100
    secondaryForeground: "#0f172a",
    accent: "#64748b",        // Slate 500
    accentForeground: "#ffffff",
    background: "#f8fafc",    // Slate 50
    foreground: "#0f172a",
    card: "#ffffff",
    cardForeground: "#0f172a",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    border: "#e2e8f0",
    ring: "#475569",
    radius: "0.375rem",
  },
};
