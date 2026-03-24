"use client";

import { useEffect, useState } from "react";
import { type BadgeDefinition } from "../badge-definitions";
import { BadgeCard } from "./BadgeCard";

interface LevelUpModalProps {
  show: boolean;
  level: number;
  newBadges?: BadgeDefinition[];
  onClose: () => void;
}

export function LevelUpModal({ show, level, newBadges, onClose }: LevelUpModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Slight delay for mount animation
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative z-10 mx-4 w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-2xl transition-all duration-500 ${
          visible ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
      >
        {/* Celebration particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          {visible && <Particles />}
        </div>

        {/* Content */}
        <div className="relative">
          <div className="mb-2 text-5xl">🎉</div>
          <h2 className="mb-1 text-2xl font-bold">Level Up!</h2>
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white shadow-lg">
            {level}
          </div>
          <p className="mb-4 text-muted-foreground">
            You&apos;ve reached Level {level}!
          </p>

          {newBadges && newBadges.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium">New badges earned:</p>
              <div className="flex flex-col gap-2">
                {newBadges.map((badge) => (
                  <BadgeCard key={badge.slug} badge={badge} />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary/90"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

/** Simple CSS particle animation. */
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    duration: `${1 + Math.random() * 1.5}s`,
    color: ["#f59e0b", "#3b82f6", "#22c55e", "#a855f7", "#ef4444"][i % 5],
    size: 4 + Math.random() * 6,
  }));

  return (
    <>
      <style>{`
        @keyframes particle-rise {
          0% { transform: translateY(100%) scale(1); opacity: 1; }
          100% { transform: translateY(-200%) scale(0); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: 0,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `particle-rise ${p.duration} ${p.delay} ease-out forwards`,
          }}
        />
      ))}
    </>
  );
}
