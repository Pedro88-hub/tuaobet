import { Response } from 'express';
import { randomInt } from 'crypto';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { pushWalletBalance } from '../socket/pushWalletBalance';
import { creditPayout, debitStake, validateStake } from '../services/ledger';
import { applyLoss, applyWin } from '../services/userProgress';
import { publishBigWinForUser } from '../services/publishBigWin';
import {
  createMinesGrid,
  createSession,
  deleteSession,
  getSession,
  nextMinesMultiplier,
} from '../games/mines/minesStore';
import { generatePlinkoMultipliers, PlinkoRisk } from '../games/plinko/plinkoMath';
import {
  BaccaratBetSplit,
  BaccaratSide,
  computeTotalPayoutMulti,
  playRound,
} from '../games/baccarat/baccaratEngine';
import { isBaccaratInMaintenance } from '../config/gameMaintenance';

function rollDiceFloat(): number {
  return randomInt(0, 1_000_000) / 10_000;
}

export async function minesStart(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const minesCount = Number(req.body?.minesCount);
  const betAmount = Number(req.body?.betAmount);

  if (!Number.isInteger(minesCount) || minesCount < 1 || minesCount > 24) {
    return res.status(400).json({ message: 'minesCount inválido (1–24)' });
  }

  const stake = validateStake(betAmount);
  if (!stake.ok) {
    return res.status(400).json({ code: stake.code });
  }

  try {
    const grid = createMinesGrid(minesCount);
    const betRow = await prisma.$transaction(async (tx) => {
      await debitStake(userId, betAmount, 'Mines — aposta', tx);
      return tx.bet.create({
        data: {
          userId,
          game: 'mines',
          amount: betAmount,
          result: 'pending',
          multiplier: null,
          payout: null,
        },
      });
    });

    const sessionId = createSession({
      userId,
      grid,
      revealed: Array(25).fill(false),
      betAmount,
      minesCount,
      multiplier: 1,
      betId: betRow.id,
      gameOver: false,
    });

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    const balance = u?.balance ?? 0;
    pushWalletBalance(userId);
    return res.json({ gameId: sessionId, balance });
  } catch {
    return res.status(400).json({ code: 'INSUFFICIENT_BALANCE' });
  }
}

export async function minesReveal(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const gameId = String(req.body?.gameId ?? '');
  const index = Number(req.body?.index);

  if (!gameId || !Number.isInteger(index) || index < 0 || index > 24) {
    return res.status(400).json({ message: 'Payload inválido' });
  }

  const session = getSession(gameId, userId);
  if (!session || session.gameOver) {
    return res.status(400).json({ message: 'Sessão inválida' });
  }
  if (session.revealed[index]) {
    return res.status(400).json({ message: 'Casa já revelada' });
  }

  session.revealed[index] = true;

  if (session.grid[index]) {
    session.gameOver = true;
    const minePositions = session.grid.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
    await prisma.$transaction(async (tx) => {
      await tx.bet.update({
        where: { id: session.betId },
        data: { result: 'loss', multiplier: 0, payout: 0 },
      });
      await applyLoss(tx, userId, session.betAmount);
    });
    deleteSession(gameId);
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    const balance = u?.balance ?? 0;
    pushWalletBalance(userId);
    return res.json({
      gameOver: true,
      hitMine: true,
      hitIndex: index,
      minePositions,
      balance,
    });
  }

  const revealedSafe = session.revealed.filter((r, i) => r && !session.grid[i]).length;
  session.multiplier = nextMinesMultiplier(
    session.multiplier,
    revealedSafe - 1,
    session.minesCount
  );

  const maxSafe = 25 - session.minesCount;
  if (revealedSafe >= maxSafe) {
    const payout = Math.round(session.betAmount * session.multiplier * 100) / 100;
    const finalMult = session.multiplier;
    await prisma.$transaction(async (tx) => {
      await creditPayout(userId, payout, 'Mines — vitória (tabuleiro limpo)', tx);
      await tx.bet.update({
        where: { id: session.betId },
        data: {
          result: 'win',
          multiplier: session.multiplier,
          payout,
        },
      });
      await applyWin(tx, userId, session.betAmount, payout);
    });
    session.gameOver = true;
    deleteSession(gameId);
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    const balance = u?.balance ?? 0;
    pushWalletBalance(userId);
    void publishBigWinForUser({
      betId: session.betId,
      userId,
      game: 'mines',
      amount: session.betAmount,
      multiplier: finalMult,
      payout,
    });
    return res.json({
      gameOver: true,
      won: true,
      multiplier: finalMult,
      payout,
      balance,
    });
  }

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });

  const balance = u?.balance ?? 0;
  pushWalletBalance(userId);
  return res.json({
    safe: true,
    multiplier: session.multiplier,
    balance,
  });
}

