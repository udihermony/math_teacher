"use client";

import { useState, useEffect } from "react";
import { Coins, Lock, Unlock, ChevronDown, ChevronRight, Trophy, GraduationCap, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";

interface LessonCoin {
  id: string;
  title: string;
  practiceCoins: number;
  maxPractice: number;
  quizBonus: number;
  maxQuiz: number;
  deepDiveBonus: number;
  maxDeepDive: number;
}

interface TopicData {
  topicId: string;
  topicName: string;
  collected: number;
  redeemable: boolean;
  possible: number;
  testAvailable: boolean;
  testRequested: boolean;
  topicBonus: { earned: number; possible: number };
  testBonus: { earned: number; possible: number };
  lessons: LessonCoin[];
}

interface PhaseData {
  phase: string;
  label: string;
  testPassed: boolean;
  testAvailable: boolean;
  testRequested: boolean;
  testBonus: { earned: number; possible: number };
  perLesson: { practice: number; quiz: number; deepDive: number };
  topics: TopicData[];
}

interface BankData {
  hasClass: boolean;
  class: {
    name: string;
    coinsExchangeable: boolean;
    totalEuros: number | null;
    ibExamBonusEuros: number | null;
  } | null;
  balance: number;
  totalCollected: number;
  totalRedeemable: number;
  totalPossible: number;
  euroRate: number | null;
  euroEarned: number | null;
  euroPossible: number | null;
  phases: PhaseData[];
  finalTest: { unlocked: boolean; completed: boolean; bonus: number };
  ibExamBonus: { euros: number | null };
  recentTransactions: { amount: number; reason: string; createdAt: string }[];
}

export default function BankPage() {
  const [data, setData] = useState<BankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/student/bank")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data?.hasClass) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <Coins size={48} className="mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-xl font-bold">Coin Bank</h1>
        <p className="mt-2 text-muted-foreground">Join a class to start earning coins!</p>
      </div>
    );
  }

  const pct = data.totalPossible > 0
    ? Math.round((data.totalRedeemable / data.totalPossible) * 100)
    : 0;

  function togglePhase(phase: string) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }

  function toggleTopic(topicId: string) {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Coin Bank</h1>

      {/* Header stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
              <Coins size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-xl font-bold">{data.totalCollected}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
              <Unlock size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Redeemable</p>
              <p className="text-xl font-bold">{data.totalRedeemable}</p>
            </div>
          </div>
        </Card>

        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
              <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {data.class?.coinsExchangeable ? "Euro Value" : "Progress"}
              </p>
              <p className="text-xl font-bold">
                {data.euroEarned != null
                  ? `\u20AC${data.euroEarned.toFixed(2)}`
                  : `${pct}%`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Overall progress bar */}
      <Card padding="sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Redeemable: {data.totalRedeemable} / {data.totalPossible} coins
          </span>
          {data.euroEarned != null && data.euroPossible != null && (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {"\u20AC"}{data.euroEarned.toFixed(2)} / {"\u20AC"}{data.euroPossible.toFixed(2)}
            </span>
          )}
        </div>
        <ProgressBar value={data.totalRedeemable} max={data.totalPossible} color="#10b981" />
        {data.euroRate != null && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Rate: 1 coin = {"\u20AC"}{data.euroRate.toFixed(4)}
          </p>
        )}
      </Card>

      {/* Phase breakdown */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Breakdown</h2>

        {data.phases.map((phase) => {
          const phaseCollected = phase.topics.reduce((s, t) => s + t.collected, 0) + phase.testBonus.earned;
          const phasePossible = phase.topics.reduce((s, t) => s + t.possible, 0) + phase.testBonus.possible;
          const isExpanded = expandedPhases.has(phase.phase);

          return (
            <Card key={phase.phase} padding="sm">
              <button
                onClick={() => togglePhase(phase.phase)}
                className="flex w-full items-center gap-3 text-left"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{phase.label}</span>
                    {phase.testPassed && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Level Test Passed
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Coins size={12} className="text-amber-500" />
                    <span>{phaseCollected} / {phasePossible} coins</span>
                    {data.euroRate != null && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ({"\u20AC"}{(phaseCollected * data.euroRate).toFixed(2)})
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    Per lesson: {phase.perLesson.practice} practice · {phase.perLesson.quiz} quiz
                    {phase.perLesson.deepDive > 0 && ` · ${phase.perLesson.deepDive} deep dive`}
                  </p>
                </div>
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  {phase.topics.map((topic) => {
                    const topicExpanded = expandedTopics.has(topic.topicId);
                    return (
                      <div key={topic.topicId}>
                        <button
                          onClick={() => toggleTopic(topic.topicId)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
                        >
                          {topicExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          {topic.redeemable ? (
                            <Unlock size={14} className="text-green-500" />
                          ) : (
                            <Lock size={14} className="text-muted-foreground" />
                          )}
                          <span className={`flex-1 ${!topic.redeemable ? "text-muted-foreground" : ""}`}>
                            {topic.topicName}
                          </span>
                          <span className={`text-xs ${topic.redeemable ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                            {topic.collected} / {topic.possible}
                          </span>
                        </button>

                        {!topic.redeemable && (
                          <p className="ml-10 text-xs text-muted-foreground">
                            {topic.testAvailable
                              ? "Pass the topic test to unlock these coins"
                              : topic.testRequested
                              ? "Topic test requested from your teacher"
                              : "Topic test has not been created yet"}
                          </p>
                        )}

                        {topicExpanded && (
                          <div className="ml-10 mt-1 space-y-1">
                            {topic.lessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between rounded px-2 py-1 text-xs text-muted-foreground"
                              >
                                <span className="truncate">{lesson.title}</span>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span>Practice: {lesson.practiceCoins}/{lesson.maxPractice}</span>
                                  {lesson.maxQuiz > 0 && (
                                    <span>Quiz: {lesson.quizBonus}/{lesson.maxQuiz}</span>
                                  )}
                                  {lesson.maxDeepDive > 0 && (
                                    <span>Deep Dive: {lesson.deepDiveBonus}/{lesson.maxDeepDive}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div className="flex items-center justify-between rounded px-2 py-1 text-xs text-muted-foreground">
                              <span>Topic Completion Bonus</span>
                              <span>{topic.topicBonus.earned}/{topic.topicBonus.possible}</span>
                            </div>
                            <div className="flex items-center justify-between rounded px-2 py-1 text-xs text-muted-foreground">
                              <span>Topic Test Bonus</span>
                              <span>{topic.testBonus.earned}/{topic.testBonus.possible}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Phase test bonus */}
                  <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Trophy size={14} className={phase.testPassed ? "text-amber-500" : "text-muted-foreground"} />
                      <span className={phase.testPassed ? "" : "text-muted-foreground"}>Level Test Bonus</span>
                    </div>
                    <span className={`text-xs ${phase.testPassed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {phase.testBonus.earned} / {phase.testBonus.possible}
                    </span>
                  </div>
                  {!phase.testPassed && !phase.testAvailable && (
                    <p className="px-2 text-xs text-muted-foreground">
                      {phase.testRequested
                        ? "Level test requested from your teacher"
                        : "Level test has not been created yet"}
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Final test */}
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${data.finalTest.completed ? "bg-amber-100 dark:bg-amber-900/30" : "bg-secondary"}`}>
            <Trophy size={20} className={data.finalTest.completed ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"} />
          </div>
          <div className="flex-1">
            <p className="font-medium">Final Quest Test</p>
            <p className="text-xs text-muted-foreground">
              {data.finalTest.completed
                ? "Completed! Bonus earned."
                : data.finalTest.unlocked
                  ? "Unlocked! Take the final test to earn bonus coins."
                  : "Complete all levels to unlock."}
            </p>
          </div>
          <span className={`text-sm font-medium ${data.finalTest.completed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
            {data.finalTest.completed ? data.finalTest.bonus : 0} / {data.finalTest.bonus}
          </span>
        </div>
      </Card>

      {/* IB Exam Bonus */}
      {data.ibExamBonus.euros != null && data.ibExamBonus.euros > 0 && (
        <Card padding="sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <GraduationCap size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium">IB Exam Bonus</p>
              <p className="text-xs text-muted-foreground">
                Potential bonus of {"\u20AC"}{data.ibExamBonus.euros.toFixed(2)} &mdash; awarded by your teacher after the IB exam
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent transactions */}
      {data.recentTransactions.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Recent Activity</h2>
          <Card padding="sm">
            <div className="divide-y divide-border">
              {data.recentTransactions.map((tx, i) => (
                <div key={i} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <div>
                    <span className="text-sm">{tx.reason}</span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    +{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
