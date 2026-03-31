import type { ContentRequestType, Phase } from "@/generated/prisma/client";

export const PHASE_LABELS: Record<Phase, string> = {
  PHASE_0: "Foundations",
  PHASE_1: "Algebra",
  PHASE_2: "Functions",
  PHASE_3: "Sequences & Series",
  PHASE_4: "Trigonometry",
  PHASE_5: "Vectors & Geometry",
  PHASE_6: "Statistics",
  PHASE_7: "Differentiation",
  PHASE_8: "Integration",
  PHASE_9: "HL Topics",
  PHASE_10: "Exam Prep",
};

export function getContentRequestLabel(type: ContentRequestType): string {
  switch (type) {
    case "PRACTICE":
      return "Practice";
    case "LESSON_QUIZ":
      return "Lesson Quiz";
    case "DEEP_DIVE":
      return "Deep Dive";
    case "TOPIC_TEST":
      return "Topic Test";
    case "PHASE_TEST":
      return "Level Test";
  }
}

export function getTeacherContentRequestHref(input: {
  classId: string;
  type: ContentRequestType;
  lessonId?: string | null;
  topicId?: string | null;
  phase?: Phase | null;
}): string {
  if (input.type === "PRACTICE" && input.lessonId) {
    return `/teacher/curriculum/${input.lessonId}`;
  }

  if (input.type === "LESSON_QUIZ" && input.lessonId) {
    return `/teacher/classes/${input.classId}?focus=quest&lessonId=${input.lessonId}`;
  }

  if (input.type === "DEEP_DIVE" && input.lessonId) {
    return `/teacher/curriculum/${input.lessonId}?open=deep-dive`;
  }

  const params = new URLSearchParams();
  params.set("focus", "tests");
  params.set("openTest", "1");
  if (input.type === "TOPIC_TEST" && input.topicId) {
    params.set("scope", "TOPIC");
    params.set("scopeId", input.topicId);
  }
  if (input.type === "PHASE_TEST" && input.phase) {
    params.set("scope", "PHASE");
    params.set("scopeId", input.phase);
  }
  return `/teacher/classes/${input.classId}?${params.toString()}`;
}
