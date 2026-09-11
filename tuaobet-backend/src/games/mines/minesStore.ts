import { randomUUID } from 'crypto';
import { minesPositionsFromSeed } from '../../utils/provablyFair';

export type MinesSession = {
  userId: string;
  grid: boolean[];
  revealed: boolean[];
  betAmount: number;
  minesCount: number;
  multiplier: number;
  betId: string;
  gameOver: boolean;
  serverSeed: string;
  serverSeedHash: string;
};

const sessions = new Map<string, MinesSession>();

export function gridFromMinePositions(positions: number[]): boolean[] {
  const grid = Array<boolean>(25).fill(false);
  for (const i of positions) {
    if (i >= 0 && i < 25) grid[i] = true;
  }
  return grid;
}

export function minePositionsFromGrid(grid: boolean[]): number[] {
  return grid.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
}

/** Gera grid a partir do seed (provably fair). */
export function createMinesGridFromSeed(
  serverSeed: string,
  gameId: string,
  minesCount: number
): { grid: boolean[]; minePositions: number[] } {
  const minePositions = minesPositionsFromSeed(serverSeed, gameId, minesCount);
  return { grid: gridFromMinePositions(minePositions), minePositions };
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

export function createSession(session: MinesSession, id: string = randomUUID()): string {
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
