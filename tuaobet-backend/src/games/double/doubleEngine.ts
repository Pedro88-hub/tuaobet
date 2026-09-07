import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { UserStatus } from '@prisma/client';
import { creditPayout, debitStake, validateStake } from '../../services/ledger';
import { pushWalletBalance } from '../../socket/pushWalletBalance';
import { doubleResultFromSeed, generateServerSeed, hashServerSeed } from '../../utils/provablyFair';
import {
  scheduleSimulatedDoubleBets,
  type SimulatedDoubleBet,
} from './doubleSimulator';

type Color = 'red' | 'black' | 'white';

type DoubleState = 'WAITING' | 'SPINNING' | 'RESULT';

type DoubleBetRow = {
  betId: string;
  userId: string;
  username: string;
  amount: number;
  color: Color;
};

type HistoryItem = { number: number; color: Color };

let doubleState: DoubleState = 'WAITING';
let history: HistoryItem[] = [];
let roundBets: DoubleBetRow[] = [];
/** Apostas só para lista em tempo real (não entram na liquidação). */
let roundSimulatedBets: SimulatedDoubleBet[] = [];
let cancelSimulatedBets: () => void = () => {};

let doubleRoundId = 0;
/** Countdown visível ao conectar durante WAITING (evita 0 na barra). */
let doubleLiveCountdown = 0;
let doubleCommitPublic: { roundId: number; serverSeedHash: string } | null = null;
let doubleRoundSecret: {
  serverSeed: string;
  roundId: number;
  resultNumber: number;
  color: Color;
} | null = null;

function payoutMultiplier(betColor: Color, resultColor: Color): number {
  if (betColor !== resultColor) return 0;
  if (resultColor === 'white') return 14;
  return 2;
}

function shuffleDisplay<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function displayBetsForClients() {
  const real = roundBets.map((b) => ({
    id: b.betId,
    username: b.username,
    name: b.username,
    amount: b.amount,
    color: b.color,
  }));
  return [...real, ...roundSimulatedBets];
}

function emitDoubleSnapshot(socket: Socket) {
  socket.emit('double:history', history);
  const midRoundResult =
    (doubleState === 'SPINNING' || doubleState === 'RESULT') && doubleRoundSecret
      ? {
          resultNumber: doubleRoundSecret.resultNumber,
          color: doubleRoundSecret.color,
        }
      : {};
  socket.emit('double:state', {
    state: doubleState,
    countdown: doubleState === 'WAITING' ? doubleLiveCountdown : 0,
    roundId: doubleRoundId,
    serverSeedHash: doubleCommitPublic?.serverSeedHash,
    ...midRoundResult,
  });
  socket.emit('double:bets', shuffleDisplay(displayBetsForClients()));
  if (doubleCommitPublic) {
    socket.emit('double:commit', doubleCommitPublic);
  }
}

