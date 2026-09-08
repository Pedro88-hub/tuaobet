-- CreateTable
CREATE TABLE "CrashRoundResult" (
    "id" TEXT NOT NULL,
    "crashPoint" DOUBLE PRECISION NOT NULL,
    "roundId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrashRoundResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrashRoundResult_createdAt_idx" ON "CrashRoundResult"("createdAt");
