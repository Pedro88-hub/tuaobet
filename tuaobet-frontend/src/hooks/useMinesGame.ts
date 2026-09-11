import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiError } from '../services/api';
import { playCrashSound } from '../lib/crashSounds';
import { emitCoinBurst } from '../lib/gameFx';

export type GameState = 'IDLE' | 'PLAYING' | 'CASHOUT' | 'GAME_OVER';

export type MinesFairnessCommit = {
  gameId: string;
  serverSeedHash: string;
  minesCount: number;
};

export type MinesFairnessReveal = {
  gameId: string;
  serverSeed: string;
  serverSeedHash: string;
  minesCount: number;
  minePositions: number[];
};

const ERROR_MAP: Record<string, string> = {
  INSUFFICIENT_BALANCE: 'Saldo insuficiente',
};

function applyMinePositions(positions: number[]): boolean[] {
  const newGrid = Array(25).fill(false) as boolean[];
  for (const i of positions) {
    if (i >= 0 && i < 25) newGrid[i] = true;
  }
  return newGrid;
}

export function useMinesGame() {
  const { setUserBalance } = useAuth();
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [minesCount, setMinesCount] = useState(3);
  const [grid, setGrid] = useState<boolean[]>(Array(25).fill(false));
  const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [multiplier, setMultiplier] = useState(1.0);
  const [history, setHistory] = useState<number[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPayout, setLastPayout] = useState(0);
  const [fairnessCommit, setFairnessCommit] = useState<MinesFairnessCommit | null>(null);
  const [fairnessReveal, setFairnessReveal] = useState<MinesFairnessReveal | null>(null);

  const startGameWithBet = useCallback(
    async (betAmount: number) => {
      setError(null);
      playCrashSound('bet');
      emitCoinBurst({ direction: 'out', count: 10 });
      try {
        const res = await apiFetch<{
          gameId: string;
          balance?: number;
          serverSeedHash?: string;
        }>('/api/games/mines/start', {
          method: 'POST',
          body: JSON.stringify({ minesCount, betAmount }),
        });
        if (typeof res.balance === 'number') setUserBalance(res.balance);
        setGameId(res.gameId);
        setGrid(Array(25).fill(false));
        setRevealed(Array(25).fill(false));
        setMultiplier(1.0);
        setLastPayout(0);
        setFairnessReveal(null);
        if (res.serverSeedHash) {
          setFairnessCommit({
            gameId: res.gameId,
            serverSeedHash: res.serverSeedHash,
            minesCount,
          });
        } else {
          setFairnessCommit(null);
        }
        setGameState('PLAYING');
      } catch (e) {
        const code = e instanceof ApiError ? e.code : undefined;
        const msg =
          (code && ERROR_MAP[code]) ||
          (e instanceof ApiError ? e.message : 'Não foi possível iniciar');
        setError(msg);
      }
    },
    [minesCount, setUserBalance]
  );

  const revealCell = useCallback(
    async (index: number) => {
      if (gameState !== 'PLAYING' || revealed[index] || !gameId) return;

      try {
        const res = await apiFetch<{
          safe?: boolean;
          multiplier?: number;
          gameOver?: boolean;
          hitMine?: boolean;
          minePositions?: number[];
          won?: boolean;
          payout?: number;
          balance?: number;
          serverSeed?: string;
          serverSeedHash?: string;
          gameId?: string;
        }>('/api/games/mines/reveal', {
          method: 'POST',
          body: JSON.stringify({ gameId, index }),
        });

        if (typeof res.balance === 'number') setUserBalance(res.balance);

        if (res.hitMine && res.minePositions) {
          playCrashSound('mines-bomb');
          setGrid(applyMinePositions(res.minePositions));
          setRevealed(Array(25).fill(true));
          setGameState('GAME_OVER');
          setGameId(null);
          setHistory((prev) => [0, ...prev].slice(0, 40));
          if (res.serverSeed && res.serverSeedHash) {
            setFairnessReveal({
              gameId: res.gameId ?? gameId,
              serverSeed: res.serverSeed,
              serverSeedHash: res.serverSeedHash,
              minesCount,
              minePositions: res.minePositions,
            });
          }
          return;
        }

        if (res.won && res.gameOver) {
          playCrashSound('mines-diamond');
          playCrashSound('cashout');
          emitCoinBurst({ direction: 'in', count: 14 });
          if (res.minePositions) {
            setGrid(applyMinePositions(res.minePositions));
          }
          const newRev = [...revealed];
          newRev[index] = true;
          setRevealed(newRev);
          if (typeof res.multiplier === 'number') setMultiplier(res.multiplier);
          if (typeof res.payout === 'number') setLastPayout(res.payout);
          setGameState('CASHOUT');
          setGameId(null);
          setHistory((prev) => [res.multiplier ?? 1, ...prev].slice(0, 40));
          if (res.serverSeed && res.serverSeedHash && res.minePositions) {
            setFairnessReveal({
              gameId: res.gameId ?? gameId,
              serverSeed: res.serverSeed,
              serverSeedHash: res.serverSeedHash,
              minesCount,
              minePositions: res.minePositions,
            });
          }
          return;
        }

        if (res.safe) {
          playCrashSound('mines-diamond');
          const newRev = [...revealed];
          newRev[index] = true;
          setRevealed(newRev);
          if (typeof res.multiplier === 'number') setMultiplier(res.multiplier);
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Erro ao revelar';
        setError(msg);
      }
    },
    [gameState, revealed, gameId, minesCount, setUserBalance]
  );

  const cashout = useCallback(async () => {
    if (gameState !== 'PLAYING' || !gameId) return;

    try {
      const res = await apiFetch<{
        multiplier: number;
        payout: number;
        balance?: number;
        minePositions?: number[];
        serverSeed?: string;
        serverSeedHash?: string;
        gameId?: string;
      }>('/api/games/mines/cashout', {
        method: 'POST',
        body: JSON.stringify({ gameId }),
      });
      if (typeof res.balance === 'number') setUserBalance(res.balance);
      playCrashSound('cashout');
      emitCoinBurst({ direction: 'in', count: 14 });
      if (res.minePositions) {
        setGrid(applyMinePositions(res.minePositions));
      }
      setMultiplier(res.multiplier);
      setLastPayout(res.payout);
      setGameState('CASHOUT');
      setGameId(null);
      setHistory((prev) => [res.multiplier, ...prev].slice(0, 40));
      if (res.serverSeed && res.serverSeedHash && res.minePositions) {
        setFairnessReveal({
          gameId: res.gameId ?? gameId,
          serverSeed: res.serverSeed,
          serverSeedHash: res.serverSeedHash,
          minesCount,
          minePositions: res.minePositions,
        });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao retirar';
      setError(msg);
    }
  }, [gameState, gameId, minesCount, setUserBalance]);

  return {
    gameState,
    minesCount,
    setMinesCount,
    grid,
    revealed,
    multiplier,
    history,
    gameId,
    error,
    lastPayout,
    fairnessCommit,
    fairnessReveal,
    startGameWithBet,
    revealCell,
    cashout,
  };
}
