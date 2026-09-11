import { Response } from 'express';
import { randomInt, randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { pushWalletBalance } from '../socket/pushWalletBalance';
import { creditPayout, debitStake, validateStake } from '../services/ledger';
import { applyLoss, applyWin } from '../services/userProgress';
import { publishBigWinForUser } from '../services/publishBigWin';
import {
  createMinesGridFromSeed,
  createSession,
  deleteSession,
  getSession,
  minePositionsFromGrid,
  nextMinesMultiplier,
} from '../games/mines/minesStore';
import { generatePlinkoMultipliers, PlinkoRisk } from '../games/plinko/plinkoMath';
import { generateServerSeed, hashServerSeed } from '../utils/provablyFair';

function rollDiceFloat(): number {
  return randomInt(0, 1_000_000) / 10_000;
}

/** Persist com 1 retry silencioso — UI/ack já saiu (padrão Crash cashout). */
async function persistWithRetry(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch {
    try {
      await fn();
    } catch {
      // Já confirmado em memória/HTTP; crédito será retentado operacionalmente se falhar
    }
  }
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
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const gameId = randomUUID();
    const { grid, minePositions } = createMinesGridFromSeed(serverSeed, gameId, minesCount);
    if (minePositions.length !== minesCount) {
      console.error('[mines] mine count mismatch on start', {
        expected: minesCount,
        got: minePositions.length,
      });
      return res.status(500).json({ message: 'Falha ao gerar tabuleiro' });
    }

    const { betId, balance } = await prisma.$transaction(async (tx) => {
      await debitStake(userId, betAmount, 'Mines — aposta', tx);
      const betRow = await tx.bet.create({
        data: {
          userId,
          game: 'mines',
          amount: betAmount,
          result: 'pending',
          multiplier: null,
          payout: null,
        },
      });
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      return { betId: betRow.id, balance: u?.balance ?? 0 };
    });

    createSession(
      {
        userId,
        grid,
        revealed: Array(25).fill(false),
        betAmount,
        minesCount,
        multiplier: 1,
        betId,
        gameOver: false,
        serverSeed,
        serverSeedHash,
      },
      gameId
    );

    // Resposta imediata — push de wallet em background
    pushWalletBalance(userId);
    return res.json({ gameId, balance, serverSeedHash });
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
    const minePositions = minePositionsFromGrid(session.grid);
    if (minePositions.length !== session.minesCount) {
      console.error('[mines] mine count mismatch on loss', {
        expected: session.minesCount,
        got: minePositions.length,
      });
    }
    const fairness = {
      serverSeed: session.serverSeed,
      serverSeedHash: session.serverSeedHash,
      gameId,
    };
    const betId = session.betId;
    const betAmount = session.betAmount;
    deleteSession(gameId);

    // Resposta imediata — não esperar o Neon/Prisma
    res.json({
      gameOver: true,
      hitMine: true,
      hitIndex: index,
      minePositions,
      ...fairness,
    });

    void persistWithRetry(async () => {
      await prisma.$transaction(async (tx) => {
        await tx.bet.update({
          where: { id: betId },
          data: { result: 'loss', multiplier: 0, payout: 0 },
        });
        await applyLoss(tx, userId, betAmount);
      });
      pushWalletBalance(userId);
    });
    return;
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
    const minePositions = minePositionsFromGrid(session.grid);
    if (minePositions.length !== session.minesCount) {
      console.error('[mines] mine count mismatch on win', {
        expected: session.minesCount,
        got: minePositions.length,
      });
    }
    const fairness = {
      serverSeed: session.serverSeed,
      serverSeedHash: session.serverSeedHash,
      gameId,
    };
    const betId = session.betId;
    const betAmount = session.betAmount;
    session.gameOver = true;
    deleteSession(gameId);

    // Resposta imediata — não esperar o Neon/Prisma
    res.json({
      gameOver: true,
      won: true,
      multiplier: finalMult,
      payout,
      minePositions,
      ...fairness,
    });

    void persistWithRetry(async () => {
      await prisma.$transaction(async (tx) => {
        await creditPayout(userId, payout, 'Mines — vitória (tabuleiro limpo)', tx);
        await tx.bet.update({
          where: { id: betId },
          data: {
            result: 'win',
            multiplier: finalMult,
            payout,
          },
        });
        await applyWin(tx, userId, betAmount, payout);
      });
      pushWalletBalance(userId);
      void publishBigWinForUser({
        betId,
        userId,
        game: 'mines',
        amount: betAmount,
        multiplier: finalMult,
        payout,
      });
    });
    return;
  }

  // Casa segura: só memória — sem DB
  return res.json({
    safe: true,
    multiplier: session.multiplier,
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
  const minePositions = minePositionsFromGrid(session.grid);
  if (minePositions.length !== session.minesCount) {
    console.error('[mines] mine count mismatch on cashout', {
      expected: session.minesCount,
      got: minePositions.length,
    });
    return res.status(500).json({ message: 'Estado do tabuleiro inválido' });
  }
  const fairness = {
    serverSeed: session.serverSeed,
    serverSeedHash: session.serverSeedHash,
    gameId,
  };

  const cashoutMult = session.multiplier;
  const cashoutAmount = session.betAmount;
  const cashoutBetId = session.betId;
  session.gameOver = true;
  deleteSession(gameId);

  // Resposta imediata — não esperar o Neon/Prisma
  res.json({
    multiplier: cashoutMult,
    payout,
    minePositions,
    ...fairness,
  });

  void persistWithRetry(async () => {
    await prisma.$transaction(async (tx) => {
      await creditPayout(userId, payout, `Mines — cashout ${cashoutMult.toFixed(2)}x`, tx);
      await tx.bet.update({
        where: { id: cashoutBetId },
        data: {
          result: 'win',
          multiplier: cashoutMult,
          payout,
        },
      });
      await applyWin(tx, userId, cashoutAmount, payout);
    });
    pushWalletBalance(userId);
    void publishBigWinForUser({
      betId: cashoutBetId,
      userId,
      game: 'mines',
      amount: cashoutAmount,
      multiplier: cashoutMult,
      payout,
    });
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
  const roll = rollDiceFloat();
  const won = roll <= rollUnder;
  const payout = won ? potentialWin : 0;

  try {
    // Débito síncrono (obrigatório); credit/bet/progress em background
    const balanceAfterDebit = await prisma.$transaction(async (tx) => {
      await debitStake(userId, betAmount, 'Dice — aposta', tx);
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      return u?.balance ?? 0;
    });

    const balance =
      Math.round((balanceAfterDebit + (won ? payout : 0)) * 100) / 100;

    // Resposta imediata — não esperar credit/bet no Neon
    res.json({
      roll,
      rollUnder,
      won,
      multiplier,
      payout,
      balance,
    });

    void persistWithRetry(async () => {
      const betRow = await prisma.$transaction(async (tx) => {
        if (won) {
          await creditPayout(userId, payout, `Dice — vitória (roll ≤ ${rollUnder})`, tx);
          await applyWin(tx, userId, betAmount, payout);
        } else {
          await applyLoss(tx, userId, betAmount);
        }
        return tx.bet.create({
          data: {
            userId,
            game: 'dice',
            amount: betAmount,
            result: won ? 'win' : 'loss',
            multiplier: won ? multiplier : null,
            payout: won ? payout : 0,
          },
        });
      });
      pushWalletBalance(userId);
      if (won) {
        void publishBigWinForUser({
          betId: betRow.id,
          userId,
          game: 'dice',
          amount: betAmount,
          multiplier,
          payout,
        });
      }
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
  const isWin = payout >= betAmount;

  try {
    // Débito síncrono; path já calculado — responde antes do credit/bet
    const balanceAfterDebit = await prisma.$transaction(async (tx) => {
      await debitStake(userId, betAmount, 'Plinko — aposta', tx);
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      return u?.balance ?? 0;
    });

    const balance = Math.round((balanceAfterDebit + payout) * 100) / 100;

    // Resposta imediata — não esperar credit/bet no Neon
    res.json({
      path,
      finalSlot,
      multiplier: slotMultiplier,
      payout,
      balance,
    });

    void persistWithRetry(async () => {
      const betRow = await prisma.$transaction(async (tx) => {
        await creditPayout(userId, payout, `Plinko — resultado ${slotMultiplier}x`, tx);
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
    });
  } catch {
    return res.status(400).json({ code: 'INSUFFICIENT_BALANCE' });
  }
}
