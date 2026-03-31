import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-auth";
import { researchClaude } from "@/modules/ai/claude-client";

/**
 * POST /api/teacher/lessons/[lessonId]/research
 *
 * Uses Claude with web search + extended thinking to research the lesson topic,
 * then generates:
 *   1. Skills — saved to the Skill model under the lesson's topic
 *   2. Learning context — saved to the lesson's sourceContent field
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const session = await requireTeacher();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = await params;
  const body = await request.json().catch(() => ({}));

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      topic: {
        select: {
          id: true,
          name: true,
          phase: true,
          ibSection: true,
          description: true,
        },
      },
    },
  });

  if (!lesson) return Response.json({ error: "Lesson not found" }, { status: 404 });

  const contentStr = typeof lesson.content === "string"
    ? lesson.content
    : JSON.stringify(lesson.content);

  const systemPrompt = `You are an expert IB Mathematics AA HL curriculum specialist. Your task is to research a specific lesson topic and produce two things:

1. **Skills**: A list of specific, measurable skills/competencies a student should master in this lesson. Each skill should be concise (1 short sentence) and testable. Include both procedural skills (e.g., "Solve quadratic equations using the discriminant") and conceptual understanding (e.g., "Explain the relationship between roots and coefficients").

2. **Learning Context**: Rich pedagogical context for this lesson that will help an AI generate better, more targeted practice problems and test questions. This should include:
   - Key concepts and definitions
   - Important formulas and theorems
   - Common student misconceptions and errors
   - Connections to other topics in the IB AA HL syllabus
   - Typical IB exam question styles for this topic
   - Difficulty progression (what makes problems easy vs hard in this area)

OUTPUT FORMAT — return valid JSON:

\`\`\`json
{
  "skills": [
    "Skill description 1",
    "Skill description 2"
  ],
  "learningContext": {
    "keyConcepts": ["concept 1", "concept 2"],
    "formulas": ["formula 1 with LaTeX notation", "formula 2"],
    "commonMisconceptions": ["misconception 1", "misconception 2"],
    "ibExamStyles": ["style 1", "style 2"],
    "connections": ["connection to other topic 1", "connection 2"],
    "difficultyProgression": "Description of what makes problems easy to hard",
    "teachingNotes": "Additional pedagogical notes"
  }
}
\`\`\`

Output ONLY the JSON code block — no additional commentary.`;

  const userMessage = `Research and generate skills and learning context for this lesson:

Topic: ${lesson.topic.name}
${lesson.topic.ibSection ? `IB Section: ${lesson.topic.ibSection}` : ""}
${lesson.topic.description ? `Topic description: ${lesson.topic.description}` : ""}

Lesson: ${lesson.title}
${lesson.description ? `Description: ${lesson.description}` : ""}
${lesson.syllabusRef ? `Syllabus reference: ${lesson.syllabusRef}` : ""}

Current lesson content:
${contentStr.slice(0, 3000)}

Search the web for IB Mathematics AA HL resources, exam papers, and teaching guides related to this topic to ensure accuracy and completeness.`;

  // Return prompt only (for copying to external LLM)
  if (body.promptOnly) {
    return Response.json({
      systemPrompt,
      userMessage,
      fullPrompt: `${systemPrompt}\n\n---\n\n${userMessage}`,
    });
  }

  try {
    const response = await researchClaude({
      userId: session.user.id,
      systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
      maxTokens: 8192,
    });

    // Parse the JSON response
    const jsonMatch = response.content.match(/```json\s*([\s\S]*?)```/) ||
      response.content.match(/\{[\s\S]*"skills"[\s\S]*"learningContext"[\s\S]*\}/);

    if (!jsonMatch) {
      return Response.json({ error: "AI did not return valid JSON" }, { status: 500 });
    }

    const jsonStr = jsonMatch[1] ?? jsonMatch[0];
    const result = JSON.parse(jsonStr) as {
      skills: string[];
      learningContext: Record<string, unknown>;
    };

    // Save skills to the topic (upsert to avoid duplicates)
    let skillCount = 0;
    for (const skillName of result.skills) {
      const slug = skillName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);

      await prisma.skill.upsert({
        where: { slug },
        create: {
          topicId: lesson.topic.id,
          name: skillName,
          slug,
          description: skillName,
        },
        update: {
          name: skillName,
          description: skillName,
        },
      });
      skillCount++;
    }

    // Save learning context to lesson's sourceContent
    await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        sourceContent: result.learningContext as never,
      },
    });

    return Response.json({
      success: true,
      skillsCreated: skillCount,
      learningContext: result.learningContext,
      usage: response.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Research failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
