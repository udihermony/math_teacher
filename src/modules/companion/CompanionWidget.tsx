"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useCompanion } from "./hooks/useCompanion";
import { CompanionChat } from "./CompanionChat";
import { CompanionBubble } from "./CompanionBubble";

export function CompanionWidget() {
  const { isOpen, toggle, lastHint } = useCompanion();

  return (
    <>
      {/* Hint bubble */}
      <AnimatePresence>
        {lastHint && !isOpen && <CompanionBubble />}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && <CompanionChat />}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={toggle}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:opacity-90"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? "Close Pi companion" : "Open Pi companion"}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="text-xl font-bold"
            >
              ×
            </motion.span>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle size={24} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