export async function minesCashout(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const gameId = String(req.body?.gameId ?? '');
  if (!gameId) {
    return res.status(400).json({ message: 'gameId obrigatório' });
  }

  const session = getSession(gameId, userId);
  if (!session || session.gameOver) {
    return res.status(400).json({ message: 'Sessão inválida' });
  }

  const revealedSafe = session.revealed.filter((r, i) => r && !session.grid[i]).length;
  if (revealedSafe < 1) {
    return res.status(400).json({ message: 'Revele pelo menos uma casa segura' });
  }

  const payout = Math.round(session.betAmount * session.multiplier * 100) / 100;

  await prisma.$transaction(async (tx) => {
    await creditPayout(userId, payout, `Mines — cashout ${session.multiplier.toFixed(2)}x`, tx);
    await tx.bet.update({
      where: { id: session.betId },
      data: {
        result: 'win',
        multiplier: session.multiplier,
        payout,
      },
    });
    await applyWin(tx, userId, session.betAmount, payout);
  });

  const cashoutMult = session.multiplier;
  const cashoutAmount = session.betAmount;
  const cashoutBetId = session.betId;
  session.gameOver = true;
  deleteSession(gameId);
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  const balance = u?.balance ?? 0;
  pushWalletBalance(userId);
  void publishBigWinForUser({
    betId: cashoutBetId,
    userId,
    game: 'mines',
    amount: cashoutAmount,
    multiplier: cashoutMult,
    payout,
  });
  return res.json({
    balance,
    multiplier: cashoutMult,
    payout,
  });
}

export async function diceRoll(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const betAmount = Number(req.body?.betAmount);
  const rollUnder = Number(req.body?.rollUnder);

  if (!Number.isFinite(rollUnder) || rollUnder < 2 || rollUnder > 98) {
    return res.status(400).json({ message: 'rollUnder deve estar entre 2 e 98' });
  }

  const stake = validateStake(betAmount);
  if (!stake.ok) {
    return res.status(400).json({ code: stake.code });
  }

  const multiplier = 99 / rollUnder;
  const potentialWin = Math.round(betAmount * multiplier * 100) / 100;

  try {
    const { roll, won, payout, betId } = await prisma.$transaction(async (tx) => {
      await debitStake(userId, betAmount, 'Dice — aposta', tx);
      const roll = rollDiceFloat();
      const won = roll <= rollUnder;
      const payout = won ? potentialWin : 0;
      if (won) {
        await creditPayout(userId, payout, `Dice — vitória (roll ≤ ${rollUnder})`, tx);
        await applyWin(tx, userId, betAmount, payout);
      } else {
        await applyLoss(tx, userId, betAmount);
      }
      const betRow = await tx.bet.create({
        data: {
          userId,
          game: 'dice',
          amount: betAmount,
          result: won ? 'win' : 'loss',
          multiplier: won ? multiplier : null,
          payout: won ? payout : 0,
        },
      });
      return { roll, won, payout, betId: betRow.id };
    });

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    const balance = u?.balance ?? 0;
    pushWalletBalance(userId);
    if (won) {
      void publishBigWinForUser({
        betId,
        userId,
        game: 'dice',
        amount: betAmount,
        multiplier,
        payout,
      });
    }
    return res.json({
      roll,
      rollUnder,
      won,
      multiplier,
      payout,
      balance,
    });
  } catch {
    return res.status(400).json({ code: 'INSUFFICIENT_BALANCE' });
  }
}

