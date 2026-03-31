"use client";

import { useState } from "react";
import { Save, Loader2, Check, Key, Eye, EyeOff, ShieldCheck } from "lucide-react";

interface SettingsFormProps {
  initialName: string;
  email: string;
  initialProvider: string | null;
  hasApiKey: boolean;
}

const PROVIDERS = [
  { value: "", label: "Default (platform key)" },
  { value: "ANTHROPIC", label: "Anthropic (Claude)" },
  { value: "OPENAI", label: "OpenAI (GPT)" },
  { value: "GEMINI", label: "Google (Gemini)" },
  { value: "LOCAL", label: "Local LLM (LM Studio / Ollama)" },
];

export function SettingsForm({ initialName, email, initialProvider, hasApiKey }: SettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [aiProvider, setAiProvider] = useState(initialProvider ?? "");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(hasApiKey);
  const [clearKey, setClearKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;

    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = { name: name.trim() };

    // AI settings
    body.aiProvider = aiProvider || null;
    if (apiKey) {
      body.aiApiKey = apiKey;
    } else if (!aiProvider || clearKey) {
      body.aiApiKey = null;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setHasKey(data.hasApiKey);
        setApiKey("");
        setClearKey(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to save settings");
      }
    } catch {
      setError("Failed to connect to server");
    }
    setSaving(false);
  }

  function handleClearKey() {
    setApiKey("");
    setHasKey(false);
    setClearKey(true);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 font-semibold">Profile</h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-1 font-semibold flex items-center gap-2">
          <Key size={16} />
          AI Provider
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Use your own API key or leave empty to use the platform default.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => {
                setAiProvider(e.target.value);
                if (!e.target.value) {
                  setClearKey(true);
                  setHasKey(false);
                  setApiKey("");
                }
              }}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {aiProvider && aiProvider !== "LOCAL" && (
            <div>
              <label className="mb-1 block text-sm font-medium">API Key</label>
              {hasKey && !apiKey ? (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-900 dark:bg-green-950/30">
                  <ShieldCheck size={16} className="text-green-600 dark:text-green-400 shrink-0" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    API key is saved and encrypted
                  </span>
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="ml-auto rounded px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasKey(false)}
                    className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your API key"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              )}
              <p className="mt-1.5 text-xs text-muted-foreground">
                Your key is encrypted before storage and never exposed to the browser.
              </p>
            </div>
          )}

          {aiProvider === "LOCAL" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Server URL</label>
              {hasKey && !apiKey ? (
                <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-900 dark:bg-green-950/30">
                  <ShieldCheck size={16} className="text-green-600 dark:text-green-400 shrink-0" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Server URL is saved
                  </span>
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="ml-auto rounded px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasKey(false)}
                    className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="http://192.168.1.132:1234"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
                />
              )}
              <p className="mt-1.5 text-xs text-muted-foreground">
                The base URL of your local LLM server (LM Studio, Ollama, etc). Uses OpenAI-compatible API.
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : saved ? (
          <Check size={16} />
        ) : (
          <Save size={16} />
        )}
        {saved ? "Saved!" : "Save Changes"}
      </button>
    </form>
  );
}
