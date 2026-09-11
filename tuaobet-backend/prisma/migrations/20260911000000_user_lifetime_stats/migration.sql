-- AlterTable
ALTER TABLE "User" ADD COLUMN "totalWagered" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "totalWon" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "totalLost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill lifetime stats from settled bets
UPDATE "User" u
SET
  "totalWagered" = COALESCE(s.wagered, 0),
  "totalWon" = COALESCE(s.won, 0),
  "totalLost" = COALESCE(s.lost, 0),
  "xp" = CASE
    WHEN u."xp" = 0 THEN FLOOR(COALESCE(s.wagered, 0))::INTEGER
    ELSE u."xp"
  END
FROM (
  SELECT
    b."userId",
    SUM(CASE WHEN b."result" IN ('win', 'loss') THEN b."amount" ELSE 0 END) AS wagered,
    SUM(
      CASE
        WHEN b."result" = 'win' AND b."payout" IS NOT NULL
          THEN GREATEST(0, b."payout" - b."amount")
        ELSE 0
      END
    ) AS won,
    SUM(CASE WHEN b."result" = 'loss' THEN b."amount" ELSE 0 END) AS lost
  FROM "Bet" b
  GROUP BY b."userId"
) s
WHERE u."id" = s."userId";
