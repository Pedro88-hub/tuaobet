import { randomBytes } from 'crypto';
import type { Server } from 'socket.io';
import {
  plannedFakeBetEvents,
  randInt,
  randomAmount,
  randomUsername,
  simulatorTrafficIntensity,
} from '../simulator/simulatorCommon';

type Color = 'red' | 'black' | 'white';

export type SimulatedDoubleBet = {
  id: string;
  username: string;
  name: string;
  amount: number;
  color: Color;
};

export { plannedFakeBetEvents, simulatorTrafficIntensity };

function randomColor(): Color {
  const r = Math.random();
  if (r < 0.43) return 'red';
  if (r < 0.86) return 'black';
  return 'white';
}

/**
 * Agenda apostas fictícias ao longo da janela de apostas; chama `onBet` e emite `double:new-bet`.
 * Devolve função para cancelar timers pendentes (ex.: ao fechar a ronda).
 */
export function scheduleSimulatedDoubleBets(
  io: Server,
  opts: {
    roundDurationMs: number;
    isRoundOpen: () => boolean;
    onBet: (bet: SimulatedDoubleBet) => void;
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
      const bet: SimulatedDoubleBet = {
        id: `sim:${randomBytes(8).toString('hex')}`,
        username: name,
        name,
        amount: randomAmount(),
        color: randomColor(),
      };
      onBet(bet);
      io.emit('double:new-bet', bet);
    }, delay);
    timeouts.push(t);
  }

  return () => {
    for (const t of timeouts) clearTimeout(t);
  };
}
