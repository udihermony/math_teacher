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
  FOUNDATIONS: {
    // Ages 5-8: Bright, playful, rounded
    primary: "#8b5cf6",       // Purple
    primaryForeground: "#ffffff",
    secondary: "#fef3c7",     // Warm yellow
    secondaryForeground: "#92400e",
    accent: "#f59e0b",        // Amber
    accentForeground: "#ffffff",
    background: "#fffbeb",    // Warm cream
    foreground: "#1c1917",
    card: "#ffffff",
    cardForeground: "#1c1917",
    muted: "#fef3c7",
    mutedForeground: "#78716c",
    border: "#e7e5e4",
    ring: "#8b5cf6",
    radius: "1rem",
  },
  EXPLORER: {
    // Ages 8-11: Adventurous greens and blues
    primary: "#059669",       // Emerald
    primaryForeground: "#ffffff",
    secondary: "#d1fae5",     // Light green
    secondaryForeground: "#065f46",
    accent: "#3b82f6",        // Blue
    accentForeground: "#ffffff",
    background: "#f0fdf4",    // Mint
    foreground: "#1c1917",
    card: "#ffffff",
    cardForeground: "#1c1917",
    muted: "#d1fae5",
    mutedForeground: "#6b7280",
    border: "#d1d5db",
    ring: "#059669",
    radius: "0.75rem",
  },
  BUILDER: {
    // Ages 11-14: Bold, structured, blue-orange
    primary: "#2563eb",       // Blue
    primaryForeground: "#ffffff",
    secondary: "#f1f5f9",
    secondaryForeground: "#0f172a",
    accent: "#f97316",        // Orange
    accentForeground: "#ffffff",
    background: "#ffffff",
    foreground: "#0f172a",
    card: "#ffffff",
    cardForeground: "#0f172a",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    border: "#e2e8f0",
    ring: "#2563eb",
    radius: "0.5rem",
  },
  CHALLENGER: {
    // Ages 14-16: Sleek, dark accents, professional
    primary: "#7c3aed",       // Violet
    primaryForeground: "#ffffff",
    secondary: "#f5f3ff",
    secondaryForeground: "#1e1b4b",
    accent: "#ec4899",        // Pink
    accentForeground: "#ffffff",
    background: "#fafafa",
    foreground: "#18181b",
    card: "#ffffff",
    cardForeground: "#18181b",
    muted: "#f4f4f5",
    mutedForeground: "#71717a",
    border: "#e4e4e7",
    ring: "#7c3aed",
    radius: "0.375rem",
  },
  IB_READY: {
    // Ages 16-18: Mature, minimal, sophisticated
    primary: "#1d4ed8",       // Deep blue
    primaryForeground: "#ffffff",
    secondary: "#f8fafc",
    secondaryForeground: "#0f172a",
    accent: "#0d9488",        // Teal
    accentForeground: "#ffffff",
    background: "#ffffff",
    foreground: "#0f172a",
    card: "#ffffff",
    cardForeground: "#0f172a",
    muted: "#f1f5f9",
    mutedForeground: "#64748b",
    border: "#e2e8f0",
    ring: "#1d4ed8",
    radius: "0.375rem",
  },
};
