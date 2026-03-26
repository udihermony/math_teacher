import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { askClaude } from "../claude-client";
import { buildExplanationPrompt } from "../prompts/explanation-generator";
import type { ExplanationBlock } from "../types";

// ── Tool Definitions ────────────────────────────────────

export const TUTOR_TOOLS: Anthropic.Tool[] = [
  {
    name: "lookup_curriculum",
    description:
      "Look up curriculum information: lessons, skills, prerequisites, or topic details. Use this to find related content, check prerequisites, or recommend lessons to the student.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query for curriculum content (e.g., 'fractions', 'quadratic equations')",
        },
        skillId: {
          type: "string",
          description: "Specific skill ID to look up prerequisites for",
        },
        lessonId: {
          type: "string",
          description: "Specific lesson ID to get details for",
        },
      },
      required: [],
    },
  },
  {
    name: "generate_explanation",
    description:
      "Generate a detailed, structured explanation with steps, LaTeX formulas, and hints. Use this when a student needs a thorough walkthrough of a concept or problem — not for quick clarifications.",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "The mathematical topic or concept to explain",
        },
        problemContext: {
          type: "string",
          description: "The specific problem or question context, if any",
        },
        style: {
          type: "string",
          enum: ["step_by_step", "visual", "analogy"],
          description: "The explanation style to use",
        },
        targetAge: {
          type: "number",
          description: "Target age group (5-18) to adjust complexity",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "request_animation",
    description:
      "Request a mathematical animation to visually explain a concept. Use this for spatial, dynamic, or geometric concepts where a visual would significantly help understanding.",
    input_schema: {
      type: "object" as const,
      properties: {
        concept: {
          type: "string",
          description: "The mathematical concept to animate (e.g., 'fraction addition', 'graph transformation')",
        },
        description: {
          type: "string",
          description: "Detailed description of what the animation should show",
        },
      },
      required: ["concept", "description"],
    },
  },
];

// ── Tool Executors ──────────────────────────────────────

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  switch (toolName) {
    case "lookup_curriculum":
      return lookupCurriculum(input);
    case "generate_explanation":
      return generateExplanation(input, userId);
    case "request_animation":
      return requestAnimation(input);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

async function lookupCurriculum(
  input: Record<string, unknown>
): Promise<string> {
  const { query, skillId, lessonId } = input as {
    query?: string;
    skillId?: string;
    lessonId?: string;
  };

  if (lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: { select: { name: true, phase: true } },
        problems: {
          select: { type: true, difficulty: true },
          take: 5,
        },
      },
    });
    if (!lesson) return JSON.stringify({ error: "Lesson not found" });
    return JSON.stringify({
      title: lesson.title,
      topic: lesson.topic.name,
      phase: lesson.topic.phase,
      description: lesson.description,
      problemCount: lesson.problems.length,
      difficulties: lesson.problems.map((p) => p.difficulty),
    });
  }

  if (skillId) {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        prerequisites: { select: { name: true, slug: true } },
        topic: { select: { name: true } },
      },
    });
    if (!skill) return JSON.stringify({ error: "Skill not found" });
    return JSON.stringify({
      name: skill.name,
      topic: skill.topic.name,
      description: skill.description,
      prerequisites: skill.prerequisites.map((p) => p.name),
    });
  }

  if (query) {
    const lessons = await prisma.lesson.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        topic: { select: { name: true, phase: true } },
      },
      take: 5,
    });

    const skills = await prisma.skill.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        prerequisites: { select: { name: true } },
      },
      take: 5,
    });

    return JSON.stringify({
      lessons: lessons.map((l) => ({
        id: l.id,
        title: l.title,
        topic: l.topic.name,
        phase: l.topic.phase,
      })),
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        prerequisites: s.prerequisites.map((p) => p.name),
      })),
    });
  }

  return JSON.stringify({ error: "Provide query, skillId, or lessonId" });
}

async function generateExplanation(
  input: Record<string, unknown>,
  userId: string
): Promise<string> {
  const { topic, problemContext, style, targetAge } = input as {
    topic: string;
    problemContext?: string;
    style?: string;
    targetAge?: number;
  };

  const prompt = buildExplanationPrompt({
    topic,
    problemContext,
    style: style ?? "step_by_step",
    targetAge: targetAge ?? 12,
  });

  const response = await askClaude({
    userId,
    systemPrompt: prompt,
    messages: [
      {
        role: "user",
        content: `Generate a structured explanation for: ${topic}${problemContext ? `\n\nProblem context: ${problemContext}` : ""}`,
      },
    ],
    maxTokens: 2048,
  });

  // Parse the structured response
  let blocks: ExplanationBlock[];
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.content.match(/```json\s*([\s\S]*?)```/);
    blocks = jsonMatch ? JSON.parse(jsonMatch[1]) : [{ type: "text", data: response.content }];
  } catch {
    blocks = [{ type: "text", data: response.content }];
  }

  // Save explanation to DB
  const explanation = await prisma.explanation.create({
    data: {
      title: topic,
      content: JSON.parse(JSON.stringify(blocks)),
    },
  });

  return JSON.stringify({
    explanationId: explanation.id,
    title: topic,
    blockCount: blocks.length,
  });
}

async function requestAnimation(
  input: Record<string, unknown>
): Promise<string> {
  const { concept, description } = input as {
    concept: string;
    description: string;
  };

  // Search pre-generated animation library
  const { findAnimation } = await import("./animation-library");
  const match = findAnimation(concept);

  if (match) {
    return JSON.stringify({
      status: "ready",
      concept,
      animationUrl: match.url,
      title: match.title,
      description: match.description,
    });
  }

  // No pre-generated animation available
  // In the future, this could queue an on-demand generation job
  return JSON.stringify({
    status: "not_available",
    concept,
    requestedDescription: description,
    message: "No pre-generated animation available for this concept yet. Use the explanation to help the student visualize it instead.",
  });
}
