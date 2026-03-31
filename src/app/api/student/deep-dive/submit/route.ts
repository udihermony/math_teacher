import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deepDiveBonus } from "@/modules/gamification/coin-calculator";

const schema = z.object({
  lessonId: z.string(),
  answers: z.array(
    z.object({
      questionIndex: z.number(),
      answer: z.union([z.number(), z.string()]), // index for MC, string for free input
    })
  ),
});

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

  const { lessonId, answers } = parsed.data;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      deepDive: true,
      topic: { select: { phase: true } },
    },
  });

  if (!lesson?.deepDive) {
    return Response.json({ error: "No deep dive found" }, { status: 404 });
  }

  const deepDive = lesson.deepDive as { quiz: Record<string, unknown>[] };
  const quiz = deepDive.quiz;
  if (!Array.isArray(quiz) || quiz.length === 0) {
    return Response.json({ error: "No quiz questions" }, { status: 400 });
  }

  // Grade each answer
  const results = quiz.map((q, i) => {
    const studentAnswer = answers.find((a) => a.questionIndex === i);
    if (!studentAnswer) return { correct: false, questionIndex: i };

    const content = q.content as Record<string, unknown> | undefined;
    if (!content) return { correct: false, questionIndex: i };

    if (q.type === "MULTIPLE_CHOICE") {
      const correct = studentAnswer.answer === (content.correctIndex as number);
      return { correct, questionIndex: i };
    } else if (q.type === "FREE_INPUT") {
      const correctAnswer = (content.correctAnswer as string || "").trim().toLowerCase();
      const studentStr = String(studentAnswer.answer).trim().toLowerCase();
      const correct = studentStr === correctAnswer;
      return { correct, questionIndex: i };
    }

    return { correct: false, questionIndex: i };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const totalQuestions = quiz.length;
  const passed = correctCount >= Math.ceil(totalQuestions * 0.5); // 50% to pass

  // Award coins if passed and not already awarded
  let coinsAwarded = 0;
  if (passed) {
    const existing = await prisma.coinTransaction.findFirst({
      where: { userId: session.user.id, reason: "DEEP_DIVE", sourceId: lessonId },
    });

    if (!existing) {
      const phase = lesson.topic?.phase ?? "PHASE_0";
      const bonus = deepDiveBonus(phase);

      await prisma.$transaction([
        prisma.coinTransaction.create({
          data: {
            userId: session.user.id,
            amount: bonus,
            reason: "DEEP_DIVE",
            sourceId: lessonId,
          },
        }),
        prisma.studentProfile.update({
          where: { userId: session.user.id },
          data: { coins: { increment: bonus } },
        }),
      ]);

      coinsAwarded = bonus;
    }
  }

  // Get updated balance
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    select: { coins: true },
  });

  return Response.json({
    results,
    correctCount,
    totalQuestions,
    passed,
    coinsAwarded,
    coinBalance: profile?.coins ?? 0,
  });
}
