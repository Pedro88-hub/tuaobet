-- Index for public recent-wins feed
CREATE INDEX "Bet_result_createdAt_idx" ON "Bet"("result", "createdAt");
