import { randomBytes } from 'crypto';
import type { Server } from 'socket.io';
import {
  plannedFakeBetEvents,
  randInt,
  randomAmount,
  randomUsername,
  simulatorTrafficIntensity,
} from '../simulator/simulatorCommon';

export type SimulatedCrashBet = {
  id: string;
  name: string;
  bet: number;
  /** Preenchido quando o bot “saca” durante RUNNING. */
  cashout?: number;
  payout?: number;
};

export { plannedFakeBetEvents, simulatorTrafficIntensity };

/**
 * Agenda apostas fictícias na janela de apostas (COUNTDOWN); mesma lógica temporal que o Double.
 */
export function scheduleSimulatedCrashBets(
  io: Server,
  opts: {
    roundDurationMs: number;
    isRoundOpen: () => boolean;
    onBet: (bet: SimulatedCrashBet) => void;
  }
): () => void {
  const { roundDurationMs, isRoundOpen, onBet } = opts;
  const n = plannedFakeBetEvents();
  const timeouts: NodeJS.Timeout[] = [];
  const latest = Math.max(250, roundDurationMs - 450);
  let lastName: string | null = null;

  for (let i = 0; i < n; i++) {
    const delay = randInt(120, latest);
    const t = setTimeout(() => {
      if (!isRoundOpen()) return;
      const reuse = lastName && Math.random() < 0.14;
      const name = reuse ? lastName! : randomUsername();
      lastName = name;
      const bet: SimulatedCrashBet = {
        id: `sim:${randomBytes(8).toString('hex')}`,
        name,
        bet: randomAmount(),
      };
      onBet(bet);
      io.emit('crash:new-bet', bet);
    }, delay);
    timeouts.push(t);
  }

  return () => {
    for (const t of timeouts) clearTimeout(t);
  };
}
