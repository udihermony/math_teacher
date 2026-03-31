import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTeacher } from "@/lib/teacher-auth";
import Anthropic from "@anthropic-ai/sdk";
import { LESSON_GENERATOR_PROMPT } from "@/modules/ai/prompts/lesson-generator";

const schema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileBase64: z.string(),
  phase: z.enum(["PHASE_0", "PHASE_1", "PHASE_2", "PHASE_3", "PHASE_4", "PHASE_5", "PHASE_6", "PHASE_7", "PHASE_8", "PHASE_9", "PHASE_10"]),
  instructions: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await requireTeacher();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const { fileName, fileType, fileBase64, phase, instructions } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI service is not configured. Please contact your administrator." }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey });

  // Build the message content with the file
  const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

  if (fileType.startsWith("image/")) {
    // Send image directly
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: fileType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
        data: fileBase64,
      },
    });
  } else if (fileType === "application/pdf") {
    // Send PDF as document
    content.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: fileBase64,
      },
    });
  } else {
    // For DOCX and other files, decode text if possible
    content.push({
      type: "text",
      text: `[Uploaded file: ${fileName} (${fileType}). The file content has been provided as base64 data. Please analyze it and generate curriculum content.]`,
    });
  }

  content.push({
    type: "text",
    text: `Analyze this uploaded file (${fileName}) and generate a complete lesson suitable for the ${phase} phase of MathQuest. ${
      instructions ? `Additional instructions: ${instructions}` : ""
    }\n\nFollow the exact output format specified in the system prompt.`,
  });

  const systemPrompt = LESSON_GENERATOR_PROMPT + `\n\nYou are analyzing an uploaded file to synthesize curriculum content. Extract key concepts, examples, and problems from the file and structure them into our lesson format.`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content }],
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            );
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "An error occurred";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
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
