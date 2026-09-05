import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiError } from '../services/api';

export type GameState = 'IDLE' | 'PLAYING' | 'CASHOUT' | 'GAME_OVER';

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

  const startGameWithBet = useCallback(
    async (betAmount: number) => {
      setError(null);
      try {
        const res = await apiFetch<{ gameId: string; balance?: number }>('/api/games/mines/start', {
          method: 'POST',
          body: JSON.stringify({ minesCount, betAmount }),
        });
        if (typeof res.balance === 'number') setUserBalance(res.balance);
        setGameId(res.gameId);
        setGrid(Array(25).fill(false));
        setRevealed(Array(25).fill(false));
        setMultiplier(1.0);
        setGameState('PLAYING');
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Não foi possível iniciar';
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
          balance?: number;
        }>('/api/games/mines/reveal', {
          method: 'POST',
          body: JSON.stringify({ gameId, index }),
        });

        if (typeof res.balance === 'number') setUserBalance(res.balance);

        if (res.hitMine && res.minePositions) {
          const newGrid = Array(25).fill(false);
          res.minePositions.forEach((i) => {
            newGrid[i] = true;
          });
          setGrid(newGrid);
          setRevealed(Array(25).fill(true));
          setGameState('GAME_OVER');
          setGameId(null);
          setHistory((prev) => [0, ...prev].slice(0, 10));
          return;
        }

        if (res.won && res.gameOver) {
          const newRev = [...revealed];
          newRev[index] = true;
          setRevealed(newRev);
          if (typeof res.multiplier === 'number') setMultiplier(res.multiplier);
          setGameState('CASHOUT');
          setGameId(null);
          setHistory((prev) => [(res.multiplier ?? 1), ...prev].slice(0, 10));
          return;
        }

        if (res.safe) {
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
    [gameState, revealed, gameId, setUserBalance]
  );

  const cashout = useCallback(async () => {
    if (gameState !== 'PLAYING' || !gameId) return;

    try {
      const res = await apiFetch<{ multiplier: number; payout: number; balance?: number }>(
        '/api/games/mines/cashout',
        {
          method: 'POST',
          body: JSON.stringify({ gameId }),
        }
      );
      if (typeof res.balance === 'number') setUserBalance(res.balance);
      setMultiplier(res.multiplier);
      setGameState('CASHOUT');
      setGameId(null);
      setHistory((prev) => [res.multiplier, ...prev].slice(0, 10));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao retirar';
      setError(msg);
    }
  }, [gameState, gameId, setUserBalance]);

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
    startGameWithBet,
    revealCell,
    cashout,
  };
}
