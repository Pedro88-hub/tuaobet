import { randomBytes } from 'crypto';
import type { Server } from 'socket.io';
import {
  randInt,
  randomAmount,
  randomUsername,
  simulatorTrafficIntensity,
} from '../simulator/simulatorCommon';

export type SimulatedMinesBet = {
  id: string;
  username: string;
  name: string;
  amount: number;
  minesCount: number;
};

const BUFFER_CAP = 72;

function shuffleDisplay<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomMinesCount(): number {
  const r = Math.random();
  if (r < 0.28) return randInt(1, 4);
  if (r < 0.62) return randInt(3, 8);
  if (r < 0.88) return randInt(5, 14);
  return randInt(8, 22);
}

/**
 * Feed contínuo de “apostas” fictícias no Mines (lista ao vivo, sem efeito em saldo).
 */
export function initMinesLiveFeed(io: Server): void {
  let buffer: SimulatedMinesBet[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastName: string | null = null;

  const disabled = () =>
    process.env.MINES_SIMULATOR_DISABLED === '1' || process.env.MINES_SIMULATOR_DISABLED === 'true';

  const pushBet = () => {
    const reuse = lastName && Math.random() < 0.12;
    const name = reuse ? lastName! : randomUsername();
    lastName = name;
    const bet: SimulatedMinesBet = {
      id: `sim:${randomBytes(8).toString('hex')}`,
      username: name,
      name,
      amount: randomAmount(),
      minesCount: randomMinesCount(),
    };
    buffer = [...buffer.slice(-(BUFFER_CAP - 1)), bet];
    io.emit('mines:new-bet', bet);
  };

  const scheduleNext = () => {
    if (disabled()) return;
    const intensity = simulatorTrafficIntensity();
    const lo = Math.round(520 / (0.4 + intensity * 0.95));
    const hi = Math.round(3800 / (0.35 + intensity * 0.9));
    const delay = randInt(Math.max(380, lo), Math.max(lo + 200, hi));
    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (disabled()) return;
      pushBet();
      scheduleNext();
    }, delay);
  };

  io.on('connection', (socket) => {
    socket.emit('mines:live-bets', shuffleDisplay([...buffer]));
  });

  if (!disabled()) {
    scheduleNext();
  }
}
