export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function sumWonAmount(
  bets: ReadonlyArray<{ amount: number; payout: number | null }>
): number {
  let total = 0;
  for (const bet of bets) {
    if (bet.payout == null) continue;
    total += Math.max(0, bet.payout - bet.amount);
  }
  return round2(total);
}

export function sumLostAmount(bets: ReadonlyArray<{ amount: number }>): number {
  let total = 0;
  for (const bet of bets) {
    total += bet.amount;
  }
  return round2(total);
}
