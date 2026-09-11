import type { Side } from './types.js';
import type { LiveHistoryItem } from './live.js';

export type BeadCell = { winner: Side; key: string } | null;
export type BigRoadCell = { winner: Side; key: string } | null;
export type RoadCounts = { player: number; banker: number; tie: number };

export const BEAD_ROWS = 6;
export const BIG_ROWS = 6;
export const ROAD_LETTER: Record<Side, string> = { player: 'P', banker: 'B', tie: 'T' };

/** History arrives newest-first; roads read oldest → newest. */
export function chronologicalWinners(history: LiveHistoryItem[]): Side[] {
  return [...history].reverse().map((item) => item.winner);
}

export function countWinners(history: LiveHistoryItem[]): RoadCounts {
  return history.reduce(
    (counts, item) => {
      counts[item.winner] += 1;
      return counts;
    },
    { player: 0, banker: 0, tie: 0 },
  );
}

/** Fill column-by-column, 6 rows (standard bead plate). */
export function buildBeadPlate(history: LiveHistoryItem[], maxColumns = 12): BeadCell[][] {
  const winners = chronologicalWinners(history);
  const columns = Math.max(1, Math.ceil(winners.length / BEAD_ROWS) || 1);
  const width = Math.min(maxColumns, columns);
  const grid: BeadCell[][] = Array.from({ length: width }, () => Array.from({ length: BEAD_ROWS }, () => null));

  winners.forEach((winner, index) => {
    const col = Math.floor(index / BEAD_ROWS);
    const row = index % BEAD_ROWS;
    if (col >= maxColumns) return;
    if (!grid[col]) return;
    grid[col][row] = { winner, key: `${col}-${row}-${winner}-${index}` };
  });

  return grid;
}

/**
 * Simplified Big Road: same non-tie winner continues down a column; change starts a new column.
 * Ties occupy the next empty slot in the current column.
 */
export function buildBigRoad(history: LiveHistoryItem[], maxColumns = 16): BigRoadCell[][] {
  const winners = chronologicalWinners(history);
  const columns: BigRoadCell[][] = [];
  let lastNonTie: Side | null = null;

  for (let i = 0; i < winners.length; i += 1) {
    const winner = winners[i];

    if (winner === 'tie') {
      let col = columns[columns.length - 1];
      if (!col) {
        col = Array.from({ length: BIG_ROWS }, () => null);
        columns.push(col);
      }
      const slot = col.findIndex((cell) => cell === null);
      if (slot === -1) {
        const next = Array.from({ length: BIG_ROWS }, () => null) as BigRoadCell[];
        next[0] = { winner: 'tie', key: `tie-${i}` };
        columns.push(next);
      } else {
        col[slot] = { winner: 'tie', key: `tie-${i}` };
      }
      continue;
    }

    const sameStreak = lastNonTie === winner;
    lastNonTie = winner;

    if (!sameStreak || columns.length === 0) {
      const col = Array.from({ length: BIG_ROWS }, () => null) as BigRoadCell[];
      col[0] = { winner, key: `br-${i}` };
      columns.push(col);
      continue;
    }

    const col = columns[columns.length - 1];
    const slot = col.findIndex((cell) => cell === null);
    if (slot === -1) {
      const next = Array.from({ length: BIG_ROWS }, () => null) as BigRoadCell[];
      next[BIG_ROWS - 1] = { winner, key: `br-${i}` };
      columns.push(next);
    } else {
      col[slot] = { winner, key: `br-${i}` };
    }
  }

  if (columns.length === 0) {
    return [Array.from({ length: BIG_ROWS }, () => null)];
  }
  return columns.slice(0, maxColumns);
}
