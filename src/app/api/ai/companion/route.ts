import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runTutorAgent } from "@/modules/ai/tutor-agent";

const chatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
  currentProblemId: z.string().optional(),
  lessonId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { message, conversationId, currentProblemId, lessonId } = parsed.data;
  const userId = session.user.id;

  // Find or create conversation
  let convo;
  if (conversationId) {
    convo = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });
  }

  if (!convo && lessonId) {
    convo = await prisma.conversation.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
  }

  if (!convo) {
    let topicId: string | undefined;
    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: { topicId: true },
      });
      topicId = lesson?.topicId;
    }

    convo = await prisma.conversation.create({
      data: {
        userId,
        lessonId: lessonId ?? null,
        topicId: topicId ?? null,
      },
    });
  }

  const convoId = convo.id;

  // Run the tutor agent
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await runTutorAgent({
          userId,
          conversationId: convoId,
          userMessage: message,
          currentProblemId,
        });

        // Stream text chunks
        for await (const chunk of result.stream) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
        }

        // Send side effects (explanations, animations)
        for (const effect of result.sideEffects) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(effect)}\n\n`)
          );
        }

        // Send conversation ID
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ conversationId: convoId })}\n\n`
          )
        );

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const errMessage =
          error instanceof Error ? error.message : "An error occurred";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: errMessage })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
