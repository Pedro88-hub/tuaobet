import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket';
import { emitCoinBurst } from '../lib/gameFx';
import { playCrashSound, stopCrashSound } from '../lib/crashSounds';

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

export type DoubleGameState = 'WAITING' | 'SPINNING' | 'RESULT';

type PendingAction = 'bet' | 'cancel' | null;

export function useDoubleGame() {
  const [gameState, setGameState] = useState<DoubleGameState>('WAITING');
  const [countdown, setCountdown] = useState(12);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bets, setBets] = useState<DoublePlayer[]>([]);
  const [result, setResult] = useState<{ color: DoubleColor; number: number } | null>(null);
  const [hasServerBet, setHasServerBet] = useState(false);
  const [queuedNextBet, setQueuedNextBet] = useState(false);
  const [serverBetAmount, setServerBetAmount] = useState(0);
  const [serverBetColor, setServerBetColor] = useState<DoubleColor | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [fairnessCommit, setFairnessCommit] = useState<DoubleFairnessCommit | null>(null);
  const [fairnessReveal, setFairnessReveal] = useState<DoubleFairnessReveal | null>(null);

  const pendingActionRef = useRef<PendingAction>(null);
  const betAmountRef = useRef(serverBetAmount);
  const queuedNextBetRef = useRef(false);
  const hasServerBetRef = useRef(false);
  const cancelSnapshotRef = useRef<{
    hasServerBet: boolean;
    queuedNextBet: boolean;
    serverBetAmount: number;
    serverBetColor: DoubleColor | null;
  } | null>(null);
  const serverBetColorRef = useRef<DoubleColor | null>(null);

  useEffect(() => {
    betAmountRef.current = serverBetAmount;
  }, [serverBetAmount]);

  useEffect(() => {
    queuedNextBetRef.current = queuedNextBet;
  }, [queuedNextBet]);

  useEffect(() => {
    hasServerBetRef.current = hasServerBet;
  }, [hasServerBet]);

  useEffect(() => {
    serverBetColorRef.current = serverBetColor;
  }, [serverBetColor]);

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
        state: DoubleGameState;
        countdown: number;
        roundId?: number;
        serverSeedHash?: string;
        resultNumber?: number;
        color?: DoubleColor;
      }) => {
        setGameState(data.state);
        setCountdown(data.countdown ?? 0);
        if (data.state === 'WAITING') {
          setResult(null);
          pendingActionRef.current = null;
          // Fila promovida no servidor → bet-accepted; não apagar stake se já estava enfileirada.
          if (queuedNextBetRef.current) {
            setQueuedNextBet(false);
            queuedNextBetRef.current = false;
            setHasServerBet(true);
          }
        } else if (
          (data.state === 'SPINNING' || data.state === 'RESULT') &&
          data.resultNumber != null &&
          data.color
        ) {
          setResult({ number: data.resultNumber, color: data.color });
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
      stopCrashSound('bet');
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
        // Mantém fila da próxima rodada; limpa só a aposta da rodada que acabou.
        setHasServerBet(false);
        if (!queuedNextBetRef.current) {
          setServerBetAmount(0);
          setServerBetColor(null);
        }
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

    socket.on('double:bet-accepted', (data?: { amount?: number; color?: DoubleColor }) => {
      pendingActionRef.current = null;
      setQueuedNextBet(false);
      queuedNextBetRef.current = false;
      setHasServerBet(true);
      if (data?.amount != null && Number.isFinite(data.amount)) {
        setServerBetAmount(data.amount);
      }
      if (data?.color) {
        setServerBetColor(data.color);
      }
      setLastError(null);
    });

    socket.on('double:bet-queued', (data?: { amount?: number; color?: DoubleColor }) => {
      pendingActionRef.current = null;
      setQueuedNextBet(true);
      queuedNextBetRef.current = true;
      setHasServerBet(false);
      if (data?.amount != null && Number.isFinite(data.amount)) {
        setServerBetAmount(data.amount);
      }
      if (data?.color) {
        setServerBetColor(data.color);
      }
      setLastError(null);
    });

    socket.on('double:bet-cancelled', () => {
      pendingActionRef.current = null;
      cancelSnapshotRef.current = null;
      setHasServerBet(false);
      setQueuedNextBet(false);
      queuedNextBetRef.current = false;
      setServerBetAmount(0);
      setServerBetColor(null);
      setLastError(null);
    });

    socket.on('double:error', (data: { code?: string }) => {
      const code = data.code ?? '';
      const pending = pendingActionRef.current;
      pendingActionRef.current = null;

      if (pending === 'bet') {
        if (code === 'ALREADY_BET') {
          setHasServerBet(true);
          setQueuedNextBet(false);
          queuedNextBetRef.current = false;
        } else {
          setHasServerBet(false);
          setQueuedNextBet(false);
          queuedNextBetRef.current = false;
          setServerBetAmount(0);
          setServerBetColor(null);
        }
      } else if (pending === 'cancel') {
        if (code !== 'NO_BET') {
          const snap = cancelSnapshotRef.current;
          if (snap) {
            setHasServerBet(snap.hasServerBet);
            setQueuedNextBet(snap.queuedNextBet);
            queuedNextBetRef.current = snap.queuedNextBet;
            setServerBetAmount(snap.serverBetAmount);
            setServerBetColor(snap.serverBetColor);
          }
        }
        cancelSnapshotRef.current = null;
      }

      const map: Record<string, string> = {
        AUTH: 'Faça login para apostar.',
        CLOSED: 'Apostas fechadas.',
        INVALID: 'Dados inválidos.',
        ALREADY_BET: 'Você já apostou nesta rodada.',
        INSUFFICIENT_BALANCE: 'Saldo insuficiente.',
        MIN_BET: 'Valor abaixo do mínimo.',
        MAX_BET: 'Valor acima do máximo.',
        NO_BET: 'Nenhuma aposta para cancelar.',
        ACCOUNT_BLOCKED: 'Conta bloqueada.',
        SERVER: 'Erro no servidor. Tente de novo.',
      };
      setLastError(map[code] || code || 'Erro');
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
      socket.off('double:bet-queued');
      socket.off('double:bet-cancelled');
    };
  }, []);

  const placeBet = useCallback((amount: number, color: DoubleColor, state: DoubleGameState) => {
    setLastError(null);
    pendingActionRef.current = 'bet';
    setServerBetAmount(amount);
    setServerBetColor(color);
    if (state === 'WAITING') {
      setHasServerBet(true);
      setQueuedNextBet(false);
      queuedNextBetRef.current = false;
    } else {
      setHasServerBet(false);
      setQueuedNextBet(true);
      queuedNextBetRef.current = true;
    }
    playCrashSound('bet');
    emitCoinBurst({ direction: 'out' });
    getSocket().emit('double:bet', { amount, color });
  }, []);

  const cancelBet = useCallback(() => {
    setLastError(null);
    pendingActionRef.current = 'cancel';
    cancelSnapshotRef.current = {
      hasServerBet: hasServerBetRef.current,
      queuedNextBet: queuedNextBetRef.current,
      serverBetAmount: betAmountRef.current,
      serverBetColor: serverBetColorRef.current,
    };
    setHasServerBet(false);
    setQueuedNextBet(false);
    queuedNextBetRef.current = false;
    setServerBetAmount(0);
    setServerBetColor(null);
    stopCrashSound('bet');
    playCrashSound('cancel');
    emitCoinBurst({ direction: 'in', count: 6 });
    getSocket().emit('double:cancel');
  }, []);

  return {
    gameState,
    countdown,
    result,
    history,
    bets,
    hasServerBet,
    queuedNextBet,
    serverBetAmount,
    serverBetColor,
    placeBet,
    cancelBet,
    lastError,
    fairnessCommit,
    fairnessReveal,
  };
}
