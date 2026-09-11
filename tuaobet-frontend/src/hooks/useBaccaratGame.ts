import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { canAddChip, dealSequence, totalCents } from '../games/baccarat/betting';
import {
  applyTotals,
  BETTING_SECONDS,
  betsFromLivePlacements,
  canInteract,
  emptyTotals,
  ERROR_MESSAGES,
  isStaleRound,
  placementsFromServer,
  type AreaTotals,
  type CancelledPayload,
  type ChipAcceptedPayload,
  type LiveHistoryItem,
  type LivePlacement,
  type Phase,
  type TotalsPayload,
} from '../games/baccarat/live';
import type { Bets, Outcome, Side, Status } from '../games/baccarat/types';

export function useBaccaratGame() {
  const { user, authReady, isAuthenticated } = useAuth();
  const identity = user?.id ?? null;
  const identityRef = useRef(identity);
  identityRef.current = identity;

  const [phase, setPhase] = useState<Phase>('BETTING');
  const [countdown, setCountdown] = useState(BETTING_SECONDS);
  const [roundId, setRoundId] = useState(0);
  const roundIdRef = useRef(0);
  const [chip, setChip] = useState(50);
  const [placements, setPlacements] = useState<LivePlacement[]>([]);
  const [totals, setTotals] = useState<AreaTotals>(emptyTotals());
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [history, setHistory] = useState<LiveHistoryItem[]>([]);
  const [error, setError] = useState('');
  const [arrived, setArrived] = useState(0);
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastSettledBets, setLastSettledBets] = useState<Bets | null>(null);
  const placementsRef = useRef<LivePlacement[]>([]);
  placementsRef.current = placements;

  const balance = Math.max(0, Math.round((user?.balance ?? 0) * 100));
  const bets = betsFromLivePlacements(placements);
  const total = totalCents(bets);
  const remaining = balance;
  const editable = canInteract(phase, Boolean(isAuthenticated && authReady));
  const canRebet =
    editable &&
    !busy &&
    placements.length === 0 &&
    lastSettledBets != null &&
    totalCents(lastSettledBets) > 0 &&
    totalCents(lastSettledBets) <= remaining;

  useEffect(() => {
    roundIdRef.current = roundId;
  }, [roundId]);

  useEffect(() => {
    const socket = getSocket();
    const current = () => identityRef.current === identity;

    const sync = () => socket.emit('baccarat:sync');

    const onState = (data: {
      phase: Phase;
      countdown: number;
      roundId?: number;
      outcome?: Outcome;
    }) => {
      if (!current()) return;
      if (data.roundId != null) {
        if (data.roundId !== roundIdRef.current && data.phase === 'BETTING') {
          setPlacements([]);
          setShown(0);
          setArrived(0);
        }
        setRoundId(data.roundId);
        roundIdRef.current = data.roundId;
      }
      setPhase(data.phase);
      setCountdown(data.countdown ?? 0);
      if (data.phase === 'BETTING') {
        setOutcome(null);
        setShown(0);
        setArrived(0);
        setBusy(false);
      } else if (data.outcome) {
        setOutcome(data.outcome);
      }
    };

    const onCountdown = (count: number) => {
      if (!current()) return;
      setCountdown(count);
      setPhase('BETTING');
    };

    const onTotals = (payload: TotalsPayload) => {
      if (!current()) return;
      if (isStaleRound(roundIdRef.current, payload.roundId)) return;
      setTotals(applyTotals(payload));
    };

    const onHistory = (items: LiveHistoryItem[]) => {
      if (current() && Array.isArray(items)) setHistory(items);
    };

    const onDeal = (next: Outcome) => {
      if (!current() || !next) return;
      setPhase('DEALING');
      setOutcome(next);
    };

    const onResult = (data: { roundId?: number; outcome?: Outcome; history?: LiveHistoryItem[] }) => {
      if (!current()) return;
      if (isStaleRound(roundIdRef.current, data.roundId)) return;
      setPhase('RESULT');
      if (data.outcome) setOutcome(data.outcome);
      if (Array.isArray(data.history)) setHistory(data.history);
      const settled = betsFromLivePlacements(placementsRef.current);
      if (totalCents(settled) > 0) setLastSettledBets(settled);
      setBusy(false);
    };

    const onAccepted = (payload: ChipAcceptedPayload) => {
      if (!current()) return;
      if (isStaleRound(roundIdRef.current, payload.roundId)) return;
      setPlacements(placementsFromServer(payload.placements));
      setBusy(false);
      setError('');
    };

    const onCancelled = (payload: CancelledPayload) => {
      if (!current()) return;
      if (isStaleRound(roundIdRef.current, payload.roundId)) return;
      setPlacements(placementsFromServer(payload.placements));
      setBusy(false);
      setError('');
    };

    const onError = (payload: { code?: string }) => {
      if (!current()) return;
      setBusy(false);
      setError(ERROR_MESSAGES[payload?.code ?? ''] || ERROR_MESSAGES.INVALID);
    };

    socket.on('baccarat:state', onState);
    socket.on('baccarat:countdown', onCountdown);
    socket.on('baccarat:totals', onTotals);
    socket.on('baccarat:history', onHistory);
    socket.on('baccarat:deal', onDeal);
    socket.on('baccarat:result', onResult);
    socket.on('baccarat:chip-accepted', onAccepted);
    socket.on('baccarat:bet-cancelled', onCancelled);
    socket.on('baccarat:error', onError);
    socket.on('connect', sync);
    sync();

    return () => {
      socket.off('baccarat:state', onState);
      socket.off('baccarat:countdown', onCountdown);
      socket.off('baccarat:totals', onTotals);
      socket.off('baccarat:history', onHistory);
      socket.off('baccarat:deal', onDeal);
      socket.off('baccarat:result', onResult);
      socket.off('baccarat:chip-accepted', onAccepted);
      socket.off('baccarat:bet-cancelled', onCancelled);
      socket.off('baccarat:error', onError);
      socket.off('connect', sync);
    };
  }, [identity]);

  useEffect(() => {
    if (!outcome) return;
    const count = dealSequence(outcome).length;
    if (phase === 'RESULT') {
      setArrived(count);
      setShown(count);
      return;
    }
    if (phase !== 'DEALING') return;
    setArrived(0);
    setShown(0);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let index = 0; index < count; index += 1) {
      timers.push(setTimeout(() => setArrived(index + 1), reduced ? 0 : index * 700 + 100));
      timers.push(setTimeout(() => setShown(index + 1), reduced ? 0 : index * 700 + 500));
    }
    return () => timers.forEach(clearTimeout);
  }, [outcome, phase, roundId]);

  function place(side: Side) {
    if (!editable || busy || !canAddChip(chip, remaining)) return;
    setBusy(true);
    setError('');
    getSocket().emit('baccarat:bet', { side, amount: chip / 100 });
  }

  function undo() {
    if (!editable || busy || placements.length === 0) return;
    setBusy(true);
    getSocket().emit('baccarat:undo');
  }

  function clear() {
    if (!editable || busy || placements.length === 0) return;
    setBusy(true);
    getSocket().emit('baccarat:clear');
  }

  function rebet() {
    if (!canRebet || !lastSettledBets) return;
    setBusy(true);
    setError('');
    const socket = getSocket();
    (['player', 'banker', 'tie'] as const).forEach((side) => {
      const cents = lastSettledBets[side];
      if (cents >= 50) socket.emit('baccarat:bet', { side, amount: cents / 100 });
    });
  }

  const status: Status = phase === 'DEALING' ? 'dealing' : phase === 'RESULT' ? 'result' : 'betting';

  return {
    bets,
    chip,
    setChip,
    status,
    phase,
    countdown,
    roundId,
    outcome,
    history,
    historyError: '',
    error,
    retryable: false,
    arrived: phase === 'BETTING' ? 0 : arrived,
    shown: phase === 'BETTING' ? 0 : shown,
    balance,
    total,
    remaining,
    editable,
    canRebet,
    totals,
    placements,
    place,
    undo,
    clear,
    rebet,
  };
}
