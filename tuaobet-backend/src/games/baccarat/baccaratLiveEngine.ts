import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { UserStatus } from '@prisma/client';
import { creditPayout, debitStake, validateStake } from '../../services/ledger';
import { pushWalletBalance } from '../../socket/pushWalletBalance';
import {
  playRound,
  computeTotalPayoutMulti,
  type BaccaratRoundResult,
  type BaccaratBetSplit,
  type BaccaratOutcome,
  type Card,
} from './baccaratEngine';

type BaccaratPhase = 'BETTING' | 'DEALING' | 'RESULT';

type BaccaratBetRow = {
  betId: string;
  userId: string;
  username: string;
  bets: BaccaratBetSplit;
  totalStake: number;
};

type HistoryItem = {
  outcome: BaccaratOutcome;
  playerTotal: number;
  bankerTotal: number;
};

type BetDisplay = {
  id: string;
  username: string;
  bets: BaccaratBetSplit;
  total: number;
};

type DealPayload = {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  outcome: BaccaratOutcome;
};

const HISTORY_MAX = 24;
const BETTING_SECONDS = 10;
const DEALING_SECONDS = 5;
const RESULT_SECONDS = 3;

let phase: BaccaratPhase = 'BETTING';
let history: HistoryItem[] = [];
let roundBets: BaccaratBetRow[] = [];
let roundId = 0;
let liveCountdown = 0;
let currentDeal: DealPayload | null = null;

function displayBets(): BetDisplay[] {
  return roundBets.map((b) => ({
    id: b.betId,
    username: b.username,
    bets: b.bets,
    total: b.totalStake,
  }));
}

function emitSnapshot(socket: Socket) {
  socket.emit('baccarat:history', history);
  socket.emit('baccarat:state', {
    state: phase,
    countdown: phase === 'BETTING' ? liveCountdown : 0,
    roundId,
  });
  socket.emit('baccarat:bets', displayBets());
  if (phase === 'DEALING' && currentDeal) {
    socket.emit('baccarat:deal', currentDeal);
  }
}

