import { useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiError } from '../services/api';
import { generatePlinkoMultipliers } from '../games/plinko/plinkoMath';

export type PlinkoRisk = 'low' | 'medium' | 'high';

export interface PlinkoHistoryEntry {
  multiplier: number;
  bet: number;
  profit: number;
  at: number;
}

const PLINKO_HISTORY_KEY = 'tuaobet_plinko_history_v1';
const PLINKO_HISTORY_MAX = 100;

function loadPlinkoHistory(): PlinkoHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(PLINKO_HISTORY_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p
      .filter(
        (x): x is PlinkoHistoryEntry =>
          !!x &&
          typeof x === 'object' &&
          typeof (x as PlinkoHistoryEntry).multiplier === 'number' &&
          typeof (x as PlinkoHistoryEntry).bet === 'number'
      )
      .map((x, i) => ({
        ...x,
        profit: typeof x.profit === 'number' ? x.profit : 0,
        at: typeof x.at === 'number' ? x.at : Date.now() - i * 1000,
      }))
      .slice(0, PLINKO_HISTORY_MAX);
  } catch {
    return [];
  }
}

function persistPlinkoHistory(h: PlinkoHistoryEntry[]) {
  try {
    sessionStorage.setItem(PLINKO_HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* ignore quota / private mode */
  }
}

export interface PlinkoBall {
  id: string;
  bet: number;
  path: number[];
  finalSlot: number;
  multiplier?: number;
  payout?: number;
}

export const PLINKO_ROWS_MIN = 8;
export const PLINKO_ROWS_MAX = 16;

export function usePlinkoGame() {
  const { setUserBalance, user } = useAuth();
  const balanceRef = useRef(typeof user?.balance === 'number' ? user.balance : 0);
  balanceRef.current = typeof user?.balance === 'number' ? user.balance : 0;
  const dropInFlightRef = useRef(0);

  const [activeBalls, setActiveBalls] = useState<PlinkoBall[]>([]);
  const [history, setHistory] = useState<PlinkoHistoryEntry[]>(() => loadPlinkoHistory());
  const [rows, setRows] = useState(16);
  const [risk, setRisk] = useState<PlinkoRisk>('medium');
  const [error, setError] = useState<string | null>(null);

  const multipliers = useMemo(() => generatePlinkoMultipliers(rows, risk), [rows, risk]);

  const dropBall = useCallback(
    async (betAmount: number) => {
      // Anti double-drop em cliques rápidos (permite várias bolas em voo sequenciais)
      if (dropInFlightRef.current > 3) return;
      setError(null);

      const prevBalance = balanceRef.current;
      if (prevBalance < betAmount) {
        setError('Saldo insuficiente');
        return;
      }

      // Débito otimista no clique
      setUserBalance(Math.round((prevBalance - betAmount) * 100) / 100);
      balanceRef.current = Math.round((prevBalance - betAmount) * 100) / 100;
      dropInFlightRef.current += 1;

      try {
        const data = await apiFetch<{
          path: number[];
          finalSlot: number;
          multiplier: number;
          payout: number;
          balance?: number;
        }>('/api/games/plinko/drop', {
          method: 'POST',
          body: JSON.stringify({ betAmount, rows, risk }),
        });

        // Com várias bolas em voo, o balance do servidor pode estar stale;
        // credita só o payout local (stake já foi debitado no clique).
        if (typeof data.balance === 'number' && dropInFlightRef.current === 1) {
          setUserBalance(data.balance);
          balanceRef.current = data.balance;
        } else {
          const next = Math.round((balanceRef.current + data.payout) * 100) / 100;
          setUserBalance(next);
          balanceRef.current = next;
        }

        const newBall: PlinkoBall = {
          id: crypto.randomUUID(),
          bet: betAmount,
          path: data.path,
          finalSlot: data.finalSlot,
          multiplier: data.multiplier,
          payout: data.payout,
        };
        setActiveBalls((prev) => [...prev, newBall]);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Não foi possível apostar';
        setError(msg);
        setUserBalance(prevBalance);
        balanceRef.current = prevBalance;
      } finally {
        dropInFlightRef.current = Math.max(0, dropInFlightRef.current - 1);
      }
    },
    [rows, risk, setUserBalance]
  );

  const handleBallFinish = useCallback((ballId: string, slotIndex: number) => {
    setActiveBalls((prev) => {
      const ball = prev.find((b) => b.id === ballId);
      if (!ball) return prev;

      const mult = ball.multiplier ?? multipliers[slotIndex] ?? 0;
      const gross = ball.payout ?? ball.bet * mult;
      const profit = gross - ball.bet;

      setHistory((h) => {
        const entry: PlinkoHistoryEntry = {
          multiplier: mult,
          bet: ball.bet,
          profit,
          at: Date.now(),
        };
        const next = [entry, ...h].slice(0, PLINKO_HISTORY_MAX);
        persistPlinkoHistory(next);
        return next;
      });

      return prev.filter((b) => b.id !== ballId);
    });
  }, [multipliers]);

  return {
    activeBalls,
    history,
    rows,
    setRows,
    risk,
    setRisk,
    multipliers,
    dropBall,
    handleBallFinish,
    error,
  };
}
