import { useEffect, useMemo, useState } from 'react';
import { cn } from '../../../lib/utils';
import type { BaccaratDealData, BaccaratSide, CardDto } from '../../../hooks/useBaccaratGame';
import { BaccaratFlippableCard, CARD_H, CARD_W } from './BaccaratCard';

type DealStep = { zone: 'player' | 'banker'; card: CardDto; slotIndex: number };

function buildDealSequence(playerCards: CardDto[], bankerCards: CardDto[]): DealStep[] {
  const seq: DealStep[] = [];
  for (let i = 0; i < 2; i++) {
    seq.push({ zone: 'player', card: playerCards[i], slotIndex: i });
    seq.push({ zone: 'banker', card: bankerCards[i], slotIndex: i });
  }
  if (playerCards[2]) seq.push({ zone: 'player', card: playerCards[2], slotIndex: 2 });
  if (bankerCards[2]) seq.push({ zone: 'banker', card: bankerCards[2], slotIndex: 2 });
  return seq;
}

function globalIndex(seq: DealStep[], zone: 'player' | 'banker', slotIndex: number): number {
  return seq.findIndex((s) => s.zone === zone && s.slotIndex === slotIndex);
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useBaccaratDealAnimation(roundData: BaccaratDealData | null) {
  const [animPhase, setAnimPhase] = useState<'settled' | 'dealing' | 'flipping'>('settled');
  const [dealProgress, setDealProgress] = useState(0);
  const [flipProgress, setFlipProgress] = useState(0);

  const seq = useMemo(
    () =>
      roundData
        ? buildDealSequence(roundData.playerCards, roundData.bankerCards)
        : [],
    [roundData]
  );

  useEffect(() => {
    if (roundData) {
      if (prefersReducedMotion()) {
        setDealProgress(seq.length);
        setFlipProgress(seq.length);
        setAnimPhase('settled');
        return;
      }
      setDealProgress(0);
      setFlipProgress(0);
      setAnimPhase('dealing');
    }
  }, [roundData, seq.length]);

  useEffect(() => {
    if (animPhase !== 'dealing' || !roundData || seq.length === 0) return;
    if (dealProgress >= seq.length) {
      setAnimPhase('flipping');
      setFlipProgress(0);
      return;
    }
    const t = window.setTimeout(() => setDealProgress((d) => d + 1), 320);
    return () => window.clearTimeout(t);
  }, [animPhase, dealProgress, roundData, seq.length]);

  useEffect(() => {
    if (animPhase !== 'flipping' || !roundData || seq.length === 0) return;
    if (flipProgress >= seq.length) {
      setAnimPhase('settled');
      return;
    }
    const t = window.setTimeout(() => setFlipProgress((f) => f + 1), 290);
    return () => window.clearTimeout(t);
  }, [animPhase, flipProgress, roundData, seq.length]);

  const showTotals =
    !!roundData &&
    animPhase === 'settled' &&
    seq.length > 0 &&
    flipProgress >= seq.length;

  const outcomeDone: BaccaratSide | undefined = showTotals
    ? roundData?.outcome
    : undefined;

  const showShufflingDeck =
    !roundData ||
    (animPhase === 'dealing' && dealProgress === 0);

  return {
    seq,
    animPhase,
    dealProgress,
    flipProgress,
    showTotals,
    outcomeDone,
    showShufflingDeck,
  };
}

export function BaccaratHands({
  roundData,
  seq,
  dealProgress,
  flipProgress,
  showTotals,
  outcomeDone,
}: {
  roundData: BaccaratDealData | null;
  seq: DealStep[];
  dealProgress: number;
  flipProgress: number;
  showTotals: boolean;
  outcomeDone?: BaccaratSide;
}) {
  const renderHand = (zone: 'player' | 'banker') => {
    if (!roundData) return null;
    const cards = zone === 'player' ? roundData.playerCards : roundData.bankerCards;
    return (
      <div className="flex min-h-[clamp(4.5rem,12vw,6.5rem)] flex-wrap justify-center gap-1.5 sm:gap-2">
        {cards.map((card, slotIndex) => {
          const g = globalIndex(seq, zone, slotIndex);
          if (g < 0) return null;
          const onTable = dealProgress > g;
          const faceUp = flipProgress > g;

          if (!onTable) {
            return <div key={`${zone}-${slotIndex}`} className={`${CARD_H} ${CARD_W}`} />;
          }

          return (
            <BaccaratFlippableCard
              key={`${zone}-${slotIndex}-${card.rank}-${card.suit}`}
              card={card}
              faceUp={faceUp}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative flex w-full max-w-5xl min-h-[min(120px,18vh)] items-end justify-between gap-2 sm:gap-6 md:gap-10">
      <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
        <span
          className={cn(
            'text-[10px] font-black uppercase tracking-[0.2em] text-blue-200/90 sm:text-[11px]',
            outcomeDone === 'player' && 'text-amber-200'
          )}
        >
          Jogador
        </span>
        {showTotals && roundData && (
          <div
            className={cn(
              'rounded-md border border-white/35 bg-zinc-900/90 px-2.5 py-1 font-mono text-lg font-black text-white shadow-lg backdrop-blur-sm sm:text-xl',
              outcomeDone === 'player' &&
                'motion-safe:animate-baccarat-win-pulse border-amber-300/60 bg-amber-950/80'
            )}
          >
            {roundData.playerTotal}
          </div>
        )}
        {renderHand('player')}
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
        <span
          className={cn(
            'text-[10px] font-black uppercase tracking-[0.2em] text-red-200/90 sm:text-[11px]',
            outcomeDone === 'banker' && 'text-amber-200'
          )}
        >
          Banca
        </span>
        {showTotals && roundData && (
          <div
            className={cn(
              'rounded-md border border-red-300/45 bg-red-950/90 px-2.5 py-1 font-mono text-lg font-black text-white shadow-lg backdrop-blur-sm sm:text-xl',
              outcomeDone === 'banker' &&
                'motion-safe:animate-baccarat-win-pulse border-amber-300/60 bg-amber-950/80'
            )}
          >
            {roundData.bankerTotal}
          </div>
        )}
        {renderHand('banker')}
      </div>
    </div>
  );
}
