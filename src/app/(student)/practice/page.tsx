"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Trophy,
  Zap,
  Coins,
  ArrowLeft,
  Check,
  ClipboardList,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { ProblemRenderer } from "@/modules/problems";
import { useProblem } from "@/modules/problems/hooks/useProblem";
import { useCompanion } from "@/modules/companion";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { LevelUpModal } from "@/modules/gamification/components/LevelUpModal";
import { XPBar } from "@/modules/gamification/components/XPBar";
import { StreakCounter } from "@/modules/gamification/components/StreakCounter";
import { TopicBrowser } from "./TopicBrowser";
import type { BadgeDefinition } from "@/modules/gamification/badge-definitions";

interface ProblemData {
  id: string;
  type: string;
  difficulty: number;
  content: Record<string, unknown>;
  solution?: { steps: string[] } | null;
  lesson?: { title: string } | null;
  skills?: { skill: { name: string } }[];
  solvedByUser?: boolean;
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
  const router = useRouter();
  const lessonId = searchParams.get("lessonId");
  const topicId = searchParams.get("topicId");
  const phase = searchParams.get("phase");
  const assignmentIds = searchParams.get("ids");
  const passingGradeParam = searchParams.get("passingGrade");
  const passingGrade = passingGradeParam ? parseInt(passingGradeParam) : null;

