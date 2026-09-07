import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { UserStatus } from '@prisma/client';
import { creditPayout, debitStake, validateStake } from '../../services/ledger';
import { pushWalletBalance } from '../../socket/pushWalletBalance';
import {
  crashPointFromSeed,
  generateServerSeed,
  hashServerSeed,
} from '../../utils/provablyFair';
import {
  scheduleSimulatedCrashBets,
  type SimulatedCrashBet,
} from './crashSimulator';
import { randInt } from '../simulator/simulatorCommon';

/** Quantidade máxima de rondas guardadas em memória (histórico no cliente / modal paginado). */
const CRASH_HISTORY_MAX = 100;

type GameState = 'IDLE' | 'COUNTDOWN' | 'RUNNING' | 'CRASHED';

type LeaderRow = {
  id: string;
  name: string;
  bet: number;
  /** Multiplicador no momento do cashout. */
  cashout?: number;
  /** Valor pago no cashout (R$). */
  payout?: number;
  /** Após crash: ficou sem sacar. */
  busted?: boolean;
};

type CrashRoundBet = {
  userId: string;
  username: string;
  betId: string;
  amount: number;
  roundId: number;
  cashedOut: boolean;
};

let gameState: GameState = 'IDLE';
let multiplier = 1.0;
let crashPoint = 0;
let crashHistory: number[] = [];
/** Valor enviado em `crash:state` ao conectar (evita countdown 0 durante COUNTDOWN). */
let crashLiveCountdown = 0;

let roundCounter = 0;
let bettingRoundId = 0;
let runningRoundId = 0;
/** Ponto de crash da rodada atual (definido no commit, antes da subida). */
let roundCrashPoint = 1.0;

let crashFairnessPublic: { roundId: number; serverSeedHash: string } | null = null;
let crashRoundSecret: { serverSeed: string; roundId: number } | null = null;

const betsThisRound = new Map<string, CrashRoundBet>();
const leaderboard = new Map<string, LeaderRow>();
/** Apostas só para lista em tempo real (não entram na liquidação). */
let roundSimulatedBets: SimulatedCrashBet[] = [];
let cancelSimulatedBets: () => void = () => {};
let cancelFakeCrashCashouts: () => void = () => {};

function displayLeaderboardForClients(): LeaderRow[] {
  const real = Array.from(leaderboard.values());
  const sim: LeaderRow[] = roundSimulatedBets.map((s) => ({
    id: s.id,
    name: s.name,
    bet: s.bet,
    ...(s.cashout != null ? { cashout: s.cashout, payout: s.payout } : {}),
    ...(gameState === 'CRASHED' && s.cashout == null ? { busted: true as const } : {}),
  }));
  return [...real, ...sim];
}

function broadcastBets(io: Server) {
  io.emit('crash:bets', displayLeaderboardForClients());
}

function emitCrashSnapshot(socket: Socket) {
  socket.emit('crash:history', crashHistory);
  const lastMultiplier =
    gameState === 'CRASHED' && crashPoint > 0 ? crashPoint : multiplier;
  socket.emit('crash:state', {
    state: gameState,
    countdown: gameState === 'COUNTDOWN' ? crashLiveCountdown : 0,
    lastMultiplier,
    roundId: bettingRoundId,
  });
  socket.emit('crash:bets', displayLeaderboardForClients());
  if (crashFairnessPublic) {
    socket.emit('crash:commit', crashFairnessPublic);
  }
}

