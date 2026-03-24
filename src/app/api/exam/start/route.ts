import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { askClaude } from "@/modules/ai/claude-client";
import { buildExamGeneratorPrompt } from "@/modules/ai/prompts/exam-generator";
import { getPaperConfig } from "@/modules/exam/paper-configs";
import type { ExamQuestion } from "@/modules/exam/types";

const schema = z.object({
  paperType: z.enum(["PAPER_1", "PAPER_2"]),
  level: z.enum(["SL", "HL"]),
});

/** POST /api/exam/start — generate an exam paper and start a session. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { paperType, level } = parsed.data;
  const config = getPaperConfig(paperType, level);
  if (!config) {
    return Response.json({ error: "Invalid paper configuration" }, { status: 400 });
  }

  // Generate questions for each section
  const allQuestions: ExamQuestion[] = [];
  let globalQuestionNum = 1;

  for (let sIdx = 0; sIdx < config.sections.length; sIdx++) {
    const section = config.sections[sIdx];

    const prompt = buildExamGeneratorPrompt({
      paperType,
      level,
      sectionIndex: sIdx,
      questionCount: section.questionCount,
      marksPerQuestion: section.marksPerQuestion,
    });

    try {
      const response = await askClaude({
        userId: session.user.id,
        systemPrompt: prompt,
        messages: [
          {
            role: "user",
            content: `Generate ${section.questionCount} ${section.questionType === "extended_response" ? "extended response" : "short answer"} questions for ${section.name}.`,
          },
        ],
        maxTokens: 4096,
      });

      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[1]) as ExamQuestion[];
        for (const q of questions) {
          q.questionNumber = globalQuestionNum++;
          q.section = sIdx;
          q.id = `q${q.questionNumber}`;
          allQuestions.push(q);
        }
      }
    } catch {
      // If AI fails for a section, create placeholder questions
      for (let i = 0; i < section.questionCount; i++) {
        allQuestions.push({
          id: `q${globalQuestionNum}`,
          questionNumber: globalQuestionNum,
          section: sIdx,
          topic: "General",
          totalMarks: section.marksPerQuestion[i],
          parts: [
            {
              partLabel: "a",
              prompt: "Question generation failed. Please try again.",
              marks: section.marksPerQuestion[i],
            },
          ],
        });
        globalQuestionNum++;
      }
    }
  }

  const examSession = {
    id: `exam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    paperType,
    level,
    status: "in_progress" as const,
    startedAt: new Date().toISOString(),
    timeRemainingSeconds: config.timeLimitMinutes * 60,
    totalMarks: config.totalMarks,
    earnedMarks: 0,
    answers: {},
  };

  return Response.json({
    session: examSession,
    questions: allQuestions,
    config: {
      name: config.name,
      calculatorAllowed: config.calculatorAllowed,
      timeLimitMinutes: config.timeLimitMinutes,
      totalMarks: config.totalMarks,
    },
  });
}
