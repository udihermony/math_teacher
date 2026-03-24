"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import type { MultipleChoiceContent } from "../types";

interface MultipleChoiceProps {
  content: MultipleChoiceContent;
  onSubmit: (answer: { selectedIndex: number }) => void;
  disabled?: boolean;
  result?: { isCorrect: boolean } | null;
}

export function MultipleChoice({
  content,
  onSubmit,
  disabled,
  result,
}: MultipleChoiceProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  const submitted = result !== null && result !== undefined;

  function handleSubmit() {
    if (selected === null || disabled) return;
    onSubmit({ selectedIndex: selected });
  }

  return (
    <div className="space-y-4" role="group" aria-label="Multiple choice question">
      <p className="text-lg font-medium" id="mc-question">{content.question}</p>

      <div className="space-y-2" role="radiogroup" aria-labelledby="mc-question">
        {content.options.map((option, idx) => {
          const isSelected = selected === idx;
          const isCorrect = submitted && idx === content.correctIndex;
          const isWrong = submitted && isSelected && !isCorrect;

          let borderColor = "border-border";
          let bg = "bg-background";
          if (submitted && isCorrect) {
            borderColor = "border-green-500";
            bg = "bg-green-50";
          } else if (isWrong) {
            borderColor = "border-red-500";
            bg = "bg-red-50";
          } else if (isSelected && !submitted) {
            borderColor = "border-primary";
            bg = "bg-primary/5";
          }

          return (
            <motion.button
              key={idx}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Option ${String.fromCharCode(65 + idx)}: ${option}`}
              disabled={disabled || submitted}
              onClick={() => setSelected(idx)}
              className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm transition ${borderColor} ${bg} disabled:cursor-not-allowed`}
              whileTap={!submitted ? { scale: 0.98 } : undefined}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                  isSelected && !submitted
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {submitted && isCorrect ? (
                  <Check size={14} />
                ) : submitted && isWrong ? (
                  <X size={14} />
                ) : (
                  String.fromCharCode(65 + idx)
                )}
              </span>
              <span>{option}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {submitted && result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            aria-live="assertive"
            className={`rounded-lg p-4 text-sm font-medium ${
              result.isCorrect
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {result.isCorrect ? "Correct! Great job!" : "Not quite. Take a look at the correct answer above."}
          </motion.div>
        )}
      </AnimatePresence>

      {!submitted && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={selected === null || disabled}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Submit
          </button>

          {content.hints && content.hints.length > 0 && !showHint && (
            <button
              onClick={() => setShowHint(true)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Need a hint?
            </button>
          )}
        </div>
      )}

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
