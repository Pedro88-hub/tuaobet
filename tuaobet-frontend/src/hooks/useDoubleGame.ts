import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../services/socket';

export type DoubleColor = 'red' | 'white' | 'black';

export interface DoublePlayer {
  id: string;
  username: string;
  name?: string;
  amount: number;
  color: DoubleColor;
  winAmount?: number;
}

interface HistoryItem {
  color: DoubleColor;
  number: number;
}

export type DoubleFairnessCommit = { roundId: number; serverSeedHash: string };

export type DoubleFairnessReveal = {
  roundId: number;
  resultNumber: number;
  color: DoubleColor;
  serverSeed?: string;
  serverSeedHash?: string;
};

export function useDoubleGame() {
  const [gameState, setGameState] = useState<'WAITING' | 'SPINNING' | 'RESULT'>('WAITING');
  const [countdown, setCountdown] = useState(12);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bets, setBets] = useState<DoublePlayer[]>([]);
  const [result, setResult] = useState<{ color: DoubleColor; number: number } | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [fairnessCommit, setFairnessCommit] = useState<DoubleFairnessCommit | null>(null);
  const [fairnessReveal, setFairnessReveal] = useState<DoubleFairnessReveal | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const requestDoubleSync = () => {
      socket.emit('double:sync');
    };

    socket.on('double:history', (data: HistoryItem[]) => setHistory(data));

    socket.on('double:commit', (data: DoubleFairnessCommit) => {
      setFairnessCommit(data);
    });

    socket.on(
      'double:state',
      (data: {
        state: 'WAITING' | 'SPINNING' | 'RESULT';
        countdown: number;
        roundId?: number;
        serverSeedHash?: string;
      }) => {
        setGameState(data.state);
        setCountdown(data.countdown);
        if (data.state === 'WAITING') {
          setResult(null);
        }
        if (data.serverSeedHash && data.roundId != null) {
          setFairnessCommit({ roundId: data.roundId, serverSeedHash: data.serverSeedHash });
        }
      }
    );

    socket.on('double:countdown', (count: number) => {
      setCountdown(count);
      setGameState('WAITING');
    });

    socket.on('double:bets', (serverBets: DoublePlayer[]) => {
      setBets(serverBets);
    });

    socket.on('double:new-bet', (bet: DoublePlayer) => {
      setBets((prev) => [...prev, bet]);
    });

    socket.on('double:spin', (data: { resultNumber: number; color: DoubleColor }) => {
      setGameState('SPINNING');
      setResult({ number: data.resultNumber, color: data.color });
    });

    socket.on(
      'double:result',
      (data: {
        resultNumber: number;
        color: DoubleColor;
        history: HistoryItem[];
        winners?: { username: string; winAmount: number }[];
        roundId?: number;
        serverSeed?: string;
        serverSeedHash?: string;
      }) => {
        setGameState('RESULT');
        setHistory(data.history);
        if (
          data.roundId != null &&
          data.serverSeed &&
          data.serverSeedHash
        ) {
          setFairnessReveal({
            roundId: data.roundId,
            resultNumber: data.resultNumber,
            color: data.color,
            serverSeed: data.serverSeed,
            serverSeedHash: data.serverSeedHash,
          });
        }
      }
    );

    socket.on('double:error', (data: { code?: string }) => {
      const map: Record<string, string> = {
        AUTH: 'Faça login para apostar.',
        CLOSED: 'Apostas fechadas.',
        INVALID: 'Dados inválidos.',
        INSUFFICIENT_BALANCE: 'Saldo insuficiente.',
        MIN_BET: 'Valor abaixo do mínimo.',
        MAX_BET: 'Valor acima do máximo.',
        NO_BET: 'Nenhuma aposta para cancelar.',
        ACCOUNT_BLOCKED: 'Conta bloqueada.',
      };
      setLastError(map[data.code ?? ''] || data.code || 'Erro');
    });

    socket.on('double:bet-accepted', () => {
      setLastError(null);
    });

    socket.on('double:bet-cancelled', () => {
      setLastError(null);
    });

    socket.on('connect', requestDoubleSync);
    requestDoubleSync();

    return () => {
      socket.off('connect', requestDoubleSync);
      socket.off('double:history');
      socket.off('double:commit');
      socket.off('double:state');
      socket.off('double:countdown');
      socket.off('double:bets');
      socket.off('double:new-bet');
      socket.off('double:spin');
      socket.off('double:result');
      socket.off('double:error');
      socket.off('double:bet-accepted');
      socket.off('double:bet-cancelled');
    };
  }, []);

  const placeBet = useCallback((amount: number, color: DoubleColor) => {
    setLastError(null);
    getSocket().emit('double:bet', { amount, color });
  }, []);

  const cancelBet = useCallback(() => {
    setLastError(null);
    getSocket().emit('double:cancel');
  }, []);

  return {
    gameState,
    countdown,
    result,
    history,
    bets,
    placeBet,
    cancelBet,
    lastError,
    fairnessCommit,
    fairnessReveal,
  };
}
