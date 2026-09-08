import { Spade } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { CardDto } from '../../../hooks/useBaccaratGame';

const SUITS = ['♠', '♥', '♦', '♣'] as const;

export const CARD_H = 'h-[clamp(4.5rem,12vw,6.25rem)]';
export const CARD_W = 'w-[clamp(3.25rem,8.5vw,4.5rem)]';
const DECK_CARD_H = 'h-[72px]';
const DECK_CARD_W = 'w-[50px]';

function rankLabel(rank: number): string {
  if (rank === 1) return 'A';
  if (rank === 10) return '10';
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  return String(rank);
}

export function BaccaratCardFace({
  card,
  className,
  faceUp,
}: {
  card: CardDto;
  className?: string;
  faceUp?: boolean;
}) {
  const isRed = card.suit === 1 || card.suit === 2;
  const suit = SUITS[card.suit] ?? '?';
  const rank = rankLabel(card.rank);
  return (
    <div
      className={cn(
        `${CARD_H} ${CARD_W} relative overflow-hidden rounded-lg`,
        'border border-zinc-300 ring-1 ring-black/10',
        className
      )}
      style={{
        background:
          'linear-gradient(160deg, #ffffff 0%, #f8f6f1 55%, #ece8df 100%)',
        boxShadow:
          '0 1px 0 rgba(0,0,0,0.08), 0 2px 0 rgba(0,0,0,0.06), 0 6px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.7)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 50% -10%, rgba(255,255,255,0.7), transparent 55%), radial-gradient(80% 60% at 50% 110%, rgba(0,0,0,0.08), transparent 60%)',
        }}
      />
      <div
        className={cn(
          'absolute left-1.5 top-1 flex flex-col items-center leading-none',
          isRed ? 'text-red-600' : 'text-zinc-900'
        )}
      >
        <span className="text-[clamp(11px,2.2vw,15px)] font-black tracking-tight">{rank}</span>
        <span className="-mt-0.5 text-[clamp(10px,2vw,13px)]">{suit}</span>
      </div>
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center text-[clamp(22px,5vw,34px)] leading-none',
          isRed ? 'text-red-600' : 'text-zinc-900'
        )}
        style={{ textShadow: '0 1px 0 rgba(0,0,0,0.08)' }}
      >
        {suit}
      </div>
      <div
        className={cn(
          'absolute bottom-1 right-1.5 flex rotate-180 flex-col items-center leading-none',
          isRed ? 'text-red-600' : 'text-zinc-900'
        )}
      >
        <span className="text-[clamp(11px,2.2vw,15px)] font-black tracking-tight">{rank}</span>
        <span className="-mt-0.5 text-[clamp(10px,2vw,13px)]">{suit}</span>
      </div>
      {faceUp && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
          <div
            className="absolute -inset-y-2 w-1/2 animate-baccarat-card-gloss"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
            }}
          />
        </div>
      )}
    </div>
  );
}

export function BaccaratCardBack({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const h = compact ? DECK_CARD_H : CARD_H;
  const w = compact ? DECK_CARD_W : CARD_W;
  return (
    <div
      className={cn(
        `${h} ${w} relative overflow-hidden rounded-lg border border-amber-900/70 shadow-card`,
        className
      )}
      style={{
        background: `
          radial-gradient(circle at 30% 25%, rgba(255,210,120,0.25), transparent 55%),
          repeating-linear-gradient(45deg, rgba(255,200,90,0.10) 0px, rgba(255,200,90,0.10) 2px, transparent 2px, transparent 6px),
          repeating-linear-gradient(-45deg, rgba(255,200,90,0.10) 0px, rgba(255,200,90,0.10) 2px, transparent 2px, transparent 6px),
          linear-gradient(150deg, #7c1d1d 0%, #4a0c0c 100%)
        `,
      }}
    >
      <div
        className="pointer-events-none absolute inset-1 rounded-md"
        style={{
          border: '1px solid rgba(234,179,8,0.55)',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)',
        }}
      />
      <div
        className={cn(
          'absolute inset-0 m-auto flex items-center justify-center rounded',
          'border border-amber-500/40 bg-gradient-to-br from-red-900/70 to-red-950/80',
          compact ? 'h-12 w-9' : 'h-[78%] w-[70%]'
        )}
        style={{
          margin: compact ? '8px' : '10%',
          boxShadow: 'inset 0 0 12px rgba(0,0,0,0.45)',
        }}
      >
        <Spade
          className={cn(compact ? 'h-6 w-6' : 'h-8 w-8')}
          style={{
            color: '#fde68a',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))',
          }}
        />
      </div>
    </div>
  );
}

export function BaccaratFlippableCard({
  card,
  faceUp,
}: {
  card: CardDto;
  faceUp: boolean;
}) {
  return (
    <div
      className={cn(
        `relative ${CARD_H} ${CARD_W} motion-safe:animate-baccarat-deal [perspective:1100px]`
      )}
      style={{
        filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.35))',
      }}
    >
      <div
        className={cn(
          'relative h-full w-full transition-transform duration-[680ms] motion-reduce:duration-0 [transform-style:preserve-3d]',
          faceUp && '[transform:rotateY(180deg)]'
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.2, 0.64, 1)' }}
      >
        <div className="absolute inset-0 h-full w-full [backface-visibility:hidden]">
          <BaccaratCardBack />
        </div>
        <div className="absolute inset-0 h-full w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <BaccaratCardFace card={card} faceUp={faceUp} />
        </div>
      </div>
    </div>
  );
}
