import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '../services/socket';
import { MIN_BET } from '../lib/betLimits';

export type BaccaratSide = 'player' | 'banker' | 'tie';

export interface CardDto {
  rank: number;
  suit: number;
}

export interface BetStacks {
  player: number;
  banker: number;
  tie: number;
}

export interface BaccaratDealData {
  playerCards: CardDto[];
  bankerCards: CardDto[];
  playerTotal: number;
  bankerTotal: number;
  outcome: BaccaratSide;
}

export interface BaccaratHistoryCell {
  outcome: BaccaratSide;
  playerTotal: number;
  bankerTotal: number;
}

export interface BaccaratLiveBet {
  id: string;
  username: string;
  bets: BetStacks;
  total: number;
}

export const BACCARAT_CHIP_VALUES = [1, 5, 25, 100] as const;
export const BACCARAT_BETTING_SECONDS = 10;

/** Odds de display alinhadas ao payout do motor (stake incluído no cálculo server-side). */
export const BACCARAT_ODDS = {
  player: '1 : 1',
  banker: '0.95 : 1',
  tie: '9 : 1',
} as const;

const EMPTY_STACKS: BetStacks = { player: 0, banker: 0, tie: 0 };

const ERROR_MAP: Record<string, string> = {
  AUTH: 'Faça login para apostar.',
  CLOSED: 'Apostas fechadas.',
  INVALID: 'Dados inválidos.',
  INSUFFICIENT_BALANCE: 'Saldo insuficiente.',
  MIN_BET: 'Valor abaixo do mínimo.',
  MAX_BET: 'Valor acima do máximo.',
  ALREADY_BET: 'Você já apostou nesta rodada.',
  ACCOUNT_BLOCKED: 'Conta bloqueada.',
};

export type BaccaratPhase = 'BETTING' | 'DEALING' | 'RESULT';

export function useBaccaratGame() {
  const [gamePhase, setGamePhase] = useState<BaccaratPhase>('BETTING');
  const [countdown, setCountdown] = useState(BACCARAT_BETTING_SECONDS);
  const [roundData, setRoundData] = useState<BaccaratDealData | null>(null);
  const [history, setHistory] = useState<BaccaratHistoryCell[]>([]);
  const [liveBets, setLiveBets] = useState<BaccaratLiveBet[]>([]);

  const [selectedChip, setSelectedChip] = useState<number>(5);
  const [stacks, setStacks] = useState<BetStacks>(EMPTY_STACKS);
  const [acceptedBets, setAcceptedBets] = useState<BetStacks | null>(null);
  const [betPlaced, setBetPlaced] = useState(false);
  const [personalPayout, setPersonalPayout] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stacksRef = useRef(stacks);
  stacksRef.current = stacks;

  useEffect(() => {
    const socket = getSocket();

    const onState = (data: {
      state: BaccaratPhase;
      countdown: number;
    }) => {
      setGamePhase(data.state);
      setCountdown(data.countdown);
      if (data.state === 'BETTING') {
        setRoundData(null);
        setBetPlaced(false);
        setAcceptedBets(null);
        setPersonalPayout(null);
        setError(null);
        setStacks(EMPTY_STACKS);
      }
    };

    const onCountdown = (count: number) => {
      setCountdown(count);
      setGamePhase('BETTING');
    };

    const onDeal = (data: BaccaratDealData) => {
      setGamePhase('DEALING');
      setRoundData(data);
    };

    const onResult = (data: { history: BaccaratHistoryCell[] }) => {
      setGamePhase('RESULT');
      setHistory(data.history);
    };

    const onHistory = (data: BaccaratHistoryCell[]) => setHistory(data);

    const onBets = (data: BaccaratLiveBet[]) => setLiveBets(data);
    const onNewBet = (data: BaccaratLiveBet) =>
      setLiveBets((prev) => [...prev, data]);

    const onBetAccepted = (data?: { bets?: BetStacks; totalStake?: number }) => {
      setBetPlaced(true);
      setAcceptedBets(data?.bets ?? { ...stacksRef.current });
      setStacks(EMPTY_STACKS);
      setError(null);
    };

    const onPersonalResult = (data: { payout: number }) => {
      setPersonalPayout(data.payout);
    };

    const onError = (data: { code?: string }) => {
      setError(ERROR_MAP[data.code ?? ''] || data.code || 'Erro');
    };

    const requestSync = () => socket.emit('baccarat:sync');

    socket.on('baccarat:state', onState);
    socket.on('baccarat:countdown', onCountdown);
    socket.on('baccarat:deal', onDeal);
    socket.on('baccarat:result', onResult);
    socket.on('baccarat:history', onHistory);
    socket.on('baccarat:bets', onBets);
    socket.on('baccarat:new-bet', onNewBet);
    socket.on('baccarat:bet-accepted', onBetAccepted);
    socket.on('baccarat:personal-result', onPersonalResult);
    socket.on('baccarat:error', onError);
    socket.on('connect', requestSync);

    requestSync();

    return () => {
      socket.off('baccarat:state', onState);
      socket.off('baccarat:countdown', onCountdown);
      socket.off('baccarat:deal', onDeal);
      socket.off('baccarat:result', onResult);
      socket.off('baccarat:history', onHistory);
      socket.off('baccarat:bets', onBets);
      socket.off('baccarat:new-bet', onNewBet);
      socket.off('baccarat:bet-accepted', onBetAccepted);
      socket.off('baccarat:personal-result', onPersonalResult);
      socket.off('baccarat:error', onError);
      socket.off('connect', requestSync);
    };
  }, []);

  const totalWagered =
    Math.round((stacks.player + stacks.banker + stacks.tie) * 100) / 100;

  const acceptedTotal = acceptedBets
    ? Math.round(
        (acceptedBets.player + acceptedBets.banker + acceptedBets.tie) * 100
      ) / 100
    : 0;

  const addChip = useCallback(
    (zone: keyof BetStacks) => {
      setStacks((s) => ({
        ...s,
        [zone]: Math.round((s[zone] + selectedChip) * 100) / 100,
      }));
      setError(null);
    },
    [selectedChip]
  );

  const clearStacks = useCallback(() => {
    setStacks(EMPTY_STACKS);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const placeBet = useCallback(() => {
    if (totalWagered < MIN_BET) {
      setError(
        totalWagered <= 0
          ? 'Coloque fichas em Jogador, Empate ou Banca'
          : 'Mínimo R$ 0,50'
      );
      return;
    }
    if (gamePhase !== 'BETTING' || betPlaced) {
      setError(ERROR_MAP.CLOSED);
      return;
    }
    setError(null);
    getSocket().emit('baccarat:bet', { bets: stacks });
  }, [stacks, totalWagered, gamePhase, betPlaced]);

  const canPlaceBet =
    gamePhase === 'BETTING' && !betPlaced && totalWagered >= MIN_BET;

  return {
    gamePhase,
    countdown,
    roundData,
    history,
    liveBets,
    selectedChip,
    setSelectedChip,
    stacks,
    acceptedBets,
    acceptedTotal,
    addChip,
    clearStacks,
    totalWagered,
    betPlaced,
    personalPayout,
    error,
    clearError,
    placeBet,
    canPlaceBet,
  };
}
