import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiError } from '../services/api';
import { isStakeValid, MIN_BET } from '../lib/betLimits';

export interface DiceBet {
  id: string;
  user: string;
  time: string;
  betAmount: number;
  multiplier: number;
  payout: number;
  win: boolean;
  rollValue: number;
  target: number;
}

const FAKE_USERS = [
  'CryptoKing',
  'LuckyDice',
  'Roller99',
  'BetMaster',
  'Alice_W',
  'JohnDoe',
  'Winner2026',
  'HighRoller',
];

export function useDiceGame() {
  const { setUserBalance, user } = useAuth();
  const balance = typeof user?.balance === 'number' ? user.balance : 0;
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  const [betAmount, setBetAmount] = useState<string>('');
  const [rollUnder, setRollUnder] = useState<number>(50);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [liveBets, setLiveBets] = useState<DiceBet[]>([]);
  const [instantBet, setInstantBet] = useState(true);
  const [betMode, setBetMode] = useState<'manual' | 'auto'>('manual');
  const [error, setError] = useState<string | null>(null);

  const winChance = rollUnder;
  const multiplier = 99 / rollUnder;
  const potentialWin = parseFloat(betAmount || '0') * multiplier;

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.4) return;
      const isWin = Math.random() > 0.5;
      const fakeBet = Math.random() * 100 + 10;
      const fakeTarget = Math.floor(Math.random() * 90) + 5;
      const fakeMult = 99 / fakeTarget;
      const fakeRoll = isWin
        ? Math.random() * fakeTarget
        : fakeTarget + Math.random() * (100 - fakeTarget);

      const newBet: DiceBet = {
        id: Math.random().toString(36).slice(2, 11),
        user: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        betAmount: fakeBet,
        multiplier: fakeMult,
        payout: isWin ? fakeBet * fakeMult : 0,
        win: isWin,
        rollValue: fakeRoll,
        target: fakeTarget,
      };
      setLiveBets((prev) => [newBet, ...prev].slice(0, 15));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const rollDice = useCallback(async () => {
    if (isRolling) return;
    setError(null);
    const amount = parseFloat(betAmount.trim() || '');
    if (!isStakeValid(amount, balanceRef.current)) {
      setError(
        !Number.isFinite(amount) || amount <= 0
          ? 'Indique um valor de aposta válido'
          : amount < MIN_BET
            ? 'Mínimo R$ 0,50'
            : 'Saldo insuficiente'
      );
      return;
    }

    const prevBalance = balanceRef.current;
    setIsRolling(true);
    // Débito otimista no clique — sem delay artificial
    setUserBalance(Math.round((prevBalance - amount) * 100) / 100);

    try {
      const data = await apiFetch<{
        roll: number;
        rollUnder: number;
        won: boolean;
        multiplier: number;
        payout: number;
        balance?: number;
      }>('/api/games/dice/roll', {
        method: 'POST',
        body: JSON.stringify({ betAmount: amount, rollUnder }),
      });

      if (typeof data.balance === 'number') {
        setUserBalance(data.balance);
      } else if (data.won && data.payout > 0) {
        setUserBalance(Math.round((prevBalance - amount + data.payout) * 100) / 100);
      }

      setLastResult(data.roll);
      setWin(data.won);

      const myBet: DiceBet = {
        id: crypto.randomUUID(),
        user: 'Você',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        betAmount: amount,
        multiplier: data.multiplier,
        payout: data.payout,
        win: data.won,
        rollValue: data.roll,
        target: data.rollUnder,
      };
      setLiveBets((prev) => [myBet, ...prev].slice(0, 15));
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao jogar';
      setError(msg);
      setUserBalance(prevBalance);
    } finally {
      setIsRolling(false);
    }
  }, [betAmount, rollUnder, isRolling, setUserBalance]);

  return {
    betAmount,
    setBetAmount,
    rollUnder,
    setRollUnder,
    isRolling,
    lastResult,
    win,
    liveBets,
    multiplier,
    winChance,
    potentialWin,
    rollDice,
    instantBet,
    setInstantBet,
    betMode,
    setBetMode,
    error,
  };
}
