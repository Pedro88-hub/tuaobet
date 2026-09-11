-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "previousLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "currentSessionStartedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Bet_userId_createdAt_idx" ON "Bet"("userId", "createdAt");