export const initCrashGame = (io: Server) => {
  const gameLoop = () => {
    gameState = 'COUNTDOWN';
    roundCounter += 1;
    bettingRoundId = roundCounter;
    const thisRoundId = bettingRoundId;
    betsThisRound.clear();
    leaderboard.clear();
    roundSimulatedBets = [];
    cancelSimulatedBets();
    cancelSimulatedBets = () => {};
    cancelFakeCrashCashouts();
    cancelFakeCrashCashouts = () => {};
    broadcastBets(io);

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    roundCrashPoint = crashPointFromSeed(serverSeed, bettingRoundId);
    crashFairnessPublic = { roundId: bettingRoundId, serverSeedHash };
    crashRoundSecret = { serverSeed, roundId: bettingRoundId };

    io.emit('crash:commit', crashFairnessPublic);

    let countdown = 6;
    crashLiveCountdown = countdown;
    io.emit('crash:state', { state: 'COUNTDOWN', countdown, roundId: bettingRoundId });

    if (process.env.CRASH_SIMULATOR_DISABLED !== '1' && process.env.CRASH_SIMULATOR_DISABLED !== 'true') {
      cancelSimulatedBets = scheduleSimulatedCrashBets(io, {
        roundDurationMs: countdown * 1000,
        isRoundOpen: () => gameState === 'COUNTDOWN' && bettingRoundId === thisRoundId,
        onBet: (bet) => {
          roundSimulatedBets.push(bet);
        },
      });
    }

    const countInterval = setInterval(() => {
      countdown -= 1;
      crashLiveCountdown = Math.max(0, countdown);
      io.emit('crash:countdown', countdown);

      if (countdown <= 0) {
        clearInterval(countInterval);
        startGame(io);
      }
    }, 1000);
  };

  const startGame = (io: Server) => {
    cancelSimulatedBets();
    cancelSimulatedBets = () => {};
    cancelFakeCrashCashouts();
    cancelFakeCrashCashouts = () => {};

    crashLiveCountdown = 0;
    gameState = 'RUNNING';
    runningRoundId = bettingRoundId;
    const thisRunningRoundId = runningRoundId;
    multiplier = 1.0;
    crashPoint = roundCrashPoint;

    io.emit('crash:state', {
      state: 'RUNNING',
      countdown: 0,
      lastMultiplier: 1,
      roundId: runningRoundId,
    });

    const startTime = Date.now();

    /** ~82% dos bots tentam sacar antes do crash; timing aleatório abaixo do ponto de crash. */
    const simDisabled =
      process.env.CRASH_SIMULATOR_DISABLED === '1' || process.env.CRASH_SIMULATOR_DISABLED === 'true';
    const fakeCashoutTimeouts: NodeJS.Timeout[] = [];
    if (!simDisabled && roundSimulatedBets.length > 0 && crashPoint > 1.001) {
      const tCrashSec = Math.log(crashPoint) / 0.06;
      const maxDelayMs = Math.max(350, Math.floor(tCrashSec * 1000 * 0.88));
      for (const s of roundSimulatedBets) {
        if (Math.random() > 0.82) continue;
        const delayMs = randInt(180, maxDelayMs);
        const tid = setTimeout(() => {
          if (gameState !== 'RUNNING' || runningRoundId !== thisRunningRoundId) return;
          if (s.cashout != null) return;
          const m = multiplier;
          if (m >= crashPoint) return;
          const payout = Math.round(s.bet * m * 100) / 100;
          s.cashout = m;
          s.payout = payout;
          broadcastBets(io);
        }, delayMs);
        fakeCashoutTimeouts.push(tid);
      }
    }
    cancelFakeCrashCashouts = () => {
      for (const t of fakeCashoutTimeouts) clearTimeout(t);
      fakeCashoutTimeouts.length = 0;
    };

    const runInterval = setInterval(() => {
      const timeElapsed = (Date.now() - startTime) / 1000;
      multiplier = Math.pow(Math.E, 0.06 * timeElapsed);

      if (multiplier >= crashPoint) {
        clearInterval(runInterval);
        cancelFakeCrashCashouts();
        cancelFakeCrashCashouts = () => {};
        gameState = 'CRASHED';

        crashHistory.unshift(crashPoint);
        if (crashHistory.length > CRASH_HISTORY_MAX) crashHistory.pop();

        const secret = crashRoundSecret;
        const pub = crashFairnessPublic;

        void (async () => {
          try {
            await settleLosingBets(io);
          } catch {
            /* continua a mostrar o crash na UI */
          }
          io.emit('crash:exploded', {
            crashPoint,
            history: crashHistory,
            roundId: runningRoundId,
            serverSeed: secret?.roundId === runningRoundId ? secret.serverSeed : undefined,
            serverSeedHash: pub?.roundId === runningRoundId ? pub.serverSeedHash : undefined,
          });
          setTimeout(() => gameLoop(), 6000);
        })();
      } else {
        io.emit('crash:tick', multiplier);
      }
    }, 50);
  };

  const settleLosingBets = async (io: Server) => {
    const toLose = Array.from(betsThisRound.values()).filter(
      (b) => b.roundId === runningRoundId && !b.cashedOut
    );

    for (const b of toLose) {
      try {
        await prisma.bet.update({
          where: { id: b.betId },
          data: {
            result: 'loss',
            multiplier: crashPoint,
            payout: 0,
          },
        });
      } catch {
        /* ignore */
      }
      const row = leaderboard.get(b.userId);
      if (row) {
        row.busted = true;
        leaderboard.set(b.userId, row);
      }
      betsThisRound.delete(b.userId);
    }

    broadcastBets(io);
  };

  io.on('connection', (socket) => {
    emitCrashSnapshot(socket);
    socket.on('crash:sync', () => emitCrashSnapshot(socket));

    socket.on('crash:bet', async (data: { amount?: number }) => {
      const userId = socket.data.userId as string | undefined;
      if (!userId) {
        socket.emit('crash:error', { code: 'AUTH' });
        return;
      }
      if (gameState !== 'COUNTDOWN') {
        socket.emit('crash:error', { code: 'CLOSED' });
        return;
      }
      if (betsThisRound.has(userId)) {
        socket.emit('crash:error', { code: 'ALREADY_BET' });
        return;
      }

      const amount = Number(data?.amount);
      const stake = validateStake(amount);
      if (!stake.ok) {
        socket.emit('crash:error', { code: stake.code });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, balance: true, status: true },
      });
      if (!user || user.balance < amount) {
        socket.emit('crash:error', { code: 'INSUFFICIENT_BALANCE' });
        return;
      }
      if (user.status !== UserStatus.ACTIVE) {
        socket.emit('crash:error', { code: 'ACCOUNT_BLOCKED' });
        return;
      }

      try {
        const betRow = await prisma.$transaction(async (tx) => {
          await debitStake(userId, amount, 'Crash — aposta', tx);
          return tx.bet.create({
            data: {
              userId,
              game: 'crash',
              amount,
              result: 'pending',
              multiplier: null,
              payout: null,
            },
          });
        });

        betsThisRound.set(userId, {
          userId,
          username: user.username,
          betId: betRow.id,
          amount,
          roundId: bettingRoundId,
          cashedOut: false,
        });

        leaderboard.set(userId, {
          id: userId,
          name: user.username,
          bet: amount,
        });
        broadcastBets(io);
        pushWalletBalance(userId);

        socket.emit('crash:bet-accepted', { roundId: bettingRoundId, amount });
      } catch {
        socket.emit('crash:error', { code: 'INSUFFICIENT_BALANCE' });
      }
    });

    socket.on('crash:cashout', async () => {
      const userId = socket.data.userId as string | undefined;
      if (!userId) {
        socket.emit('crash:error', { code: 'AUTH' });
        return;
      }
      if (gameState !== 'RUNNING') {
        socket.emit('crash:error', { code: 'NO_GAME' });
        return;
      }

      const rec = betsThisRound.get(userId);
      if (!rec || rec.roundId !== runningRoundId || rec.cashedOut) {
        socket.emit('crash:error', { code: 'NO_BET' });
        return;
      }

      if (multiplier >= crashPoint) {
        socket.emit('crash:error', { code: 'TOO_LATE' });
        return;
      }

      const payout = Math.round(rec.amount * multiplier * 100) / 100;
      rec.cashedOut = true;

      try {
        await prisma.$transaction(async (tx) => {
          await creditPayout(userId, payout, `Crash — cashout ${multiplier.toFixed(2)}x`, tx);
          await tx.bet.update({
            where: { id: rec.betId },
            data: {
              result: 'win',
              multiplier,
              payout,
            },
          });
        });

        const row = leaderboard.get(userId);
        if (row) {
          row.cashout = multiplier;
          row.payout = payout;
          row.busted = undefined;
          leaderboard.set(userId, row);
        }
        broadcastBets(io);
        pushWalletBalance(userId);

        socket.emit('crash:cashout-ok', { multiplier, payout });
      } catch {
        rec.cashedOut = false;
        socket.emit('crash:error', { code: 'SERVER' });
      }
    });
  });

  gameLoop();
};
