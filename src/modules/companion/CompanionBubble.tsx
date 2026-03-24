"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useCompanion } from "./hooks/useCompanion";

export function CompanionBubble() {
  const { lastHint, dismissHint, open } = useCompanion();

  if (!lastHint) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9 }}
      className="fixed bottom-20 right-4 z-40 max-w-[300px]"
    >
      <div className="relative rounded-2xl rounded-br-md border border-border bg-card p-4 shadow-lg">
        <button
          onClick={dismissHint}
          className="absolute right-2 top-2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X size={12} />
        </button>

        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            Pi
          </div>
          <div>
            <p className="text-sm text-foreground">{lastHint}</p>
            <button
              onClick={() => {
                dismissHint();
                open();
              }}
              className="mt-2 text-xs font-medium text-primary hover:underline"
            >
              Chat with Pi →
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