export const initDoubleGame = (io: Server) => {
  const doubleLoop = () => {
    doubleState = 'WAITING';
    roundBets = [];
    roundSimulatedBets = [];
    cancelSimulatedBets();
    cancelSimulatedBets = () => {};
    doubleRoundId += 1;

    const thisRoundId = doubleRoundId;

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const derived = doubleResultFromSeed(serverSeed, doubleRoundId);
    const color = derived.color as Color;

    doubleCommitPublic = { roundId: doubleRoundId, serverSeedHash };
    doubleRoundSecret = {
      serverSeed,
      roundId: doubleRoundId,
      resultNumber: derived.resultNumber,
      color,
    };

    let countdown = 12;
    doubleLiveCountdown = countdown;

    io.emit('double:commit', doubleCommitPublic);
    io.emit('double:state', {
      state: 'WAITING',
      countdown,
      roundId: doubleRoundId,
      serverSeedHash,
    });
    io.emit('double:bets', []);

    if (process.env.DOUBLE_SIMULATOR_DISABLED !== '1' && process.env.DOUBLE_SIMULATOR_DISABLED !== 'true') {
      cancelSimulatedBets = scheduleSimulatedDoubleBets(io, {
        roundDurationMs: countdown * 1000,
        isRoundOpen: () => doubleState === 'WAITING' && doubleRoundId === thisRoundId,
        onBet: (bet) => {
          roundSimulatedBets.push(bet);
        },
      });
    }

    const timer = setInterval(() => {
      countdown -= 1;
      doubleLiveCountdown = Math.max(0, countdown);
      io.emit('double:countdown', countdown);

      if (countdown <= 0) {
        clearInterval(timer);
        spinRoulette(io);
      }
    }, 1000);
  };

  const spinRoulette = (io: Server) => {
    const sec = doubleRoundSecret;
    if (!sec) return;

    cancelSimulatedBets();
    cancelSimulatedBets = () => {};

    doubleLiveCountdown = 0;
    doubleState = 'SPINNING';
    const { resultNumber, color } = sec;

    io.emit('double:state', {
      state: 'SPINNING',
      countdown: 0,
      roundId: doubleRoundId,
      serverSeedHash: doubleCommitPublic?.serverSeedHash,
      resultNumber,
      color,
    });
    io.emit('double:spin', { resultNumber, color });

    setTimeout(() => {
      void settleRound(io, resultNumber, color);
    }, 4000);
  };

  const settleRound = async (io: Server, resultNumber: number, color: Color) => {
    doubleState = 'RESULT';

    const winners: { id: string; username: string; amount: number; color: Color; winAmount: number }[] =
      [];

    for (const b of roundBets) {
      const mult = payoutMultiplier(b.color, color);
      const won = mult > 0;
      const payout = won ? Math.round(b.amount * mult * 100) / 100 : 0;

      try {
        if (won) {
          await prisma.$transaction(async (tx) => {
            await creditPayout(b.userId, payout, `Double — vitória ${mult}x`, tx);
            await tx.bet.update({
              where: { id: b.betId },
              data: {
                result: 'win',
                multiplier: mult,
                payout,
              },
            });
          });
          winners.push({
            id: b.userId,
            username: b.username,
            amount: b.amount,
            color: b.color,
            winAmount: payout,
          });
          pushWalletBalance(b.userId);
        } else {
          await prisma.bet.update({
            where: { id: b.betId },
            data: {
              result: 'loss',
              multiplier: mult || null,
              payout: 0,
            },
          });
        }
      } catch {
        /* ignore single row failure */
      }
    }

    history.unshift({ number: resultNumber, color });
    if (history.length > 15) history.pop();

    const pub = doubleCommitPublic;
    const sec = doubleRoundSecret;

    io.emit('double:state', {
      state: 'RESULT',
      countdown: 0,
      roundId: doubleRoundId,
      serverSeedHash: pub?.serverSeedHash,
      resultNumber,
      color,
    });
    io.emit('double:result', {
      resultNumber,
      color,
      history,
      winners,
      roundId: doubleRoundId,
      serverSeed: sec?.roundId === doubleRoundId ? sec.serverSeed : undefined,
      serverSeedHash: pub?.roundId === doubleRoundId ? pub.serverSeedHash : undefined,
    });

    setTimeout(() => doubleLoop(), 3000);
  };

  io.on('connection', (socket) => {
    emitDoubleSnapshot(socket);
    socket.on('double:sync', () => emitDoubleSnapshot(socket));

    socket.on('double:bet', async (data: { amount?: number; color?: Color }) => {
      const userId = socket.data.userId as string | undefined;
      if (!userId) {
        socket.emit('double:error', { code: 'AUTH' });
        return;
      }
      if (doubleState !== 'WAITING') {
        socket.emit('double:error', { code: 'CLOSED' });
        return;
      }

      const amount = Number(data?.amount);
      const betColor = data?.color;
      if (!betColor || !['red', 'black', 'white'].includes(betColor)) {
        socket.emit('double:error', { code: 'INVALID' });
        return;
      }

      const stake = validateStake(amount);
      if (!stake.ok) {
        socket.emit('double:error', { code: stake.code });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, balance: true, status: true },
      });
      if (!user || user.balance < amount) {
        socket.emit('double:error', { code: 'INSUFFICIENT_BALANCE' });
        return;
      }
      if (user.status !== UserStatus.ACTIVE) {
        socket.emit('double:error', { code: 'ACCOUNT_BLOCKED' });
        return;
      }

      try {
        const betRow = await prisma.$transaction(async (tx) => {
          await debitStake(userId, amount, 'Double — aposta', tx);
          return tx.bet.create({
            data: {
              userId,
              game: 'double',
              amount,
              result: 'pending',
              multiplier: null,
              payout: null,
            },
          });
        });

        const row: DoubleBetRow = {
          betId: betRow.id,
          userId,
          username: user.username,
          amount,
          color: betColor,
        };
        roundBets.push(row);

        const payload = {
          id: betRow.id,
          username: user.username,
          name: user.username,
          amount,
          color: betColor,
        };
        io.emit('double:new-bet', payload);
        pushWalletBalance(userId);
        socket.emit('double:bet-accepted', payload);
      } catch {
        socket.emit('double:error', { code: 'INSUFFICIENT_BALANCE' });
      }
    });

    socket.on('double:cancel', async () => {
      const userId = socket.data.userId as string | undefined;
      if (!userId) {
        socket.emit('double:error', { code: 'AUTH' });
        return;
      }
      if (doubleState !== 'WAITING') {
        socket.emit('double:error', { code: 'CLOSED' });
        return;
      }

      const mine = roundBets.filter((b) => b.userId === userId);
      if (mine.length === 0) {
        socket.emit('double:error', { code: 'NO_BET' });
        return;
      }

      const refundTotal =
        Math.round(mine.reduce((sum, b) => sum + b.amount, 0) * 100) / 100;
      const betIds = mine.map((b) => b.betId);

      // Remover da ronda já (síncrono) para a liquidação não incluir estas apostas
      roundBets = roundBets.filter((b) => b.userId !== userId);

      try {
        if (doubleState !== 'WAITING') {
          roundBets.push(...mine);
          socket.emit('double:error', { code: 'CLOSED' });
          return;
        }

        await prisma.$transaction(async (tx) => {
          await creditPayout(userId, refundTotal, 'Double — cancelamento', tx);
          await tx.bet.updateMany({
            where: { id: { in: betIds }, result: 'pending' },
            data: {
              result: 'cancelled',
              payout: 0,
              multiplier: null,
            },
          });
        });

        io.emit('double:bets', shuffleDisplay(displayBetsForClients()));
        pushWalletBalance(userId);
        socket.emit('double:bet-cancelled', { refunded: refundTotal });
      } catch {
        if (doubleState === 'WAITING') {
          roundBets.push(...mine);
        }
        socket.emit('double:error', { code: 'INVALID' });
      }
    });
  });

  doubleLoop();
};
