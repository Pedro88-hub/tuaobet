import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket';

export type GameState = 'IDLE' | 'COUNTDOWN' | 'RUNNING' | 'CRASHED';

export type CrashFairnessCommit = { roundId: number; serverSeedHash: string };

export type CrashFairnessReveal = {
  roundId: number;
  crashPoint: number;
  serverSeed?: string;
  serverSeedHash?: string;
};

type PendingAction = 'bet' | 'cancel' | 'cashout' | null;

export function useCrashGame() {
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [multiplier, setMultiplier] = useState(1.0);
  const [countdown, setCountdown] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [players, setPlayers] = useState<
    {
      id: string;
      name: string;
      bet: number;
      cashout?: number;
      payout?: number;
      busted?: boolean;
    }[]
  >([]);
  const [hasServerBet, setHasServerBet] = useState(false);
  const [serverCashedOut, setServerCashedOut] = useState(false);
  const [serverPayout, setServerPayout] = useState(0);
  const [serverBetAmount, setServerBetAmount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [fairnessCommit, setFairnessCommit] = useState<CrashFairnessCommit | null>(null);
  const [fairnessReveal, setFairnessReveal] = useState<CrashFairnessReveal | null>(null);

  const pendingActionRef = useRef<PendingAction>(null);
  const multiplierRef = useRef(multiplier);
  const betAmountRef = useRef(serverBetAmount);

  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);

  useEffect(() => {
    betAmountRef.current = serverBetAmount;
  }, [serverBetAmount]);

  useEffect(() => {
    const socket = getSocket();

    const requestCrashSync = () => {
      socket.emit('crash:sync');
    };

    socket.on('crash:history', (serverHistory: number[]) => {
      setHistory(serverHistory);
    });

    socket.on('crash:commit', (data: CrashFairnessCommit) => {
      setFairnessCommit(data);
    });

    socket.on(
      'crash:state',
      (data: {
        state: GameState;
        countdown: number;
        lastMultiplier?: number;
        roundId?: number;
      }) => {
        setGameState(data.state);
        setCountdown(data.countdown ?? 0);
        if (data.state === 'IDLE' || data.state === 'COUNTDOWN') {
          setMultiplier(1.0);
        } else if (
          (data.state === 'RUNNING' || data.state === 'CRASHED') &&
          data.lastMultiplier != null
        ) {
          setMultiplier(data.lastMultiplier);
        }
        if (data.state === 'COUNTDOWN' && data.countdown === 6) {
          pendingActionRef.current = null;
          setHasServerBet(false);
          setServerCashedOut(false);
          setServerPayout(0);
          setServerBetAmount(0);
        }
      }
    );

    socket.on('crash:countdown', (count: number) => {
      setCountdown(count);
      setGameState('COUNTDOWN');
    });

    socket.on('crash:tick', (val: number) => {
      setGameState('RUNNING');
      setMultiplier(val);
    });

    socket.on(
      'crash:exploded',
      (data: {
        crashPoint: number;
        history: number[];
        roundId?: number;
        serverSeed?: string;
        serverSeedHash?: string;
      }) => {
        pendingActionRef.current = null;
        setGameState('CRASHED');
        setMultiplier(data.crashPoint);
        if (data.history) setHistory(data.history);
        setHasServerBet(false);
        setServerCashedOut(false);
        setServerBetAmount(0);
        if (
          data.roundId != null &&
          data.serverSeed &&
          data.serverSeedHash
        ) {
          setFairnessReveal({
            roundId: data.roundId,
            crashPoint: data.crashPoint,
            serverSeed: data.serverSeed,
            serverSeedHash: data.serverSeedHash,
          });
        }
      }
    );

    socket.on(
      'crash:bets',
      (
        bets: {
          id: string;
          name: string;
          bet: number;
          cashout?: number;
          payout?: number;
          busted?: boolean;
        }[]
      ) => {
        setPlayers(bets);
      }
    );

    socket.on(
      'crash:new-bet',
      (bet: { id: string; name: string; bet: number; cashout?: number; payout?: number; busted?: boolean }) => {
        setPlayers((prev) => [...prev, bet]);
      }
    );

    socket.on('crash:bet-accepted', (data?: { amount?: number }) => {
      pendingActionRef.current = null;
      setHasServerBet(true);
      if (data?.amount != null && Number.isFinite(data.amount)) {
        setServerBetAmount(data.amount);
      }
      setLastError(null);
    });

    socket.on('crash:bet-cancelled', () => {
      pendingActionRef.current = null;
      setHasServerBet(false);
      setServerCashedOut(false);
      setServerPayout(0);
      setServerBetAmount(0);
      setLastError(null);
    });

    socket.on('crash:cashout-ok', (data: { multiplier: number; payout: number }) => {
      pendingActionRef.current = null;
      setServerCashedOut(true);
      setServerPayout(data.payout);
      setLastError(null);
    });

    socket.on('crash:error', (data: { code?: string }) => {
      const code = data.code ?? '';
      const pending = pendingActionRef.current;
      pendingActionRef.current = null;

      if (pending === 'bet') {
        if (code === 'ALREADY_BET') {
          setHasServerBet(true);
        } else {
          setHasServerBet(false);
          setServerBetAmount(0);
        }
      } else if (pending === 'cancel') {
        if (code !== 'NO_BET') {
          setHasServerBet(true);
        }
      } else if (pending === 'cashout') {
        setServerCashedOut(false);
        setServerPayout(0);
      }

      const map: Record<string, string> = {
        AUTH: 'Faça login para apostar.',
        CLOSED: 'Apostas fechadas para esta rodada.',
        ALREADY_BET: 'Você já apostou nesta rodada.',
        INSUFFICIENT_BALANCE: 'Saldo insuficiente.',
        MIN_BET: 'Valor abaixo do mínimo.',
        MAX_BET: 'Valor acima do máximo.',
        NO_BET: 'Nenhuma aposta para cancelar.',
        NO_GAME: 'Rodada não está em andamento.',
        TOO_LATE: 'Muito tarde para sacar.',
        ACCOUNT_BLOCKED: 'Conta bloqueada.',
        SERVER: 'Erro no servidor. Tente de novo.',
      };
      setLastError(map[code] || code || 'Erro');
    });

    socket.on('connect', requestCrashSync);
    requestCrashSync();

    return () => {
      socket.off('connect', requestCrashSync);
      socket.off('crash:history');
      socket.off('crash:commit');
      socket.off('crash:state');
      socket.off('crash:countdown');
      socket.off('crash:tick');
      socket.off('crash:exploded');
      socket.off('crash:bets');
      socket.off('crash:new-bet');
      socket.off('crash:bet-accepted');
      socket.off('crash:bet-cancelled');
      socket.off('crash:cashout-ok');
      socket.off('crash:error');
    };
  }, []);

  const joinGame = useCallback((amount: number) => {
    setLastError(null);
    pendingActionRef.current = 'bet';
    setHasServerBet(true);
    setServerBetAmount(amount);
    setServerCashedOut(false);
    setServerPayout(0);
    getSocket().emit('crash:bet', { amount });
  }, []);

  const cancelBet = useCallback(() => {
    setLastError(null);
    pendingActionRef.current = 'cancel';
    setHasServerBet(false);
    setServerBetAmount(0);
    getSocket().emit('crash:cancel');
  }, []);

  const cashout = useCallback(() => {
    setLastError(null);
    pendingActionRef.current = 'cashout';
    const estimated =
      Math.round(betAmountRef.current * multiplierRef.current * 100) / 100;
    setServerCashedOut(true);
    if (estimated > 0) setServerPayout(estimated);
    getSocket().emit('crash:cashout');
  }, []);

  return {
    gameState,
    multiplier,
    countdown,
    history,
    players,
    hasServerBet,
    serverCashedOut,
    serverPayout,
    lastError,
    fairnessCommit,
    fairnessReveal,
    joinGame,
    cancelBet,
    cashout,
  };
}