export const initBaccaratGame = (io: Server) => {

  const loop = () => {
    phase = 'BETTING';
    roundBets = [];
    currentDeal = null;
    roundId += 1;

    let countdown = BETTING_SECONDS;
    liveCountdown = countdown;

    io.emit('baccarat:state', { state: 'BETTING', countdown, roundId });
    io.emit('baccarat:bets', []);

    const timer = setInterval(() => {
      countdown -= 1;
      liveCountdown = Math.max(0, countdown);
      io.emit('baccarat:countdown', countdown);

      if (countdown <= 0) {
        clearInterval(timer);
        deal(io);
      }
    }, 1000);
  };

  const deal = (io: Server) => {
    phase = 'DEALING';
    liveCountdown = 0;
    const round = playRound();

    currentDeal = {
      playerCards: round.playerCards,
      bankerCards: round.bankerCards,
      playerTotal: round.playerTotal,
      bankerTotal: round.bankerTotal,
      outcome: round.outcome,
    };

    io.emit('baccarat:deal', currentDeal);

    void settle(io, round);

    setTimeout(() => {
      phase = 'RESULT';

      history.unshift({
        outcome: round.outcome,
        playerTotal: round.playerTotal,
        bankerTotal: round.bankerTotal,
      });
      if (history.length > HISTORY_MAX) history.pop();

      io.emit('baccarat:result', {
        outcome: round.outcome,
        playerTotal: round.playerTotal,
        bankerTotal: round.bankerTotal,
        history,
        roundId,
      });

      setTimeout(() => loop(), RESULT_SECONDS * 1000);
    }, DEALING_SECONDS * 1000);
  };

  const settle = async (_io: Server, round: BaccaratRoundResult) => {
    for (const b of roundBets) {
      const payout = computeTotalPayoutMulti(b.bets, round.outcome);
      const mult =
        b.totalStake > 0
          ? Math.round((payout / b.totalStake) * 100) / 100
          : null;

      try {
        if (payout > 0) {
          await prisma.$transaction(async (tx) => {
            await creditPayout(
              b.userId,
              payout,
              `Baccarat Live — ${round.outcome}`,
              tx
            );
            await tx.bet.update({
              where: { id: b.betId },
              data: { result: 'win', multiplier: mult, payout },
            });
          });
          pushWalletBalance(b.userId);
        } else {
          await prisma.bet.update({
            where: { id: b.betId },
            data: { result: 'loss', multiplier: mult ?? 0, payout: 0 },
          });
        }

        _io.to(`user:${b.userId}`).emit('baccarat:personal-result', {
          payout,
          outcome: round.outcome,
          bets: b.bets,
          roundId,
        });
      } catch {
        /* ignore single-row failure */
      }
    }
  };

  io.on('connection', (socket) => {
    emitSnapshot(socket);
    socket.on('baccarat:sync', () => emitSnapshot(socket));

    socket.on(
      'baccarat:bet',
      async (data: { bets?: Record<string, unknown> }) => {
        const userId = socket.data.userId as string | undefined;
        if (!userId) {
          socket.emit('baccarat:error', { code: 'AUTH' });
          return;
        }
        if (phase !== 'BETTING') {
          socket.emit('baccarat:error', { code: 'CLOSED' });
          return;
        }
        if (roundBets.some((b) => b.userId === userId)) {
          socket.emit('baccarat:error', { code: 'ALREADY_BET' });
          return;
        }

        const raw = data?.bets;
        if (!raw || typeof raw !== 'object') {
          socket.emit('baccarat:error', { code: 'INVALID' });
          return;
        }

        const player = Math.round(Number(raw.player || 0) * 100) / 100;
        const banker = Math.round(Number(raw.banker || 0) * 100) / 100;
        const tie = Math.round(Number(raw.tie || 0) * 100) / 100;

        if (
          ![player, banker, tie].every((n) => Number.isFinite(n) && n >= 0)
        ) {
          socket.emit('baccarat:error', { code: 'INVALID' });
          return;
        }

        const totalStake = player + banker + tie;
        if (totalStake <= 0) {
          socket.emit('baccarat:error', { code: 'INVALID' });
          return;
        }

        const stake = validateStake(totalStake);
        if (!stake.ok) {
          socket.emit('baccarat:error', { code: stake.code });
          return;
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, balance: true, status: true },
        });
        if (!user || user.balance < totalStake) {
          socket.emit('baccarat:error', { code: 'INSUFFICIENT_BALANCE' });
          return;
        }
        if (user.status !== UserStatus.ACTIVE) {
          socket.emit('baccarat:error', { code: 'ACCOUNT_BLOCKED' });
          return;
        }

        try {
          const betRow = await prisma.$transaction(async (tx) => {
            await debitStake(
              userId,
              totalStake,
              'Baccarat Live — aposta',
              tx
            );
            return tx.bet.create({
              data: {
                userId,
                game: 'baccarat',
                amount: totalStake,
                result: 'pending',
                multiplier: null,
                payout: null,
              },
            });
          });

          const split: BaccaratBetSplit = { player, banker, tie };
          roundBets.push({
            betId: betRow.id,
            userId,
            username: user.username,
            bets: split,
            totalStake,
          });

          const display: BetDisplay = {
            id: betRow.id,
            username: user.username,
            bets: split,
            total: totalStake,
          };
          io.emit('baccarat:new-bet', display);
          pushWalletBalance(userId);
          socket.emit('baccarat:bet-accepted', {
            bets: split,
            totalStake,
          });
        } catch {
          socket.emit('baccarat:error', { code: 'INSUFFICIENT_BALANCE' });
        }
      }
    );
  });

  console.log('[baccarat] Motor live iniciado — rodadas a cada ~18s (10s apostas + 5s deal + 3s resultado)');
  loop();
};
