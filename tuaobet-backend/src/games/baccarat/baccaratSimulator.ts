import { randomBytes } from 'crypto';
import type { Server } from 'socket.io';
import type { Side } from './baccaratMath';
import {
  plannedFakeBetEvents,
  randInt,
  randomAmount,
} from '../simulator/simulatorCommon';
import type { SimulatedChip } from './baccaratLive';

function randomSide(): Side {
  const roll = Math.random();
  if (roll < 0.1) return 'tie';
  return roll < 0.55 ? 'player' : 'banker';
}

export function scheduleSimulatedBaccaratBets(
  io: Server,
  opts: {
    roundDurationMs: number;
    isRoundOpen: () => boolean;
    onBet: (bet: SimulatedChip) => void;
    emitTotals: () => void;
  },
): () => void {
  const { roundDurationMs, isRoundOpen, onBet, emitTotals } = opts;
  const n = plannedFakeBetEvents();
  const timeouts: NodeJS.Timeout[] = [];
  const latest = Math.max(250, roundDurationMs - 450);

  for (let i = 0; i < n; i++) {
    const delay = randInt(120, latest);
    const timer = setTimeout(() => {
      if (!isRoundOpen()) return;
      const bet: SimulatedChip = {
        id: `sim:${randomBytes(8).toString('hex')}`,
        side: randomSide(),
        amount: randomAmount(),
      };
      onBet(bet);
      emitTotals();
    }, delay);
    timeouts.push(timer);
  }

  return () => {
    for (const timer of timeouts) clearTimeout(timer);
  };
}
