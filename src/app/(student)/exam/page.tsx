"use client";

import { useState } from "react";
import { Clock, Calculator, Ban, ArrowRight, ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ExamTimer } from "@/modules/exam/components/ExamTimer";
import { PAPER_CONFIGS } from "@/modules/exam/paper-configs";
import { useExamSession } from "@/modules/exam/hooks/useExamSession";
import type { PaperType, IBLevel, ExamQuestion } from "@/modules/exam/types";

export default function ExamPage() {
  const {
    session: examSession,
    questions,
    loading,
    error,
    startExam,
    submitAnswer,
    finishExam,
    currentQuestionIndex,
    setCurrentQuestionIndex,
  } = useExamSession();

  const [paused, setPaused] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Paper selection screen
  if (!examSession) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-2xl font-bold">IB Exam Practice</h1>
        <p className="mb-6 text-muted-foreground">
          Practice under timed conditions with IB-style questions and AI marking.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {PAPER_CONFIGS.map((config) => (
            <Card key={`${config.type}-${config.level}`} className="transition-colors hover:border-primary">
              <h3 className="text-lg font-semibold">{config.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="default">
                  <Clock size={12} className="mr-1" />
                  {config.timeLimitMinutes} min
                </Badge>
                <Badge variant="default">
                  {config.totalMarks} marks
                </Badge>
                <Badge variant={config.calculatorAllowed ? "success" : "warning"}>
                  {config.calculatorAllowed ? (
                    <><Calculator size={12} className="mr-1" /> Calculator</>
                  ) : (
                    <><Ban size={12} className="mr-1" /> No calculator</>
                  )}
                </Badge>
              </div>

              <Button
                className="mt-4 w-full"
                onClick={() => startExam(config.type as PaperType, config.level as IBLevel)}
                disabled={loading}
              >
                {loading ? <Spinner size="sm" /> : "Start Exam"}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Exam in progress
  if (examSession.status === "in_progress") {
    const currentQuestion: ExamQuestion | undefined = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).filter((k) => answers[k]?.trim()).length;

    return (
      <div className="mx-auto max-w-3xl">
        {/* Exam header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">
              {examSession.paperType === "PAPER_1" ? "Paper 1" : "Paper 2"} — {examSession.level}
            </h1>
            <p className="text-xs text-muted-foreground">
              Question {currentQuestionIndex + 1} of {totalQuestions} · {answeredCount} answered
            </p>
          </div>
          <ExamTimer
            totalSeconds={examSession.timeRemainingSeconds}
            paused={paused}
            onTogglePause={() => setPaused(!paused)}
            onTimeUp={() => {
              finishExam();
            }}
          />
        </div>

        {/* Question navigation */}
        <div className="mb-4 flex flex-wrap gap-1">
          {questions.map((q, i) => {
            const hasAnswer = answers[q.id]?.trim();
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(i)}
                className={`flex h-8 w-8 items-center justify-center rounded text-xs font-medium transition ${
                  i === currentQuestionIndex
                    ? "bg-primary text-white"
                    : hasAnswer
                      ? "bg-green-100 text-green-800"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {q.questionNumber}
              </button>
            );
          })}
        </div>

        {/* Current question */}
        {currentQuestion && (
          <Card className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">
                Question {currentQuestion.questionNumber}
              </h2>
              <Badge>{currentQuestion.totalMarks} marks</Badge>
            </div>

            {currentQuestion.parts.map((part) => (
              <div key={part.partLabel} className="mb-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium">({part.partLabel})</span>
                  <span className="text-xs text-muted-foreground">[{part.marks} marks]</span>
                </div>
                <p className="mb-2 text-sm">{part.prompt}</p>
                <textarea
                  className="w-full rounded-md border border-border bg-background p-2 text-sm focus:border-primary focus:outline-none"
                  rows={3}
                  placeholder="Write your answer here..."
                  value={answers[`${currentQuestion.id}-${part.partLabel}`] || ""}
                  onChange={(e) => {
                    const key = `${currentQuestion.id}-${part.partLabel}`;
                    setAnswers((prev) => ({ ...prev, [key]: e.target.value }));
                    submitAnswer(currentQuestion.id, e.target.value, currentQuestion.totalMarks);
                  }}
                />
              </div>
            ))}
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
          >
            <ArrowLeft size={16} className="mr-1" /> Previous
          </Button>

          {currentQuestionIndex < totalQuestions - 1 ? (
            <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
              Next <ArrowRight size={16} className="ml-1" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => setShowConfirmSubmit(true)}
            >
              <Send size={16} className="mr-1" /> Submit Exam
            </Button>
          )}
        </div>

        {/* Submit confirmation */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="mx-4 max-w-sm text-center">
              <h3 className="mb-2 text-lg font-bold">Submit Exam?</h3>
              <p className="mb-1 text-sm text-muted-foreground">
                {answeredCount} of {totalQuestions} questions answered.
              </p>
              {answeredCount < totalQuestions && (
                <p className="mb-3 text-sm text-amber-600">
                  You have {totalQuestions - answeredCount} unanswered question(s).
                </p>
              )}
              <div className="flex justify-center gap-3">
                <Button variant="ghost" onClick={() => setShowConfirmSubmit(false)}>
                  Go Back
                </Button>
                <Button
                  onClick={() => {
                    setShowConfirmSubmit(false);
                    finishExam();
                  }}
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : "Submit"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Exam completed — show results
  if (examSession.status === "completed") {
    const percentage = examSession.totalMarks > 0
      ? Math.round((examSession.earnedMarks / examSession.totalMarks) * 100)
      : 0;

    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">Exam Complete</h1>
          <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <span className="text-3xl font-bold text-primary">{percentage}%</span>
          </div>
          <p className="text-lg">
            {examSession.earnedMarks} / {examSession.totalMarks} marks
          </p>
        </div>

        {/* Per-question results */}
        <h2 className="mb-3 text-lg font-semibold">Question Breakdown</h2>
        <div className="space-y-3">
          {questions.map((q) => {
            const answer = examSession.answers[q.id];
            return (
              <Card key={q.id}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Q{q.questionNumber}: {q.topic}</span>
                  <Badge variant={answer?.marksAwarded === q.totalMarks ? "success" : "default"}>
                    {answer?.marksAwarded ?? 0} / {q.totalMarks}
                  </Badge>
                </div>
                {answer?.feedback && (
                  <p className="mt-2 text-sm text-muted-foreground">{answer.feedback}</p>
                )}
                {answer?.rubricBreakdown && answer.rubricBreakdown.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {answer.rubricBreakdown.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Badge variant={r.awarded === r.maximum ? "success" : "warning"}>
                          {r.criterion}{r.awarded}
                        </Badge>
                        <span className="text-muted-foreground">{r.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="ghost" onClick={() => window.location.reload()}>
            Try Another Paper
          </Button>
          <Button onClick={() => window.location.href = "/ib-prep"}>
            IB Prep Hub
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
