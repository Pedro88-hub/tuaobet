import { useState, useCallback, useRef } from 'react';
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
  const { setUserBalance, user } = useAuth();
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

  const startInFlightRef = useRef(false);
  const cashoutInFlightRef = useRef(false);
  const revealInFlightRef = useRef<Set<number>>(new Set());
  const betAmountRef = useRef(0);
  const multiplierRef = useRef(1);
  const gameIdRef = useRef<string | null>(null);
  const balanceRef = useRef(0);

  balanceRef.current = typeof user?.balance === 'number' ? user.balance : 0;
  multiplierRef.current = multiplier;
  gameIdRef.current = gameId;

  const startGameWithBet = useCallback(
    async (betAmount: number) => {
      if (startInFlightRef.current) return;
      setError(null);
      startInFlightRef.current = true;

      const prevBalance = balanceRef.current;
      // UI otimista no clique (padrão Crash)
      betAmountRef.current = betAmount;
      setGrid(Array(25).fill(false));
      setRevealed(Array(25).fill(false));
      setMultiplier(1.0);
      multiplierRef.current = 1;
      setLastPayout(0);
      setFairnessReveal(null);
      setFairnessCommit(null);
      setGameId(null);
      gameIdRef.current = null;
      setGameState('PLAYING');
      setUserBalance(Math.round((prevBalance - betAmount) * 100) / 100);
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
        gameIdRef.current = res.gameId;
        if (res.serverSeedHash) {
          setFairnessCommit({
            gameId: res.gameId,
            serverSeedHash: res.serverSeedHash,
            minesCount,
          });
        }
      } catch (e) {
        const code = e instanceof ApiError ? e.code : undefined;
        const msg =
          (code && ERROR_MAP[code]) ||
          (e instanceof ApiError ? e.message : 'Não foi possível iniciar');
        setError(msg);
        setUserBalance(prevBalance);
        setGameState('IDLE');
        setGameId(null);
        gameIdRef.current = null;
        betAmountRef.current = 0;
      } finally {
        startInFlightRef.current = false;
      }
    },
    [minesCount, setUserBalance]
  );

  const revealCell = useCallback(
    async (index: number) => {
      if (gameState !== 'PLAYING' || revealed[index] || !gameIdRef.current) return;
      if (revealInFlightRef.current.has(index)) return;

      revealInFlightRef.current.add(index);
      const gid = gameIdRef.current;

      // Flip otimista + som no clique
      setRevealed((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });
      playCrashSound('mines-diamond');

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
          body: JSON.stringify({ gameId: gid, index }),
        });

        if (typeof res.balance === 'number') setUserBalance(res.balance);

        if (res.hitMine && Array.isArray(res.minePositions) && res.minePositions.length > 0) {
          playCrashSound('mines-bomb');
          setGrid(applyMinePositions(res.minePositions));
          setGameState('GAME_OVER');
          setGameId(null);
          gameIdRef.current = null;
          setHistory((prev) => [0, ...prev].slice(0, 40));
          if (res.serverSeed && res.serverSeedHash) {
            setFairnessReveal({
              gameId: res.gameId ?? gid,
              serverSeed: res.serverSeed,
              serverSeedHash: res.serverSeedHash,
              minesCount,
              minePositions: res.minePositions,
            });
          }
          return;
        }

        if (res.won && res.gameOver) {
          playCrashSound('cashout');
          emitCoinBurst({ direction: 'in', count: 14 });
          if (Array.isArray(res.minePositions) && res.minePositions.length > 0) {
            setGrid(applyMinePositions(res.minePositions));
          }
          if (typeof res.multiplier === 'number') {
            setMultiplier(res.multiplier);
            multiplierRef.current = res.multiplier;
          }
          if (typeof res.payout === 'number') {
            setLastPayout(res.payout);
            setUserBalance(
              Math.round((balanceRef.current + res.payout) * 100) / 100
            );
          }
          setGameState('CASHOUT');
          setGameId(null);
          gameIdRef.current = null;
          setHistory((prev) => [res.multiplier ?? 1, ...prev].slice(0, 40));
          if (
            res.serverSeed &&
            res.serverSeedHash &&
            Array.isArray(res.minePositions) &&
            res.minePositions.length > 0
          ) {
            setFairnessReveal({
              gameId: res.gameId ?? gid,
              serverSeed: res.serverSeed,
              serverSeedHash: res.serverSeedHash,
              minesCount,
              minePositions: res.minePositions,
            });
          }
          return;
        }

        if (res.safe && typeof res.multiplier === 'number') {
          setMultiplier(res.multiplier);
          multiplierRef.current = res.multiplier;
        }
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Erro ao revelar';
        setError(msg);
        setRevealed((prev) => {
          const next = [...prev];
          next[index] = false;
          return next;
        });
      } finally {
        revealInFlightRef.current.delete(index);
      }
    },
    [gameState, revealed, minesCount, setUserBalance]
  );

  const cashout = useCallback(async () => {
    if (gameState !== 'PLAYING' || !gameIdRef.current) return;
    if (cashoutInFlightRef.current) return;

    cashoutInFlightRef.current = true;
    const gid = gameIdRef.current;
    const estimated =
      Math.round(betAmountRef.current * multiplierRef.current * 100) / 100;
    const prevState = gameState;
    const prevPayout = lastPayout;
    const prevBalance = balanceRef.current;

    // UI otimista no clique
    setLastPayout(estimated);
    setGameState('CASHOUT');
    setGameId(null);
    gameIdRef.current = null;
    setUserBalance(Math.round((prevBalance + estimated) * 100) / 100);
    playCrashSound('cashout');
    emitCoinBurst({ direction: 'in', count: 14 });

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
        body: JSON.stringify({ gameId: gid }),
      });
      if (typeof res.balance === 'number') setUserBalance(res.balance);
      if (Array.isArray(res.minePositions) && res.minePositions.length > 0) {
        setGrid(applyMinePositions(res.minePositions));
      }
      setMultiplier(res.multiplier);
      multiplierRef.current = res.multiplier;
      setLastPayout(res.payout);
      setHistory((prev) => [res.multiplier, ...prev].slice(0, 40));
      if (
        res.serverSeed &&
        res.serverSeedHash &&
        Array.isArray(res.minePositions) &&
        res.minePositions.length > 0
      ) {
        setFairnessReveal({
          gameId: res.gameId ?? gid,
          serverSeed: res.serverSeed,
          serverSeedHash: res.serverSeedHash,
          minesCount,
          minePositions: res.minePositions,
        });
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao retirar';
      setError(msg);
      setUserBalance(prevBalance);
      setLastPayout(prevPayout);
      setGameState(prevState);
      setGameId(gid);
      gameIdRef.current = gid;
    } finally {
      cashoutInFlightRef.current = false;
    }
  }, [gameState, lastPayout, minesCount, setUserBalance]);

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
