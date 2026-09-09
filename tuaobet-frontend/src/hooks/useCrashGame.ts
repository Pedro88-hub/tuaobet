import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket';
import { emitCoinBurst } from '../lib/gameFx';
import { playCrashSound } from '../lib/crashSounds';

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
  const [queuedNextBet, setQueuedNextBet] = useState(false);
  const [serverCashedOut, setServerCashedOut] = useState(false);
  const [serverPayout, setServerPayout] = useState(0);
  const [serverBetAmount, setServerBetAmount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [fairnessCommit, setFairnessCommit] = useState<CrashFairnessCommit | null>(null);
  const [fairnessReveal, setFairnessReveal] = useState<CrashFairnessReveal | null>(null);

  const pendingActionRef = useRef<PendingAction>(null);
  const multiplierRef = useRef(multiplier);
  const betAmountRef = useRef(serverBetAmount);
  const queuedNextBetRef = useRef(false);
  const hasServerBetRef = useRef(false);
  const cancelSnapshotRef = useRef<{
    hasServerBet: boolean;
    queuedNextBet: boolean;
    serverBetAmount: number;
  } | null>(null);

  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);

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
          setServerCashedOut(false);
          setServerPayout(0);
          // Fila promovida no servidor → bet-accepted; não apagar stake se já estava enfileirada.
          if (queuedNextBetRef.current) {
            setQueuedNextBet(false);
            queuedNextBetRef.current = false;
            setHasServerBet(true);
          } else {
            // bet-accepted pode chegar antes/depois; sync cobre reconexão.
            // Só limpa quem não tinha aposta na rodada anterior (explode já limpou).
          }
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
        setGameState('CRASHED');
        setMultiplier(data.crashPoint);
        if (data.history) setHistory(data.history);
        // Mantém fila da próxima rodada; limpa só a aposta da rodada que acabou.
        setHasServerBet(false);
        setServerCashedOut(false);
        if (!queuedNextBetRef.current) {
          setServerBetAmount(0);
        }
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
      const wasQueued = queuedNextBetRef.current;
      setQueuedNextBet(false);
      queuedNextBetRef.current = false;
      setHasServerBet(true);
      if (data?.amount != null && Number.isFinite(data.amount)) {
        setServerBetAmount(data.amount);
      }
      setServerCashedOut(false);
      setServerPayout(0);
      setLastError(null);
      // Promoção da fila: já tocou som/moedas no queue; aposta no COUNTDOWN dispara FX.
      if (!wasQueued) {
        playCrashSound('bet');
        emitCoinBurst({ direction: 'out' });
      }
    });

    socket.on('crash:bet-queued', (data?: { amount?: number }) => {
      pendingActionRef.current = null;
      setQueuedNextBet(true);
      queuedNextBetRef.current = true;
      setHasServerBet(false);
      if (data?.amount != null && Number.isFinite(data.amount)) {
        setServerBetAmount(data.amount);
      }
      setServerCashedOut(false);
      setServerPayout(0);
      setLastError(null);
      playCrashSound('bet');
      emitCoinBurst({ direction: 'out' });
    });

    socket.on('crash:bet-cancelled', () => {
      pendingActionRef.current = null;
      cancelSnapshotRef.current = null;
      setHasServerBet(false);
      setQueuedNextBet(false);
      queuedNextBetRef.current = false;
      setServerCashedOut(false);
      setServerPayout(0);
      setServerBetAmount(0);
      setLastError(null);
      playCrashSound('cancel');
      emitCoinBurst({ direction: 'in', count: 6 });
    });

    socket.on('crash:cashout-ok', (data: { multiplier: number; payout: number }) => {
      pendingActionRef.current = null;
      setServerCashedOut(true);
      setServerPayout(data.payout);
      setLastError(null);
      playCrashSound('cashout');
      emitCoinBurst({ direction: 'in', count: 10 });
    });

    socket.on('crash:error', (data: { code?: string }) => {
      const code = data.code ?? '';
      const pending = pendingActionRef.current;
      pendingActionRef.current = null;

      if (pending === 'bet') {
        if (code === 'ALREADY_BET') {
          // Pode ser aposta atual ou fila — sync resolve; assume aposta atual.
          setHasServerBet(true);
          setQueuedNextBet(false);
          queuedNextBetRef.current = false;
        } else {
          setHasServerBet(false);
          setQueuedNextBet(false);
          queuedNextBetRef.current = false;
          setServerBetAmount(0);
        }
      } else if (pending === 'cancel') {
        if (code !== 'NO_BET') {
          const snap = cancelSnapshotRef.current;
          if (snap) {
            setHasServerBet(snap.hasServerBet);
            setQueuedNextBet(snap.queuedNextBet);
            queuedNextBetRef.current = snap.queuedNextBet;
            setServerBetAmount(snap.serverBetAmount);
          }
        }
        cancelSnapshotRef.current = null;
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
      socket.off('crash:bet-queued');
      socket.off('crash:bet-cancelled');
      socket.off('crash:cashout-ok');
      socket.off('crash:error');
    };
  }, []);

  const joinGame = useCallback((amount: number, state: GameState) => {
    setLastError(null);
    pendingActionRef.current = 'bet';
    setServerBetAmount(amount);
    setServerCashedOut(false);
    setServerPayout(0);
    if (state === 'COUNTDOWN') {
      setHasServerBet(true);
      setQueuedNextBet(false);
      queuedNextBetRef.current = false;
    } else {
      setHasServerBet(false);
      setQueuedNextBet(true);
      queuedNextBetRef.current = true;
    }
    getSocket().emit('crash:bet', { amount });
  }, []);

  const cancelBet = useCallback(() => {
    setLastError(null);
    pendingActionRef.current = 'cancel';
    cancelSnapshotRef.current = {
      hasServerBet: hasServerBetRef.current,
      queuedNextBet: queuedNextBetRef.current,
      serverBetAmount: betAmountRef.current,
    };
    setHasServerBet(false);
    setQueuedNextBet(false);
    queuedNextBetRef.current = false;
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
    queuedNextBet,
    serverCashedOut,
    serverPayout,
    serverBetAmount,
    lastError,
    fairnessCommit,
    fairnessReveal,
    joinGame,
    cancelBet,
    cashout,
  };
}