export async function plinkoDrop(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const betAmount = Number(req.body?.betAmount);
  const rows = Number(req.body?.rows);
  const risk = req.body?.risk as PlinkoRisk;

  if (!Number.isInteger(rows) || rows < 8 || rows > 16) {
    return res.status(400).json({ message: 'rows entre 8 e 16' });
  }
  if (!['low', 'medium', 'high'].includes(risk)) {
    return res.status(400).json({ message: 'risk inválido' });
  }

  const stake = validateStake(betAmount);
  if (!stake.ok) {
    return res.status(400).json({ code: stake.code });
  }

  const multipliers = generatePlinkoMultipliers(rows, risk);
  const path: number[] = [];
  for (let i = 0; i < rows; i++) {
    path.push(randomInt(0, 2));
  }
  const finalSlot = path.reduce((a, b) => a + b, 0);
  const slotMultiplier = multipliers[finalSlot] ?? 0;
  const payout = Math.round(betAmount * slotMultiplier * 100) / 100;

  try {
    const betRow = await prisma.$transaction(async (tx) => {
      await debitStake(userId, betAmount, 'Plinko — aposta', tx);
      await creditPayout(userId, payout, `Plinko — resultado ${slotMultiplier}x`, tx);
      const isWin = payout >= betAmount;
      if (isWin) {
        await applyWin(tx, userId, betAmount, payout);
      } else {
        await applyLoss(tx, userId, betAmount);
      }
      return tx.bet.create({
        data: {
          userId,
          game: 'plinko',
          amount: betAmount,
          result: isWin ? 'win' : 'loss',
          multiplier: slotMultiplier,
          payout,
        },
      });
    });

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    const balance = u?.balance ?? 0;
    pushWalletBalance(userId);
    if (betRow.result === 'win') {
      void publishBigWinForUser({
        betId: betRow.id,
        userId,
        game: 'plinko',
        amount: betAmount,
        multiplier: slotMultiplier,
        payout,
      });
    }
    return res.json({
      path,
      finalSlot,
      multiplier: slotMultiplier,
      payout,
      balance,
    });
  } catch {
    return res.status(400).json({ code: 'INSUFFICIENT_BALANCE' });
  }
}

function parseBaccaratBets(body: Record<string, unknown>): BaccaratBetSplit | null {
  const bets = body?.bets;
  if (bets && typeof bets === 'object' && bets !== null && !Array.isArray(bets)) {
    const o = bets as Record<string, unknown>;
    const player = Number(o.player);
    const banker = Number(o.banker);
    const tie = Number(o.tie);
    if ([player, banker, tie].every((n) => Number.isFinite(n) && n >= 0)) {
      return {
        player: Math.round(player * 100) / 100,
        banker: Math.round(banker * 100) / 100,
        tie: Math.round(tie * 100) / 100,
      };
    }
    return null;
  }

  const betAmount = Number(body?.betAmount);
  const sideRaw = body?.side;
  if (
    Number.isFinite(betAmount) &&
    betAmount > 0 &&
    (sideRaw === 'player' || sideRaw === 'banker' || sideRaw === 'tie')
  ) {
    const s = sideRaw as BaccaratSide;
    return {
      player: s === 'player' ? betAmount : 0,
      banker: s === 'banker' ? betAmount : 0,
      tie: s === 'tie' ? betAmount : 0,
    };
  }

  return null;
}

export async function baccaratPlay(req: AuthRequest, res: Response) {
  if (isBaccaratInMaintenance()) {
    return res.status(503).json({
      code: 'GAME_MAINTENANCE',
      message: 'Baccarat está em manutenção',
    });
  }

  const userId = req.userId!;
  const split = parseBaccaratBets(req.body as Record<string, unknown>);
  if (!split) {
    return res.status(400).json({
      message: 'Envie bets: { player, banker, tie } ou legado betAmount + side',
    });
  }

  const totalStake = split.player + split.banker + split.tie;
  if (!Number.isFinite(totalStake) || totalStake <= 0) {
    return res.status(400).json({ message: 'Coloque fichas em pelo menos uma zona' });
  }

  const stake = validateStake(totalStake);
  if (!stake.ok) {
    return res.status(400).json({ code: stake.code });
  }

  const round = playRound();
  const payout = computeTotalPayoutMulti(split, round.outcome);
  const effectiveMultiplier =
    totalStake > 0 ? Math.round((payout / totalStake) * 100) / 100 : null;

  try {
    const betRow = await prisma.$transaction(async (tx) => {
      await debitStake(userId, totalStake, 'Baccarat — aposta', tx);
      await creditPayout(userId, payout, `Baccarat — ${round.outcome}`, tx);
      const isWin = payout > 0;
      if (isWin) {
        await applyWin(tx, userId, totalStake, payout);
      } else {
        await applyLoss(tx, userId, totalStake);
      }
      return tx.bet.create({
        data: {
          userId,
          game: 'baccarat',
          amount: totalStake,
          result: isWin ? 'win' : 'loss',
          multiplier: effectiveMultiplier,
          payout,
        },
      });
    });

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    const balance = u?.balance ?? 0;
    pushWalletBalance(userId);
    if (betRow.result === 'win') {
      void publishBigWinForUser({
        betId: betRow.id,
        userId,
        game: 'baccarat',
        amount: totalStake,
        multiplier: effectiveMultiplier,
        payout,
      });
    }
    return res.json({
      playerCards: round.playerCards,
      bankerCards: round.bankerCards,
      playerTotal: round.playerTotal,
      bankerTotal: round.bankerTotal,
      outcome: round.outcome,
      bets: split,
      payout,
      balance,
    });
  } catch {
    return res.status(400).json({ code: 'INSUFFICIENT_BALANCE' });
  }
}
