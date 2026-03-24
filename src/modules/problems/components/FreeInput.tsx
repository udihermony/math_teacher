"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FreeInputContent } from "../types";

interface FreeInputProps {
  content: FreeInputContent;
  onSubmit: (answer: { value: string }) => void;
  disabled?: boolean;
  result?: { isCorrect: boolean; correctAnswer?: string } | null;
}

export function FreeInput({
  content,
  onSubmit,
  disabled,
  result,
}: FreeInputProps) {
  const [value, setValue] = useState("");
  const [showHint, setShowHint] = useState(false);

  const submitted = result !== null && result !== undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit({ value: value.trim() });
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-medium">{content.question}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled || submitted}
            placeholder="Type your answer..."
            className={`w-full rounded-lg border-2 bg-background px-4 py-3 text-lg outline-none transition ${
              submitted
                ? result?.isCorrect
                  ? "border-green-500 bg-green-50"
                  : "border-red-500 bg-red-50"
                : "border-border focus:border-primary"
            } disabled:cursor-not-allowed`}
            autoComplete="off"
          />
        </div>

        <AnimatePresence>
          {submitted && result && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-lg p-4 text-sm font-medium ${
                result.isCorrect
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {result.isCorrect ? (
                "Correct! Well done!"
              ) : (
                <>
                  Not quite.{" "}
                  {result.correctAnswer && (
                    <span>
                      The correct answer is{" "}
                      <strong>{result.correctAnswer}</strong>.
                    </span>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!submitted && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!value.trim() || disabled}
              className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              Submit
            </button>

            {content.hints && content.hints.length > 0 && !showHint && (
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Need a hint?
              </button>
            )}
          </div>
        )}
      </form>

      <AnimatePresence>
        {showHint && content.hints && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
          >
            💡 {content.hints[0]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
