import { cn } from '../../../lib/utils';
import {
  BACCARAT_BETTING_SECONDS,
  type BaccaratDealData,
  type BaccaratPhase,
  type BaccaratSide,
  type BetStacks,
} from '../../../hooks/useBaccaratGame';
import { BaccaratBetCapsule } from './BaccaratBetCapsule';
import type { PlacedChip } from './BaccaratChip';
import { BaccaratHands } from './BaccaratHands';
import { BaccaratResultBanner } from './BaccaratResultBanner';
import { BaccaratShufflingDeck } from './BaccaratShufflingDeck';

type ZoneKey = keyof BetStacks;

export function BaccaratTableStage({
  gamePhase,
  countdown,
  roundData,
  betPlaced,
  personalPayout,
  acceptedBets,
  stacks,
  pools,
  placedChips,
  bettingLocked,
  showTotals,
  outcomeDone,
  showShufflingDeck,
  seq,
  dealProgress,
  flipProgress,
  error,
  onAddChip,
}: {
  gamePhase: BaccaratPhase;
  countdown: number;
  roundData: BaccaratDealData | null;
  betPlaced: boolean;
  personalPayout: number | null;
  acceptedBets: BetStacks | null;
  stacks: BetStacks;
  pools: BetStacks;
  placedChips: Record<ZoneKey, PlacedChip[]>;
  bettingLocked: boolean;
  showTotals: boolean;
  outcomeDone?: BaccaratSide;
  showShufflingDeck: boolean;
  seq: Parameters<typeof BaccaratHands>[0]['seq'];
  dealProgress: number;
  flipProgress: number;
  error: string | null;
  onAddChip: (zone: ZoneKey) => void;
}) {
  const deckStatusText =
    gamePhase === 'BETTING' ? 'Embaralhando…' : 'A distribuir…';

  const phaseLabel =
    gamePhase === 'BETTING'
      ? betPlaced
        ? 'Aposta confirmada'
        : countdown <= 3
          ? 'Apostas encerrando…'
          : 'Apostas abertas'
      : gamePhase === 'DEALING' && !showTotals
        ? 'Distribuindo…'
        : gamePhase === 'RESULT' || showTotals
          ? 'Resultado'
          : '';

  return (
    <div
      className="relative flex min-h-[420px] w-full flex-1 flex-col overflow-hidden lg:min-h-[560px]"
      style={{ backgroundColor: '#0c1a3d' }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-top bg-no-repeat"
        style={{ backgroundImage: "url('/images/baccarat-table.png')" }}
      />
      <div
        className="pointer-events-none absolute inset-0 motion-safe:animate-baccarat-spotlight"
        style={{
          background:
            'radial-gradient(55% 40% at 50% 16%, rgba(255,228,170,0.16) 0%, rgba(255,228,170,0.06) 40%, transparent 70%)',
          mixBlendMode: 'screen',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0c1a3d]/50" />

      {/* HUD superior */}
      <div className="relative z-20 flex shrink-0 flex-col items-center px-3 pb-2 pt-5 md:px-6 md:pt-6">
        <div className="mb-2 flex items-center gap-2 md:mb-2.5">
          <span
            aria-hidden
            className="h-px w-8 md:w-12"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.7) 50%, transparent 100%)',
            }}
          />
          <h2
            className="font-serif text-lg font-bold tracking-[0.35em] md:text-xl"
            style={{
              background:
                'linear-gradient(180deg, #fef3c7 0%, #fbbf24 45%, #b45309 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter:
                'drop-shadow(0 1px 0 rgba(0,0,0,0.45)) drop-shadow(0 2px 8px rgba(251,191,36,0.25))',
            }}
          >
            BACCARAT
          </h2>
          <span
            aria-hidden
            className="h-px w-8 md:w-12"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(251,191,36,0.7) 50%, transparent 100%)',
            }}
          />
        </div>

        {gamePhase === 'BETTING' && (
          <div className="mb-2 flex flex-col items-center gap-1">
            <div
              className={cn(
                'relative h-12 w-12',
                countdown <= 3 && !betPlaced && 'motion-safe:animate-baccarat-urgent-pulse'
              )}
              aria-live="polite"
              aria-atomic="true"
            >
              <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36" aria-hidden>
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={countdown <= 3 ? '#f87171' : '#fbbf24'}
                  strokeWidth="3"
                  strokeDasharray={`${(countdown / BACCARAT_BETTING_SECONDS) * 94.25} 94.25`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                  style={{
                    filter: `drop-shadow(0 0 6px ${
                      countdown <= 3 ? 'rgba(248,113,113,0.7)' : 'rgba(251,191,36,0.6)'
                    })`,
                  }}
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center font-mono text-lg font-bold drop-shadow',
                  countdown <= 3 ? 'text-red-300' : 'text-amber-200'
                )}
              >
                {countdown}
              </span>
            </div>
            <span
              className={cn(
                'text-[11px] uppercase tracking-widest',
                countdown <= 3 && !betPlaced ? 'text-red-300/90' : 'text-amber-200/80'
              )}
            >
              {phaseLabel}
            </span>
          </div>
        )}

        {gamePhase !== 'BETTING' && phaseLabel && (
          <div className="mb-2">
            <span className="text-sm uppercase tracking-widest text-amber-200/90 motion-safe:animate-pulse">
              {phaseLabel}
            </span>
          </div>
        )}
      </div>

      {/* Maço */}
      {showShufflingDeck && (gamePhase === 'BETTING' || gamePhase === 'DEALING') && (
        <div className="pointer-events-none absolute inset-x-0 top-[28%] z-[21] flex justify-center px-3">
          <BaccaratShufflingDeck statusText={deckStatusText} />
        </div>
      )}

      {/* Cartas */}
      <div
        className={cn(
          'relative z-10 flex flex-1 items-end justify-center px-2 pb-36 pt-4 sm:px-4 sm:pb-40 md:px-8',
          !roundData && 'pointer-events-none'
        )}
      >
        {roundData && (
          <BaccaratHands
            roundData={roundData}
            seq={seq}
            dealProgress={dealProgress}
            flipProgress={flipProgress}
            showTotals={showTotals}
            outcomeDone={outcomeDone}
          />
        )}
      </div>

      {/* Cápsula + resultado */}
      <div className="absolute inset-x-0 bottom-3 z-30 flex flex-col items-center gap-2 px-2 sm:bottom-4 sm:px-4">
        {showTotals && roundData && (
          <div className="w-full max-w-sm">
            <BaccaratResultBanner
              outcome={roundData.outcome}
              personalPayout={personalPayout}
              acceptedBets={acceptedBets}
            />
          </div>
        )}
        <BaccaratBetCapsule
          stacks={stacks}
          acceptedBets={acceptedBets}
          pools={pools}
          placedChips={placedChips}
          bettingLocked={bettingLocked}
          outcomeDone={outcomeDone}
          onAddChip={onAddChip}
        />
        {error && (
          <p
            className="max-w-md text-center text-[11px] font-semibold text-red-400"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        {!error && gamePhase === 'BETTING' && !betPlaced && (
          <p className="text-[10px] text-white/50">
            Selecione fichas, toque nas zonas e confirme com Apostar
          </p>
        )}
      </div>
    </div>
  );
}
