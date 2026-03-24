import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { askClaude } from "@/modules/ai/claude-client";
import { buildExamMarkingPrompt } from "@/modules/ai/prompts/exam-marker";
import { getIBGrade } from "@/modules/exam/types";
import type { ExamAnswer, RubricMark, IBLevel, PaperType } from "@/modules/exam/types";

/** POST /api/exam/finish — submit exam for AI marking. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, answers, questions, paperType, level } = body as {
    sessionId: string;
    answers: Record<string, ExamAnswer>;
    questions?: Array<{
      id: string;
      parts: Array<{ partLabel: string; prompt: string; marks: number; markScheme?: string }>;
    }>;
    paperType?: PaperType;
    level?: IBLevel;
  };

  if (!sessionId || !answers) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Flatten answers into a simple map for the marker
  const answerMap: Record<string, string> = {};
  for (const [key, val] of Object.entries(answers)) {
    answerMap[key] = val.answer || "";
  }

  let markedResults: Record<string, {
    totalAwarded: number;
    maxMarks: number;
    parts: Array<{
      partLabel: string;
      marksAwarded: number;
      maxMarks: number;
      rubricBreakdown: RubricMark[];
      feedback: string;
    }>;
    overallFeedback: string;
  }> = {};

  // Use AI to mark the exam if questions are provided
  if (questions && questions.length > 0) {
    const prompt = buildExamMarkingPrompt({
      level: level || "SL",
      paperType: paperType || "PAPER_1",
      questions,
      answers: answerMap,
    });

    try {
      const response = await askClaude({
        userId: session.user.id,
        systemPrompt: prompt,
        messages: [
          {
            role: "user",
            content: "Mark all questions and provide detailed feedback with IB rubric breakdown.",
          },
        ],
        maxTokens: 4096,
      });

      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.results) {
          for (const result of parsed.results) {
            markedResults[result.questionId] = result;
          }
        }
      }
    } catch {
      // AI marking failed — return ungraded
    }
  }

  // Calculate totals
  let totalEarned = 0;
  let totalMax = 0;
  const markedAnswers: Record<string, ExamAnswer> = {};

  for (const [questionId, answer] of Object.entries(answers)) {
    const marking = markedResults[questionId];
    const marksAwarded = marking?.totalAwarded ?? 0;
    totalEarned += marksAwarded;
    totalMax += answer.maxMarks;

    markedAnswers[questionId] = {
      ...answer,
      marksAwarded,
      feedback: marking?.overallFeedback,
      rubricBreakdown: marking?.parts?.flatMap((p) => p.rubricBreakdown) ?? [],
    };
  }

  const percentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const ibLevel = level || "SL";
  const grade = getIBGrade(percentage, ibLevel);

  return Response.json({
    session: {
      id: sessionId,
      status: "completed",
      completedAt: new Date().toISOString(),
      earnedMarks: totalEarned,
      totalMarks: totalMax,
      answers: markedAnswers,
    },
    results: {
      totalEarned,
      totalMax,
      percentage,
      grade,
      level: ibLevel,
      markedQuestions: markedResults,
    },
  });
}
