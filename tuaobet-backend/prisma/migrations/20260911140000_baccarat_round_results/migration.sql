-- CreateTable
CREATE TABLE "BaccaratRoundResult" (
    "id" TEXT NOT NULL,
    "roundId" INTEGER,
    "winner" TEXT NOT NULL,
    "playerTotal" INTEGER NOT NULL,
    "bankerTotal" INTEGER NOT NULL,
    "outcome" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaccaratRoundResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BaccaratRoundResult_createdAt_idx" ON "BaccaratRoundResult"("createdAt");
