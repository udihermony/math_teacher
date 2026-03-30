"use client";

import { useState } from "react";
import { Save, Loader2, Check, Key, Eye, EyeOff } from "lucide-react";

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
];

export function SettingsForm({ initialName, email, initialProvider, hasApiKey }: SettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [aiProvider, setAiProvider] = useState(initialProvider ?? "");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(hasApiKey);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;

    setSaving(true);
    const body: Record<string, unknown> = { name: name.trim() };

    // AI settings
    body.aiProvider = aiProvider || null;
    if (apiKey) {
      body.aiApiKey = apiKey;
    } else if (!aiProvider) {
      // Clearing provider also clears key
      body.aiApiKey = null;
    }

    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setHasKey(data.hasApiKey);
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  function handleClearKey() {
    setApiKey("");
    setHasKey(false);
    // Will be persisted on save
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
              onChange={(e) => setAiProvider(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {aiProvider && (
            <div>
              <label className="mb-1 block text-sm font-medium">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasKey ? "Key saved (enter new to replace)" : "Paste your API key"}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 pr-20 text-sm font-mono"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {hasKey && (
                    <button
                      type="button"
                      onClick={handleClearKey}
                      className="rounded px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {hasKey && !apiKey && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">Key is saved and encrypted.</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Your key is encrypted and stored securely. It is never exposed to the browser.
              </p>
            </div>
          )}
        </div>
      </div>

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
