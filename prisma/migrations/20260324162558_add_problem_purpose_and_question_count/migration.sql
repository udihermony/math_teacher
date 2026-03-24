-- CreateEnum
CREATE TYPE "ProblemPurpose" AS ENUM ('PRACTICE', 'ASSIGNMENT');

-- AlterTable
ALTER TABLE "ClassAssignment" ADD COLUMN     "questionCount" INTEGER;

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "purpose" "ProblemPurpose" NOT NULL DEFAULT 'PRACTICE';
