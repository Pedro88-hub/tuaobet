-- CreateTable
CREATE TABLE "BaccaratRound" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "bets" JSONB NOT NULL,
    "outcome" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaccaratRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaccaratRound_userId_requestId_key" ON "BaccaratRound"("userId", "requestId");

-- CreateIndex
CREATE INDEX "BaccaratRound_userId_createdAt_idx" ON "BaccaratRound"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "BaccaratRound" ADD CONSTRAINT "BaccaratRound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
