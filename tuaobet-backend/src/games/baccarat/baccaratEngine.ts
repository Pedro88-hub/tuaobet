import { randomUUID } from 'node:crypto';
import { Server, Socket } from 'socket.io';
import { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { creditPayout, debitStake, refundStake, refundStakes, validateStake } from '../../services/ledger';
import { applyLoss, applyWin } from '../../services/userProgress';
import { pushWalletBalance } from '../../socket/pushWalletBalance';
import { generateServerSeed, hashServerSeed } from '../../utils/provablyFair';
import { publishBigWinFromBet } from '../../services/publishBigWin';
import {
  createShoe,
  dealRound,
  settleBets,
  shuffleShoe,
  type BaccaratOutcome,
  type Side,
} from './baccaratMath';
import { scheduleSimulatedBaccaratBets } from './baccaratSimulator';
import {
  BACCARAT_BETTING_SECONDS,
  BACCARAT_DEALING_MS,
  BACCARAT_HISTORY_MAX,
  BACCARAT_RESULT_MS,
  buildSnapshot,
  canCancelChip,
  canPlaceChip,
  displayTotals,
  historyFromOutcome,
  isValidSide,
  personalBets,
  personalPlacements,
  prependHistory,
  removeLastUserChip,
  removeUserChips,
  roundMoney,
  type BaccaratPhase,
  type HistoryItem,
  type LiveChip,
  type SimulatedChip,
} from './baccaratLive';

let phase: BaccaratPhase = 'BETTING';
let bettingOpen = false;
let history: HistoryItem[] = [];
let realChips: LiveChip[] = [];
let simulatedChips: SimulatedChip[] = [];
let cancelSimulatedBets: () => void = () => {};
let baccaratRoundId = 0;
let liveCountdown = 0;
let commitPublic: { roundId: number; serverSeedHash: string } | null = null;
let roundSecret: { serverSeed: string; roundId: number; outcome: BaccaratOutcome } | null = null;

function emitToUser(io: Server, userId: string, event: string, payload: unknown) {
  for (const sock of io.sockets.sockets.values()) {
    if (sock.data.userId === userId) sock.emit(event, payload);
  }
}

function emitTotals(io: Server) {
  io.emit('baccarat:totals', { roundId: baccaratRoundId, ...displayTotals(realChips, simulatedChips) });
}

function emitSnapshot(socket: Socket) {
  const snapshot = buildSnapshot({
    phase,
    countdown: liveCountdown,
    roundId: baccaratRoundId,
    serverSeedHash: commitPublic?.serverSeedHash,
    outcome: roundSecret?.outcome ?? null,
    history,
    realChips,
    simulatedChips,
    userId: socket.data.userId as string | undefined,
  });
  socket.emit('baccarat:history', snapshot.history);
  socket.emit('baccarat:state', snapshot.state);
  socket.emit('baccarat:totals', snapshot.totals);
  if (commitPublic) socket.emit('baccarat:commit', commitPublic);
  if (phase !== 'BETTING' && roundSecret) socket.emit('baccarat:deal', roundSecret.outcome);
  if (snapshot.personal && snapshot.personal.placements.length > 0) {
    socket.emit('baccarat:chip-accepted', {
      roundId: baccaratRoundId,
      placementId: snapshot.personal.placements.at(-1)?.placementId,
      side: snapshot.personal.placements.at(-1)?.side,
      amount: snapshot.personal.placements.at(-1)?.amount,
      bets: snapshot.personal.bets,
      placements: snapshot.personal.placements,
    });
  }
}

async function loadHistoryFromDb(): Promise<HistoryItem[]> {
  const rows = await prisma.baccaratRoundResult.findMany({
    orderBy: { createdAt: 'desc' },
    take: BACCARAT_HISTORY_MAX,
    select: { roundId: true, winner: true, playerTotal: true, bankerTotal: true, createdAt: true },
  });
  return rows.map((row) => ({
    roundId: row.roundId ?? 0,
    winner: row.winner as Side,
    playerTotal: row.playerTotal,
    bankerTotal: row.bankerTotal,
    createdAt: row.createdAt.toISOString(),
  }));
}

async function persistResult(item: HistoryItem, outcome: BaccaratOutcome): Promise<void> {
  await prisma.baccaratRoundResult.create({
    data: {
      roundId: item.roundId,
      winner: item.winner,
      playerTotal: item.playerTotal,
      bankerTotal: item.bankerTotal,
      outcome: outcome as unknown as Prisma.InputJsonValue,
    },
  });
  const keep = await prisma.baccaratRoundResult.findMany({
    orderBy: { createdAt: 'desc' },
    take: BACCARAT_HISTORY_MAX,
    select: { id: true },
  });
  if (keep.length < BACCARAT_HISTORY_MAX) return;
  await prisma.baccaratRoundResult.deleteMany({
    where: { id: { notIn: keep.map((row) => row.id) } },
  });
}

async function refundChips(userId: string, chips: LiveChip[], description: string) {
  if (chips.length === 0) return;
  const amounts = chips.map((chip) => chip.amount);
  const betIds = chips.map((chip) => chip.betId);
  await prisma.$transaction(async (tx) => {
    await refundStakes(userId, amounts, description, tx);
    await tx.bet.updateMany({
      where: { id: { in: betIds }, result: 'pending' },
      data: { result: 'cancelled', payout: 0, multiplier: null },
    });
  });
  pushWalletBalance(userId);
}

export const initBaccaratGame = (io: Server) => {
  let countdownTimer: ReturnType<typeof setInterval> | null = null;
  let dealingTimer: ReturnType<typeof setTimeout> | null = null;
  let resultTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (dealingTimer) {
      clearTimeout(dealingTimer);
      dealingTimer = null;
    }
    if (resultTimer) {
      clearTimeout(resultTimer);
      resultTimer = null;
    }
  };

  const startRound = () => {
    clearTimers();
    cancelSimulatedBets();
    cancelSimulatedBets = () => {};

    phase = 'BETTING';
    bettingOpen = true;
    realChips = [];
    simulatedChips = [];
    baccaratRoundId += 1;
    const thisRoundId = baccaratRoundId;

    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const outcome = dealRound(shuffleShoe(createShoe()));
    commitPublic = { roundId: thisRoundId, serverSeedHash };
    roundSecret = { serverSeed, roundId: thisRoundId, outcome };

    let countdown = BACCARAT_BETTING_SECONDS;
    liveCountdown = countdown;

    io.emit('baccarat:commit', commitPublic);
    io.emit('baccarat:state', {
      phase: 'BETTING',
      countdown,
      roundId: thisRoundId,
      serverSeedHash,
    });
    emitTotals(io);
    io.emit('baccarat:countdown', countdown);

    if (process.env.BACCARAT_SIMULATOR_DISABLED !== '1' && process.env.BACCARAT_SIMULATOR_DISABLED !== 'true') {
      cancelSimulatedBets = scheduleSimulatedBaccaratBets(io, {
        roundDurationMs: countdown * 1000,
        isRoundOpen: () => phase === 'BETTING' && bettingOpen && baccaratRoundId === thisRoundId,
        onBet: (bet) => {
          simulatedChips.push(bet);
        },
        emitTotals: () => emitTotals(io),
      });
    }

    countdownTimer = setInterval(() => {
      if (phase !== 'BETTING' || baccaratRoundId !== thisRoundId) {
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = null;
        return;
      }
      countdown -= 1;
      liveCountdown = Math.max(0, countdown);
      io.emit('baccarat:countdown', countdown);
      if (countdown <= 0) {
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = null;
        startDeal(io);
      }
    }, 1000);
  };

  const startDeal = (io: Server) => {
    bettingOpen = false;
    cancelSimulatedBets();
    cancelSimulatedBets = () => {};
    clearTimers();

    const sec = roundSecret;
    if (!sec) {
      startRound();
      return;
    }

    liveCountdown = 0;
    phase = 'DEALING';
    io.emit('baccarat:state', {
      phase: 'DEALING',
      countdown: 0,
      roundId: baccaratRoundId,
      serverSeedHash: commitPublic?.serverSeedHash,
      outcome: sec.outcome,
    });
    io.emit('baccarat:deal', sec.outcome);

    dealingTimer = setTimeout(() => {
      void settleRound(io, sec.outcome);
    }, BACCARAT_DEALING_MS);
  };

  const settleRound = async (io: Server, outcome: BaccaratOutcome) => {
    phase = 'RESULT';
    const settledRoundId = baccaratRoundId;
    const chips = [...realChips];
    const item = historyFromOutcome(settledRoundId, outcome);
    history = prependHistory(history, item);

    io.emit('baccarat:state', {
      phase: 'RESULT',
      countdown: 0,
      roundId: settledRoundId,
      serverSeedHash: commitPublic?.serverSeedHash,
      outcome,
    });
    io.emit('baccarat:result', {
      roundId: settledRoundId,
      outcome,
      history,
      serverSeed: roundSecret?.roundId === settledRoundId ? roundSecret.serverSeed : undefined,
      serverSeedHash: commitPublic?.roundId === settledRoundId ? commitPublic.serverSeedHash : undefined,
    });

    resultTimer = setTimeout(() => startRound(), BACCARAT_RESULT_MS);

    void (async () => {
      for (const chip of chips) {
        try {
          const stakeCents = Math.round(chip.amount * 100);
          const [settlement] = settleBets(
            {
              player: chip.side === 'player' ? stakeCents : 0,
              banker: chip.side === 'banker' ? stakeCents : 0,
              tie: chip.side === 'tie' ? stakeCents : 0,
            },
            outcome.winner,
          );
          if (!settlement) continue;
          const payout = roundMoney(settlement.payout / 100);
          if (settlement.result === 'win') {
            await prisma.$transaction(async (tx) => {
              await creditPayout(chip.userId, payout, `Baccarat — vitória ${settlement.multiplier}x`, tx);
              await tx.bet.update({
                where: { id: chip.betId },
                data: { result: 'win', multiplier: settlement.multiplier, payout },
              });
              await applyWin(tx, chip.userId, chip.amount, payout);
            });
            pushWalletBalance(chip.userId);
            publishBigWinFromBet({
              id: chip.betId,
              game: 'baccarat',
              amount: chip.amount,
              multiplier: settlement.multiplier,
              payout,
              username: chip.username,
            });
          } else if (settlement.result === 'push') {
            await prisma.$transaction(async (tx) => {
              await creditPayout(chip.userId, payout, 'Baccarat — empate (devolução)', tx);
              await tx.bet.update({
                where: { id: chip.betId },
                data: { result: 'push', multiplier: 1, payout },
              });
            });
            pushWalletBalance(chip.userId);
          } else {
            await prisma.$transaction(async (tx) => {
              await tx.bet.update({
                where: { id: chip.betId },
                data: { result: 'loss', multiplier: 0, payout: 0 },
              });
              await applyLoss(tx, chip.userId, chip.amount);
            });
            pushWalletBalance(chip.userId);
          }
        } catch {
          /* ignore single row failure */
        }
      }

      try {
        await persistResult(item, outcome);
      } catch (error) {
        console.error('[baccarat] falha ao persistir histórico:', error);
      }
    })();
  };

  io.on('connection', (socket) => {
    emitSnapshot(socket);
    socket.on('baccarat:sync', () => emitSnapshot(socket));

    socket.on('baccarat:bet', async (data: { side?: Side; amount?: number }) => {
      const userId = socket.data.userId as string | undefined;
      if (!userId) {
        socket.emit('baccarat:error', { code: 'AUTH' });
        return;
      }
      if (!isValidSide(data?.side)) {
        socket.emit('baccarat:error', { code: 'INVALID' });
        return;
      }
      const amount = Number(data?.amount);
      const stake = validateStake(amount);
      if (!stake.ok) {
        socket.emit('baccarat:error', { code: stake.code });
        return;
      }
      if (!canPlaceChip(phase, bettingOpen)) {
        socket.emit('baccarat:error', { code: 'CLOSED' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, balance: true, status: true },
      });
      if (!user || user.balance < amount) {
        socket.emit('baccarat:error', { code: 'INSUFFICIENT_BALANCE' });
        return;
      }
      if (user.status !== UserStatus.ACTIVE) {
        socket.emit('baccarat:error', { code: 'ACCOUNT_BLOCKED' });
        return;
      }

      const roundWhenDebited = baccaratRoundId;
      try {
        const betRow = await prisma.$transaction(async (tx) => {
          await debitStake(userId, amount, 'Baccarat — aposta', tx);
          return tx.bet.create({
            data: {
              userId,
              game: 'baccarat',
              amount,
              result: 'pending',
              multiplier: null,
              payout: null,
            },
          });
        });

        if (!canPlaceChip(phase, bettingOpen) || baccaratRoundId !== roundWhenDebited) {
          try {
            await prisma.$transaction(async (tx) => {
              await refundStake(userId, amount, 'Baccarat — aposta fechada', tx);
              await tx.bet.update({
                where: { id: betRow.id },
                data: { result: 'cancelled', payout: 0, multiplier: null },
              });
            });
            pushWalletBalance(userId);
          } catch {
            /* saldo reconciliado operacionalmente */
          }
          socket.emit('baccarat:error', { code: 'CLOSED' });
          return;
        }

        const chip: LiveChip = {
          placementId: randomUUID(),
          betId: betRow.id,
          userId,
          username: user.username,
          side: data.side,
          amount,
        };
        realChips.push(chip);
        emitTotals(io);
        emitToUser(io, userId, 'baccarat:chip-accepted', {
          roundId: baccaratRoundId,
          placementId: chip.placementId,
          side: chip.side,
          amount: chip.amount,
          bets: personalBets(realChips, userId),
          placements: personalPlacements(realChips, userId),
        });
        pushWalletBalance(userId);
      } catch {
        socket.emit('baccarat:error', { code: 'INSUFFICIENT_BALANCE' });
      }
    });

    socket.on('baccarat:undo', async () => {
      const userId = socket.data.userId as string | undefined;
      if (!userId) {
        socket.emit('baccarat:error', { code: 'AUTH' });
        return;
      }
      if (!canCancelChip(phase, bettingOpen)) {
        socket.emit('baccarat:error', { code: 'CLOSED' });
        return;
      }
      const { remaining, removed } = removeLastUserChip(realChips, userId);
      if (!removed) {
        socket.emit('baccarat:error', { code: 'NO_BET' });
        return;
      }
      realChips = remaining;
      if (!canCancelChip(phase, bettingOpen)) {
        realChips.push(removed);
        socket.emit('baccarat:error', { code: 'CLOSED' });
        return;
      }
      emitTotals(io);
      socket.emit('baccarat:bet-cancelled', {
        roundId: baccaratRoundId,
        refunded: removed.amount,
        bets: personalBets(realChips, userId),
        placements: personalPlacements(realChips, userId),
      });
      try {
        await refundChips(userId, [removed], 'Baccarat — desfazer');
      } catch {
        try {
          await refundChips(userId, [removed], 'Baccarat — desfazer');
        } catch {
          /* cliente já viu o cancelamento */
        }
      }
    });

    socket.on('baccarat:clear', async () => {
      const userId = socket.data.userId as string | undefined;
      if (!userId) {
        socket.emit('baccarat:error', { code: 'AUTH' });
        return;
      }
      if (!canCancelChip(phase, bettingOpen)) {
        socket.emit('baccarat:error', { code: 'CLOSED' });
        return;
      }
      const { remaining, removed } = removeUserChips(realChips, userId);
      if (removed.length === 0) {
        socket.emit('baccarat:error', { code: 'NO_BET' });
        return;
      }
      realChips = remaining;
      if (!canCancelChip(phase, bettingOpen)) {
        realChips.push(...removed);
        socket.emit('baccarat:error', { code: 'CLOSED' });
        return;
      }
      const refunded = roundMoney(removed.reduce((sum, chip) => sum + chip.amount, 0));
      emitTotals(io);
      socket.emit('baccarat:bet-cancelled', {
        roundId: baccaratRoundId,
        refunded,
        bets: personalBets(realChips, userId),
        placements: personalPlacements(realChips, userId),
      });
      try {
        await refundChips(userId, removed, 'Baccarat — limpar');
      } catch {
        try {
          await refundChips(userId, removed, 'Baccarat — limpar');
        } catch {
          /* cliente já viu o cancelamento */
        }
      }
    });
  });

  void (async () => {
    try {
      history = await loadHistoryFromDb();
      console.log(`[baccarat] histórico carregado: ${history.length} rondas`);
    } catch (error) {
      console.error('[baccarat] falha ao carregar histórico:', error);
      history = [];
    }
    startRound();
  })();
};
