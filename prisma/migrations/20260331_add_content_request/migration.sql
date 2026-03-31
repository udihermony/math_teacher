-- CreateEnum
CREATE TYPE "ContentRequestType" AS ENUM ('PRACTICE', 'LESSON_QUIZ', 'DEEP_DIVE', 'TOPIC_TEST', 'PHASE_TEST');

-- CreateTable
CREATE TABLE "ContentRequest" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "type" "ContentRequestType" NOT NULL,
    "lessonId" TEXT,
    "topicId" TEXT,
    "phase" "Phase",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentRequest_classId_lessonId_type_key" ON "ContentRequest"("classId", "lessonId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRequest_classId_topicId_type_key" ON "ContentRequest"("classId", "topicId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ContentRequest_classId_phase_type_key" ON "ContentRequest"("classId", "phase", "type");

-- CreateIndex
CREATE INDEX "ContentRequest_classId_createdAt_idx" ON "ContentRequest"("classId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContentRequest" ADD CONSTRAINT "ContentRequest_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRequest" ADD CONSTRAINT "ContentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRequest" ADD CONSTRAINT "ContentRequest_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRequest" ADD CONSTRAINT "ContentRequest_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
