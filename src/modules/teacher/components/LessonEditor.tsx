"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Type, Lightbulb, BookOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ContentBlock {
  type: "text" | "example" | "callout" | "practice";
  content?: string;
  title?: string;
  solution?: string;
  variant?: "tip" | "warning" | "definition";
  problemIds?: string[];
}

interface LessonData {
  title: string;
  slug: string;
  description: string;
  xpReward: number;
  coinableCount: number | null;
  blocks: ContentBlock[];
}

interface LessonEditorProps {
  initialData?: LessonData;
  topicId: string;
  onSave: (data: LessonData) => Promise<void>;
  saving: boolean;
}

const BLOCK_TYPES = [
  { type: "text" as const, label: "Text", icon: Type },
  { type: "example" as const, label: "Example", icon: BookOpen },
  { type: "callout" as const, label: "Callout", icon: Lightbulb },
];

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function LessonEditor({ initialData, topicId, onSave, saving }: LessonEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [xpReward, setXpReward] = useState(initialData?.xpReward || 10);
  const [coinableCount, setCoinableCount] = useState<number | null>(initialData?.coinableCount ?? null);
  const [blocks, setBlocks] = useState<ContentBlock[]>(
    initialData?.blocks || [{ type: "text", content: "" }]
  );
  const [autoSlug, setAutoSlug] = useState(!initialData);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (autoSlug) setSlug(slugify(value));
  }

  function addBlock(type: ContentBlock["type"]) {
    const newBlock: ContentBlock = { type };
    if (type === "text") newBlock.content = "";
    if (type === "example") {
      newBlock.title = "";
      newBlock.content = "";
      newBlock.solution = "";
    }
    if (type === "callout") {
      newBlock.variant = "tip";
      newBlock.content = "";
    }
    setBlocks([...blocks, newBlock]);
  }

  function updateBlock(index: number, updates: Partial<ContentBlock>) {
    setBlocks(blocks.map((b, i) => (i === index ? { ...b, ...updates } : b)));
  }

  function removeBlock(index: number) {
    if (blocks.length <= 1) return;
    setBlocks(blocks.filter((_, i) => i !== index));
  }

  function moveBlock(from: number, to: number) {
    if (to < 0 || to >= blocks.length) return;
    const updated = [...blocks];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setBlocks(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ title, slug, description, xpReward, coinableCount, blocks });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Meta fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Lesson Title"
          id="title"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          required
          placeholder="e.g. Introduction to Fractions"
        />
        <Input
          label="URL Slug"
          id="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setAutoSlug(false);
          }}
          required
          placeholder="introduction-to-fractions"
        />
      </div>

      <div>
        <label htmlFor="desc" className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Brief description of this lesson..."
        />
      </div>

      <div className="flex items-end gap-4">
        <Input
          label="XP Reward"
          id="xp"
          type="number"
          value={String(xpReward)}
          onChange={(e) => setXpReward(parseInt(e.target.value) || 10)}
          className="w-32"
        />
        <div className="w-48">
          <label htmlFor="coinable" className="mb-1 block text-sm font-medium">
            Coinable Questions
          </label>
          <div className="flex items-center gap-2">
            <input
              id="coinable"
              type="number"
              min={0}
              value={coinableCount ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setCoinableCount(v === "" ? null : Math.max(0, parseInt(v) || 0));
              }}
              placeholder="Auto"
              className="w-24 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-xs text-muted-foreground">
              {coinableCount == null ? "(phase default)" : ""}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How many practice answers earn coins
          </p>
        </div>
      </div>

      {/* Content blocks */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Content Blocks</h2>
        <div className="space-y-3">
          {blocks.map((block, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <GripVertical size={14} className="cursor-grab text-muted-foreground" />
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {block.type}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveBlock(idx, idx - 1)}
                    disabled={idx === 0}
                    className="rounded p-1 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(idx, idx + 1)}
                    disabled={idx === blocks.length - 1}
                    className="rounded p-1 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBlock(idx)}
                    disabled={blocks.length <= 1}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {block.type === "text" && (
                <textarea
                  value={block.content || ""}
                  onChange={(e) => updateBlock(idx, { content: e.target.value })}
                  rows={4}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring font-mono"
                  placeholder="Markdown content with KaTeX support..."
                />
              )}

              {block.type === "example" && (
                <div className="space-y-2">
                  <Input
                    placeholder="Example title"
                    value={block.title || ""}
                    onChange={(e) => updateBlock(idx, { title: e.target.value })}
                  />
                  <textarea
                    value={block.content || ""}
                    onChange={(e) => updateBlock(idx, { content: e.target.value })}
                    rows={3}
                    placeholder="Example problem/content..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <textarea
                    value={block.solution || ""}
                    onChange={(e) => updateBlock(idx, { solution: e.target.value })}
                    rows={2}
                    placeholder="Solution..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {block.type === "callout" && (
                <div className="space-y-2">
                  <select
                    value={block.variant || "tip"}
                    onChange={(e) =>
                      updateBlock(idx, { variant: e.target.value as ContentBlock["variant"] })
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="tip">Tip</option>
                    <option value="warning">Warning</option>
                    <option value="definition">Definition</option>
                  </select>
                  <textarea
                    value={block.content || ""}
                    onChange={(e) => updateBlock(idx, { content: e.target.value })}
                    rows={2}
                    placeholder="Callout content..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add block buttons */}
        <div className="mt-3 flex items-center gap-2">
          {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type)}
              className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={saving || !title.trim() || !slug.trim()}>
          {saving ? "Saving..." : initialData ? "Update Lesson" : "Create Lesson"}
        </Button>
      </div>
    </form>
  );
}
