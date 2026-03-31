import { z } from "zod";
import type { ContentRequestType, Phase } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getContentRequestLabel } from "@/modules/content-requests";

const requestSchema = z.object({
  type: z.enum(["PRACTICE", "LESSON_QUIZ", "DEEP_DIVE", "TOPIC_TEST", "PHASE_TEST"]),
  lessonId: z.string().optional(),
  topicId: z.string().optional(),
  phase: z.enum([
    "PHASE_0",
    "PHASE_1",
    "PHASE_2",
    "PHASE_3",
    "PHASE_4",
    "PHASE_5",
    "PHASE_6",
    "PHASE_7",
    "PHASE_8",
    "PHASE_9",
    "PHASE_10",
  ]).optional(),
});

async function getActiveClassId(userId: string): Promise<string | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { activeClassId: true },
  });

  if (profile?.activeClassId) {
    return profile.activeClassId;
  }

  const membership = await prisma.classMembership.findFirst({
    where: { userId, role: "STUDENT" },
    select: { classId: true },
  });

  return membership?.classId ?? null;
}

async function missingContentExists(input: {
  classId: string;
  type: ContentRequestType;
  lessonId?: string;
  topicId?: string;
  phase?: Phase;
}): Promise<boolean> {
  if (input.type === "DEEP_DIVE" && input.lessonId) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: input.lessonId },
      select: { deepDive: true },
    });
    return !!lesson && !lesson.deepDive;
  }

  if (input.type === "PRACTICE" && input.lessonId) {
    const problem = await prisma.problem.findFirst({
      where: { lessonId: input.lessonId, purpose: "PRACTICE" },
      select: { id: true },
    });
    return !problem;
  }

  if (input.type === "LESSON_QUIZ" && input.lessonId) {
    const assignment = await prisma.classAssignment.findFirst({
      where: { classId: input.classId, lessonId: input.lessonId },
      select: { id: true },
    });
    return !assignment;
  }

  if (input.type === "TOPIC_TEST" && input.topicId) {
    const test = await prisma.test.findFirst({
      where: {
        classId: input.classId,
        scope: "TOPIC",
        scopeId: input.topicId,
        status: { not: "ARCHIVED" },
      },
      select: { id: true },
    });
    return !test;
  }

  if (input.type === "PHASE_TEST" && input.phase) {
    const test = await prisma.test.findFirst({
      where: {
        classId: input.classId,
        scope: "PHASE",
        scopeId: input.phase,
        status: { not: "ARCHIVED" },
      },
      select: { id: true },
    });
    return !test;
  }

  return false;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const userId = session.user.id;
  const classId = await getActiveClassId(userId);
  if (!classId) {
    return Response.json({ error: "No active class" }, { status: 400 });
  }

  const membership = await prisma.classMembership.findUnique({
    where: { classId_userId: { classId, userId } },
    select: { id: true },
  });
  if (!membership) {
    return Response.json({ error: "Not enrolled in active class" }, { status: 403 });
  }

  const { type, lessonId, topicId, phase } = parsed.data;
  const isMissing = await missingContentExists({
    classId,
    type,
    lessonId,
    topicId,
    phase: phase as Phase | undefined,
  });

  if (!isMissing) {
    return Response.json({ error: `${getContentRequestLabel(type)} already exists` }, { status: 409 });
  }

  let contentRequest;

  if ((type === "PRACTICE" || type === "LESSON_QUIZ" || type === "DEEP_DIVE") && lessonId) {
    contentRequest = await prisma.contentRequest.upsert({
      where: { classId_lessonId_type: { classId, lessonId, type } },
      update: { requestedById: userId },
      create: { classId, requestedById: userId, type, lessonId },
    });
  } else if (type === "TOPIC_TEST" && topicId) {
    contentRequest = await prisma.contentRequest.upsert({
      where: { classId_topicId_type: { classId, topicId, type } },
      update: { requestedById: userId },
      create: { classId, requestedById: userId, type, topicId },
    });
  } else if (type === "PHASE_TEST" && phase) {
    contentRequest = await prisma.contentRequest.upsert({
      where: { classId_phase_type: { classId, phase: phase as Phase, type } },
      update: { requestedById: userId },
      create: { classId, requestedById: userId, type, phase: phase as Phase },
    });
  } else {
    return Response.json({ error: "Missing request target" }, { status: 400 });
  }

  return Response.json({ request: contentRequest }, { status: 201 });
}
