import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket';
import { emitCoinBurst } from '../lib/gameFx';
import { playCrashSound, stopCrashSound } from '../lib/crashSounds';

export type GameState = 'IDLE' | 'COUNTDOWN' | 'RUNNING' | 'CRASHED';

export type CrashFairnessCommit = { roundId: number; serverSeedHash: string };

export type CrashFairnessReveal = {
  roundId: number;
  crashPoint: number;
  serverSeed?: string;
  serverSeedHash?: string;
};

type PendingAction = 'bet' | 'cashout' | null;

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
  const [serverCashoutMultiplier, setServerCashoutMultiplier] = useState(0);
  const [serverBetAmount, setServerBetAmount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [fairnessCommit, setFairnessCommit] = useState<CrashFairnessCommit | null>(null);
  const [fairnessReveal, setFairnessReveal] = useState<CrashFairnessReveal | null>(null);

  const pendingActionRef = useRef<PendingAction>(null);
  const multiplierRef = useRef(multiplier);
  const betAmountRef = useRef(serverBetAmount);
  const serverCashedOutRef = useRef(false);
  const cashoutInFlightRef = useRef(false);

  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);

  useEffect(() => {
    betAmountRef.current = serverBetAmount;
  }, [serverBetAmount]);

  useEffect(() => {
    serverCashedOutRef.current = serverCashedOut;
  }, [serverCashedOut]);

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
        if (data.state === 'RUNNING') {
          stopCrashSound('bet');
        }
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
          cashoutInFlightRef.current = false;
          serverCashedOutRef.current = false;
          setServerCashedOut(false);
          setServerPayout(0);
          setServerCashoutMultiplier(0);
        }
      }
    );

    socket.on('crash:countdown', (count: number) => {
      setCountdown(count);
      setGameState('COUNTDOWN');
    });

    socket.on('crash:tick', (val: number) => {
      setGameState((prev) => (prev === 'RUNNING' ? prev : 'RUNNING'));
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
        cashoutInFlightRef.current = false;
        setGameState('CRASHED');
        setMultiplier(data.crashPoint);
        if (data.history) setHistory(data.history);
        setHasServerBet(false);
        serverCashedOutRef.current = false;
        setServerCashedOut(false);
        setServerBetAmount(0);
        playCrashSound('crash');
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
      cashoutInFlightRef.current = false;
      setHasServerBet(true);
      if (data?.amount != null && Number.isFinite(data.amount)) {
        setServerBetAmount(data.amount);
      }
      serverCashedOutRef.current = false;
      setServerCashedOut(false);
      setServerPayout(0);
      setServerCashoutMultiplier(0);
      setLastError(null);
    });

    socket.on('crash:cashout-ok', (data: { multiplier: number; payout: number }) => {
      pendingActionRef.current = null;
      cashoutInFlightRef.current = false;
      serverCashedOutRef.current = true;
      setServerCashedOut(true);
      setServerPayout(data.payout);
      setServerCashoutMultiplier(data.multiplier);
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
      } else if (pending === 'cashout') {
        cashoutInFlightRef.current = false;
        // NO_BET no 2º emit = já sacou no servidor; não reabrir o botão Sacar.
        if (code !== 'NO_BET') {
          serverCashedOutRef.current = false;
          setServerCashedOut(false);
          setServerPayout(0);
          setServerCashoutMultiplier(0);
        } else {
          return;
        }
      }

      const map: Record<string, string> = {
        AUTH: 'Faça login para apostar.',
        CLOSED: 'Apostas fechadas para esta rodada.',
        ALREADY_BET: 'Você já apostou nesta rodada.',
        INSUFFICIENT_BALANCE: 'Saldo insuficiente.',
        MIN_BET: 'Valor abaixo do mínimo.',
        MAX_BET: 'Valor acima do máximo.',
        NO_BET: 'Nenhuma aposta ativa.',
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
      socket.off('crash:cashout-ok');
      socket.off('crash:error');
    };
  }, []);

  const joinGame = useCallback((amount: number, _state: GameState) => {
    setLastError(null);
    pendingActionRef.current = 'bet';
    cashoutInFlightRef.current = false;
    setServerBetAmount(amount);
    serverCashedOutRef.current = false;
    setServerCashedOut(false);
    setServerPayout(0);
    setServerCashoutMultiplier(0);
    setHasServerBet(true);
    playCrashSound('bet');
    emitCoinBurst({ direction: 'out' });
    getSocket().emit('crash:bet', { amount });
  }, []);

  const cashout = useCallback(() => {
    if (serverCashedOutRef.current || cashoutInFlightRef.current) return;
    setLastError(null);
    pendingActionRef.current = 'cashout';
    cashoutInFlightRef.current = true;
    const estimated =
      Math.round(betAmountRef.current * multiplierRef.current * 100) / 100;
    serverCashedOutRef.current = true;
    setServerCashedOut(true);
    if (estimated > 0) setServerPayout(estimated);
    setServerCashoutMultiplier(multiplierRef.current);
    playCrashSound('cashout');
    emitCoinBurst({ direction: 'in', count: 10 });
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
    serverCashoutMultiplier,
    serverBetAmount,
    lastError,
    fairnessCommit,
    fairnessReveal,
    joinGame,
    cashout,
  };
}
