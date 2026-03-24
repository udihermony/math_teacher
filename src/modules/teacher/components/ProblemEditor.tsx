"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ProblemData {
  type: string;
  difficulty: number;
  content: Record<string, unknown>;
  commonMistakes?: Record<string, unknown>;
  solution?: Record<string, unknown>;
  skillIds: string[];
}

interface Skill {
  id: string;
  name: string;
}

interface ProblemEditorProps {
  initialData?: ProblemData;
  availableSkills: Skill[];
  onSave: (data: ProblemData) => Promise<void>;
  saving: boolean;
}

export function ProblemEditor({ initialData, availableSkills, onSave, saving }: ProblemEditorProps) {
  const [type, setType] = useState(initialData?.type || "MULTIPLE_CHOICE");
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || 5);
  const [question, setQuestion] = useState(
    (initialData?.content?.question as string) || ""
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    initialData?.skillIds || []
  );
  const [solutionSteps, setSolutionSteps] = useState<string[]>(
    (initialData?.solution?.steps as string[]) || [""]
  );
  const [commonMistakes, setCommonMistakes] = useState(
    ((initialData?.commonMistakes?.patterns as string[]) || [""]).join("\n")
  );

  // Multiple choice state
  const [options, setOptions] = useState<string[]>(
    (initialData?.content?.options as string[]) || ["", "", "", ""]
  );
  const [correctIndex, setCorrectIndex] = useState(
    (initialData?.content?.correctIndex as number) ?? 0
  );
  const [hints, setHints] = useState<string[]>(
    (initialData?.content?.hints as string[]) || [""]
  );

  // Free input state
  const [correctAnswer, setCorrectAnswer] = useState(
    (initialData?.content?.correctAnswer as string) || ""
  );

  function toggleSkill(skillId: string) {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((s) => s !== skillId)
        : [...prev, skillId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const content: Record<string, unknown> = { question };

    if (type === "MULTIPLE_CHOICE") {
      content.options = options.filter((o) => o.trim());
      content.correctIndex = correctIndex;
      content.hints = hints.filter((h) => h.trim());
    } else if (type === "FREE_INPUT") {
      content.correctAnswer = correctAnswer;
      content.hints = hints.filter((h) => h.trim());
    }

    const data: ProblemData = {
      type,
      difficulty,
      content,
      skillIds: selectedSkills,
    };

    const filteredSteps = solutionSteps.filter((s) => s.trim());
    if (filteredSteps.length > 0) {
      data.solution = { steps: filteredSteps };
    }

    const mistakeLines = commonMistakes
      .split("\n")
      .filter((l) => l.trim());
    if (mistakeLines.length > 0) {
      data.commonMistakes = { patterns: mistakeLines };
    }

    await onSave(data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type and difficulty */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium">
            Problem Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="FREE_INPUT">Free Input</option>
            <option value="WORKED_SOLUTION">Worked Solution</option>
          </select>
        </div>

        <div>
          <label htmlFor="diff" className="mb-1 block text-sm font-medium">
            Difficulty (1-10): {difficulty}
          </label>
          <input
            id="diff"
            type="range"
            min={1}
            max={10}
            value={difficulty}
            onChange={(e) => setDifficulty(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Question */}
      <div>
        <label htmlFor="question" className="mb-1 block text-sm font-medium">
          Question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          required
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter the question text..."
        />
      </div>

      {/* Type-specific fields */}
      {type === "MULTIPLE_CHOICE" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Answer Options</h3>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={correctIndex === idx}
                onChange={() => setCorrectIndex(idx)}
                className="h-4 w-4"
              />
              <span className="w-6 text-center text-xs font-medium text-muted-foreground">
                {String.fromCharCode(65 + idx)}
              </span>
              <input
                value={opt}
                onChange={(e) => {
                  const updated = [...options];
                  updated[idx] = e.target.value;
                  setOptions(updated);
                }}
                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => {
                    setOptions(options.filter((_, i) => i !== idx));
                    if (correctIndex >= idx && correctIndex > 0) {
                      setCorrectIndex(correctIndex - 1);
                    }
                  }}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Plus size={12} />
              Add option
            </button>
          )}
        </div>
      )}

      {type === "FREE_INPUT" && (
        <Input
          label="Correct Answer"
          value={correctAnswer}
          onChange={(e) => setCorrectAnswer(e.target.value)}
          required
          placeholder="e.g. 42 or 2x + 3"
        />
      )}

      {/* Hints */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Hints</h3>
        {hints.map((hint, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              value={hint}
              onChange={(e) => {
                const updated = [...hints];
                updated[idx] = e.target.value;
                setHints(updated);
              }}
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={`Hint ${idx + 1}`}
            />
            {hints.length > 1 && (
              <button
                type="button"
                onClick={() => setHints(hints.filter((_, i) => i !== idx))}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setHints([...hints, ""])}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus size={12} />
          Add hint
        </button>
      </div>

      {/* Solution steps */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Solution Steps</h3>
        {solutionSteps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{idx + 1}.</span>
            <input
              value={step}
              onChange={(e) => {
                const updated = [...solutionSteps];
                updated[idx] = e.target.value;
                setSolutionSteps(updated);
              }}
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder={`Step ${idx + 1}`}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSolutionSteps([...solutionSteps, ""])}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus size={12} />
          Add step
        </button>
      </div>

      {/* Common mistakes */}
      <div>
        <label htmlFor="mistakes" className="mb-1 block text-sm font-medium">
          Common Mistakes (one per line)
        </label>
        <textarea
          id="mistakes"
          value={commonMistakes}
          onChange={(e) => setCommonMistakes(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g. Forgetting to carry over in addition"
        />
      </div>

      {/* Skills */}
      {availableSkills.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {availableSkills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => toggleSkill(skill.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedSkills.includes(skill.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {skill.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="border-t border-border pt-4">
        <Button type="submit" disabled={saving || !question.trim()}>
          {saving ? "Saving..." : initialData ? "Update Problem" : "Create Problem"}
        </Button>
      </div>
    </form>
  );
}
