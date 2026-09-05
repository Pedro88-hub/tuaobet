-- CreateTable
CREATE TABLE "SportFixture" (
    "id" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "queryDate" TEXT NOT NULL,
    "utcDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "homeTeamName" TEXT NOT NULL,
    "awayTeamName" TEXT NOT NULL,
    "homeTeamExternalId" INTEGER,
    "awayTeamExternalId" INTEGER,
    "competitionCode" TEXT,
    "competitionName" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "seasonYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportFixture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SportFixture_externalId_key" ON "SportFixture"("externalId");

-- CreateIndex
CREATE INDEX "SportFixture_utcDate_idx" ON "SportFixture"("utcDate");

-- CreateIndex
CREATE INDEX "SportFixture_queryDate_idx" ON "SportFixture"("queryDate");

-- AlterTable
ALTER TABLE "Bet" ADD COLUMN "sportFixtureId" TEXT;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_sportFixtureId_fkey" FOREIGN KEY ("sportFixtureId") REFERENCES "SportFixture"("id") ON DELETE SET NULL ON UPDATE CASCADE;
