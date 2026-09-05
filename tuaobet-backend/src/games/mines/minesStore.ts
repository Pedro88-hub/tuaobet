import { randomInt } from 'crypto';
import { randomUUID } from 'crypto';

export type MinesSession = {
  userId: string;
  grid: boolean[];
  revealed: boolean[];
  betAmount: number;
  minesCount: number;
  multiplier: number;
  betId: string;
  gameOver: boolean;
};

const sessions = new Map<string, MinesSession>();

export function createMinesGrid(minesCount: number): boolean[] {
  const grid = Array<boolean>(25).fill(false);
  const positions = new Set<number>();
  while (positions.size < minesCount) {
    positions.add(randomInt(0, 25));
  }
  positions.forEach((i) => {
    grid[i] = true;
  });
  return grid;
}

export function nextMinesMultiplier(
  current: number,
  revealedSafeCount: number,
  minesCount: number
): number {
  const totalCells = 25;
  const remainingCells = totalCells - revealedSafeCount;
  const remainingSafe = totalCells - minesCount - revealedSafeCount;
  if (remainingSafe <= 0) return current;
  return current * (remainingCells / remainingSafe);
}

export function createSession(session: MinesSession): string {
  const id = randomUUID();
  sessions.set(id, session);
  return id;
}

export function getSession(gameId: string, userId: string): MinesSession | null {
  const s = sessions.get(gameId);
  if (!s || s.userId !== userId) return null;
  return s;
}

export function deleteSession(gameId: string): void {
  sessions.delete(gameId);
}
