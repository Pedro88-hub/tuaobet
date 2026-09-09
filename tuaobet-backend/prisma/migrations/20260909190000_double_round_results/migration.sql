-- CreateTable
CREATE TABLE "DoubleRoundResult" (
    "id" TEXT NOT NULL,
    "resultNumber" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "roundId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoubleRoundResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoubleRoundResult_createdAt_idx" ON "DoubleRoundResult"("createdAt");
