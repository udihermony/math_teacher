"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Trophy, Zap } from "lucide-react";
import { ProblemRenderer } from "@/modules/problems";
import { useProblem } from "@/modules/problems/hooks/useProblem";
import { useCompanion } from "@/modules/companion";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { LevelUpModal } from "@/modules/gamification/components/LevelUpModal";
import { XPBar } from "@/modules/gamification/components/XPBar";
import { StreakCounter } from "@/modules/gamification/components/StreakCounter";
import type { BadgeDefinition } from "@/modules/gamification/badge-definitions";

interface ProblemData {
  id: string;
  type: string;
  difficulty: number;
  content: Record<string, unknown>;
  solution?: { steps: string[] } | null;
  lesson?: { title: string } | null;
  skills?: { skill: { name: string } }[];
}

export default function PracticePage() {
  return (
    <Suspense>
      <PracticeInner />
    </Suspense>
  );
}

function PracticeInner() {
  const searchParams = useSearchParams();
  const {
    problem,
    loading,
    result,
    submitting,
    error,
    fetchProblems,
    fetchProblem,
    submitAnswer,
    nextProblem,
  } = useProblem();

  const [problemQueue, setProblemQueue] = useState<ProblemData[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const { setProblemContext, showHint } = useCompanion();

  // Gamification state
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ level: number; badges: BadgeDefinition[] }>({
    level: 1,
    badges: [],
  });
  const [currentXP, setCurrentXP] = useState({ level: 1, xp: 0, progress: 0, xpToNext: 71 });
  const [currentStreak, setCurrentStreak] = useState({ streak: 0, isActiveToday: false });

  // Load problems on mount, passing lessonId/topicId from URL if present
  useEffect(() => {
    const params: Record<string, string> = {};
    const lessonId = searchParams.get("lessonId");
    const topicId = searchParams.get("topicId");
    if (lessonId) params.lessonId = lessonId;
    if (topicId) params.topicId = topicId;

    fetchProblems(params).then((problems) => {
      setProblemQueue(problems as ProblemData[]);
      if (problems.length > 0) {
        fetchProblem(problems[0].id);
      }
    });
  }, [fetchProblems, fetchProblem, searchParams]);

  const handleSubmit = useCallback(
    async (answer: Record<string, unknown>) => {
      await submitAnswer(answer);
    },
    [submitAnswer]
  );

  // Track score, gamification updates, and trigger Pi hint on wrong answers
  useEffect(() => {
    if (result) {
      setScore((prev) => ({
        correct: prev.correct + (result.isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));

      // Update gamification state
      if (result.xp) {
        setCurrentXP({
          level: result.xp.level,
          xp: result.xp.totalXP,
          progress: result.xp.progress,
          xpToNext: result.xp.xpToNext,
        });

        if (result.xp.leveledUp) {
          setLevelUpData({
            level: result.xp.level,
            badges: (result.newBadges as BadgeDefinition[]) ?? [],
          });
          setShowLevelUp(true);
        }
      }

      if (result.streak) {
        setCurrentStreak({
          streak: result.streak.current,
          isActiveToday: true,
        });
      }

      if (!result.isCorrect && problem) {
        setProblemContext(problem.id);
        showHint("Hmm, that wasn't quite right. Want to talk through it? I can help you figure it out!");
      }
    }
  }, [result, problem, setProblemContext, showHint]);

  function handleNext() {
    const nextIdx = queueIndex + 1;
    if (nextIdx < problemQueue.length) {
      setQueueIndex(nextIdx);
      nextProblem();
      fetchProblem(problemQueue[nextIdx].id);
    }
  }

  const currentProblemData = problemQueue[queueIndex] as ProblemData | undefined;
  const isLastProblem = queueIndex >= problemQueue.length - 1;

  if (loading && !problem) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !problem) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (problemQueue.length === 0 && !loading) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Practice</h1>
        <p className="mt-2 text-muted-foreground">
          No problems available yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Level up modal */}
      <LevelUpModal
        show={showLevelUp}
        level={levelUpData.level}
        newBadges={levelUpData.badges}
        onClose={() => setShowLevelUp(false)}
      />

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Practice</h1>
          {currentProblemData?.lesson && (
            <p className="text-sm text-muted-foreground">
              {currentProblemData.lesson.title}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <StreakCounter streak={currentStreak.streak} isActiveToday={currentStreak.isActiveToday} compact />
          <Badge variant="primary">
            {queueIndex + 1} / {problemQueue.length}
          </Badge>
          {score.total > 0 && (
            <Badge variant={score.correct === score.total ? "success" : "default"}>
              <Trophy size={12} className="mr-1" />
              {score.correct} / {score.total}
            </Badge>
          )}
        </div>
      </div>

      {/* XP bar */}
      <div className="mb-4">
        <XPBar level={currentXP.level} xp={currentXP.xp} progress={currentXP.progress} xpToNext={currentXP.xpToNext} compact />
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{
            width: `${((queueIndex + (result ? 1 : 0)) / problemQueue.length) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Problem card */}
      <AnimatePresence mode="wait">
        {problem && (
          <motion.div
            key={problem.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            {/* Difficulty indicator */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Difficulty:</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-3 rounded-full ${
                      i < problem.difficulty ? "bg-primary" : "bg-secondary"
                    }`}
                  />
                ))}
              </div>
              {currentProblemData?.skills?.map((s) => (
                <Badge key={s.skill.name} variant="default">
                  {s.skill.name}
                </Badge>
              ))}
            </div>

            <ProblemRenderer
              problem={problem}
              onSubmit={handleSubmit}
              result={result}
              disabled={submitting}
            />

            {/* XP earned animation */}
            <AnimatePresence>
              {result?.isCorrect && result.xpEarned && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center justify-center gap-2 text-amber-600"
                >
                  <Zap size={20} />
                  <span className="text-lg font-bold">
                    +{result.xpEarned} XP
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button */}
            {result && !isLastProblem && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 flex justify-end"
              >
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* Session complete */}
            {result && isLastProblem && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-lg bg-primary/10 p-6 text-center"
              >
                <Trophy size={32} className="mx-auto mb-2 text-primary" />
                <h2 className="text-lg font-bold">Practice Complete!</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You got {score.correct} out of {score.total} correct.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Practice Again
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
