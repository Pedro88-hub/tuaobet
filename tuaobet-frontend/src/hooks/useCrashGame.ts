import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../services/socket';

export type GameState = 'IDLE' | 'COUNTDOWN' | 'RUNNING' | 'CRASHED';

export type CrashFairnessCommit = { roundId: number; serverSeedHash: string };

export type CrashFairnessReveal = {
  roundId: number;
  crashPoint: number;
  serverSeed?: string;
  serverSeedHash?: string;
};

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
  const [lastError, setLastError] = useState<string | null>(null);
  const [fairnessCommit, setFairnessCommit] = useState<CrashFairnessCommit | null>(null);
  const [fairnessReveal, setFairnessReveal] = useState<CrashFairnessReveal | null>(null);

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

    socket.on('crash:state', (data: { state: GameState; countdown: number }) => {
      setGameState(data.state);
      setCountdown(data.countdown ?? 0);
      if (data.state === 'IDLE' || data.state === 'COUNTDOWN') {
        setMultiplier(1.0);
      }
      if (data.state === 'COUNTDOWN' && data.countdown === 6) {
        setHasServerBet(false);
        setServerCashedOut(false);
        setServerPayout(0);
      }
    });

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
        setGameState('CRASHED');
        setMultiplier(data.crashPoint);
        if (data.history) setHistory(data.history);
        setHasServerBet(false);
        setServerCashedOut(false);
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

    socket.on('crash:bet-accepted', () => {
      setHasServerBet(true);
      setLastError(null);
    });

    socket.on('crash:cashout-ok', (data: { multiplier: number; payout: number }) => {
      setServerCashedOut(true);
      setServerPayout(data.payout);
      setLastError(null);
    });

    socket.on('crash:error', (data: { code?: string }) => {
      const map: Record<string, string> = {
        AUTH: 'Faça login para apostar.',
        CLOSED: 'Apostas fechadas para esta rodada.',
        ALREADY_BET: 'Você já apostou nesta rodada.',
        INSUFFICIENT_BALANCE: 'Saldo insuficiente.',
        MIN_BET: 'Valor abaixo do mínimo.',
        MAX_BET: 'Valor acima do máximo.',
        NO_BET: 'Sem aposta ativa.',
        NO_GAME: 'Rodada não está em andamento.',
        TOO_LATE: 'Muito tarde para retirar.',
        SERVER: 'Erro no servidor. Tente de novo.',
      };
      setLastError(map[data.code ?? ''] || data.code || 'Erro');
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

  const joinGame = useCallback((amount: number) => {
    setLastError(null);
    getSocket().emit('crash:bet', { amount });
  }, []);

  const cashout = useCallback(() => {
    setLastError(null);
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
    cashout,
  };
}
