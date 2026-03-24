-- CreateEnum
CREATE TYPE "CoinReason" AS ENUM ('CORRECT_ANSWER', 'ASSIGNMENT_COMPLETE', 'TOPIC_COMPLETE');

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "coins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "CoinReason" NOT NULL,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CoinTransaction" ADD CONSTRAINT "CoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