  const hasPracticeParams = !!(lessonId || topicId || phase || assignmentIds);
  const isQuizMode = !!assignmentIds;

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
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());
  const [retaking, setRetaking] = useState(false);
  const { setProblemContext, setLessonContext, showHint } = useCompanion();

  // Gamification state
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ level: number; badges: BadgeDefinition[] }>({
    level: 1,
    badges: [],
  });
  const [currentXP, setCurrentXP] = useState({ level: 1, xp: 0, progress: 0, xpToNext: 71 });
  const [currentStreak, setCurrentStreak] = useState({ streak: 0, isActiveToday: false });
  const [coinBalance, setCoinBalance] = useState(0);
  const [lastCoinsEarned, setLastCoinsEarned] = useState(0);

  // Set lesson context for companion chat persistence
  useEffect(() => {
    setLessonContext(lessonId);
    return () => setLessonContext(null);
  }, [lessonId, setLessonContext]);

  // Load problems
  useEffect(() => {
    if (!hasPracticeParams) return;
    const params: Record<string, string> = {};

    if (assignmentIds) {
      params.ids = assignmentIds;
    } else {
      if (lessonId) params.lessonId = lessonId;
      if (topicId) { params.topicId = topicId; params.limit = "100"; }
      if (phase) { params.phase = phase; params.limit = "200"; }
    }

    fetchProblems(params).then((problems) => {
      const typed = problems as ProblemData[];
      setProblemQueue(typed);
      setSolvedIds(new Set(typed.filter((p) => p.solvedByUser).map((p) => p.id)));
      if (typed.length > 0) {
        fetchProblem(typed[0].id);
      }
    });
  }, [fetchProblems, fetchProblem, searchParams]);

  const handleSubmit = useCallback(
    async (answer: Record<string, unknown>) => {
      await submitAnswer(answer);
    },
    [submitAnswer]
  );

  // Track score and gamification
  useEffect(() => {
    if (result) {
      setScore((prev) => ({
        correct: prev.correct + (result.isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));

      if (result.isCorrect && problem) {
        setSolvedIds((prev) => new Set(prev).add(problem.id));
      }

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

      if (result.coins) {
        setCoinBalance(result.coins.balance);
        setLastCoinsEarned(result.coins.earned);
      } else {
        setLastCoinsEarned(0);
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

  function goToProblem(index: number) {
    if (index !== queueIndex) {
      setQueueIndex(index);
      nextProblem();
      fetchProblem(problemQueue[index].id);
    }
  }

  async function handleRetakeQuiz() {
    if (!assignmentIds) return;
    setRetaking(true);
    try {
      // Ask the server to regenerate quiz questions
      const res = await fetch("/api/student/retake-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemIds: assignmentIds.split(",") }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.newIds?.length) {
          // Navigate to the new quiz
          router.push(`/practice?ids=${data.newIds.join(",")}`);
          return;
        }
      }
      // Fallback: just reload the same quiz
      window.location.reload();
    } catch {
      window.location.reload();
    } finally {
      setRetaking(false);
    }
  }

  const currentProblemData = problemQueue[queueIndex] as ProblemData | undefined;
  const isLastProblem = queueIndex >= problemQueue.length - 1;

  // No params → topic browser
  if (!hasPracticeParams) {
    return <TopicBrowser />;
  }

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
        <h1 className="text-2xl font-bold">{isQuizMode ? "Quiz" : "Practice"}</h1>
        <p className="mt-2 text-muted-foreground">
          No problems available yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <LevelUpModal
        show={showLevelUp}
        level={levelUpData.level}
        newBadges={levelUpData.badges}
        onClose={() => setShowLevelUp(false)}
      />

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(isQuizMode ? "/dashboard" : "/practice")}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title={isQuizMode ? "Back to dashboard" : "Back to topics"}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                {isQuizMode ? "Quiz" : "Practice"}
              </h1>
              {isQuizMode && (
                <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-semibold uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  <ClipboardList size={12} className="mr-1 inline" />
                  {problemQueue.length} Questions
                </span>
              )}
            </div>
            {currentProblemData?.lesson && (
              <p className="text-sm text-muted-foreground">
                {currentProblemData.lesson.title}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {coinBalance > 0 && (
            <span className="flex items-center gap-1 text-sm font-medium text-amber-500">
              <Coins size={14} /> {coinBalance}
            </span>
          )}
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

      {/* Practice mode: clickable dots with solved indicators */}
      {!isQuizMode && (
        <div className="mb-6 flex items-center gap-1 overflow-x-auto py-1">
          {problemQueue.map((p, i) => {
            const isSolved = solvedIds.has(p.id);
            const isCurrent = i === queueIndex;
            return (
              <button
                key={p.id}
                onClick={() => goToProblem(i)}
                className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                  isCurrent
                    ? "ring-2 ring-primary ring-offset-1 bg-primary text-primary-foreground"
                    : isSolved
                    ? "bg-green-500 text-white"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
                title={isSolved ? `Q${i + 1} — Solved` : `Q${i + 1}`}
              >
                {isSolved && !isCurrent ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Quiz mode: clickable question indicators */}
      {isQuizMode && (
        <div className="mb-6">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {problemQueue.map((p, i) => {
              const isSolved = solvedIds.has(p.id);
              const isCurrent = i === queueIndex;
              return (
                <button
                  key={p.id}
                  onClick={() => goToProblem(i)}
                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                    isCurrent
                      ? "ring-2 ring-amber-500 ring-offset-1 bg-amber-500 text-white"
                      : isSolved
                      ? "bg-green-500 text-white"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                  title={isSolved ? `Q${i + 1} — Solved` : `Q${i + 1}`}
                >
                  {isSolved && !isCurrent ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Question {queueIndex + 1} of {problemQueue.length}
          </p>
        </div>
      )}

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

            {/* XP + Coin earned animation */}
            <AnimatePresence>
              {result?.isCorrect && (result.xpEarned || lastCoinsEarned > 0) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 flex items-center justify-center gap-4"
                >
                  {result.xpEarned && (
                    <span className="flex items-center gap-1 text-lg font-bold text-amber-600">
                      <Zap size={20} /> +{result.xpEarned} XP
                    </span>
                  )}
                  {lastCoinsEarned > 0 && (
                    <span className="flex items-center gap-1 text-lg font-bold text-amber-500">
                      <Coins size={20} /> +{lastCoinsEarned} coin{lastCoinsEarned > 1 ? "s" : ""}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button (both modes) */}
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

            {/* Session complete — Practice */}
            {result && isLastProblem && !isQuizMode && (
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
                <p className="mt-1 text-xs text-muted-foreground">
                  {solvedIds.size}/{problemQueue.length} questions solved overall
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Practice Again
                </button>
              </motion.div>
            )}

            {/* Session complete — Quiz */}
            {result && isLastProblem && isQuizMode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/50 dark:bg-amber-950/20"
              >
                <ClipboardList size={32} className="mx-auto mb-2 text-amber-600" />
                <h2 className="text-lg font-bold">Quiz Complete!</h2>
                <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {score.correct} / {score.total}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {score.correct === score.total
                    ? "Perfect score! Amazing work!"
                    : score.correct >= (passingGrade ?? score.total)
                    ? `You passed! (${passingGrade ?? score.total} needed)`
                    : `You need ${(passingGrade ?? score.total) - score.correct} more correct to pass.`}
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary"
                  >
                    Back to Dashboard
                  </button>
                  <button
                    onClick={handleRetakeQuiz}
                    disabled={retaking}
                    className="flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {retaking ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RotateCcw size={14} />
                    )}
                    {retaking ? "Generating..." : "Retake Quiz"}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
