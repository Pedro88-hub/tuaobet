import { Bomb, Gem } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { GameState } from '../../../hooks/useMinesGame';

type MinesCellProps = {
  index: number;
  isMine: boolean;
  /** Casa aberta pelo jogador (não inclui flip cosmético). */
  isPlayerOpened: boolean;
  gameState: GameState;
  disabled: boolean;
  isAutoPlaying: boolean;
  onReveal: (index: number) => void;
};

export function MinesCell({
  index,
  isMine,
  isPlayerOpened,
  gameState,
  disabled,
  isAutoPlaying,
  onReveal,
}: MinesCellProps) {
  const isGameOver = gameState === 'GAME_OVER';
  const isCashout = gameState === 'CASHOUT';
  const showContent = isPlayerOpened || isGameOver || isCashout;

  const bombClass = isGameOver
    ? 'fill-red-500 text-red-500'
    : isCashout
      ? 'text-white/35'
      : 'fill-red-500 text-red-500';

  const gemClass = isPlayerOpened
    ? 'fill-tuao-primary text-tuao-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.45)]'
    : 'text-tuao-primary/30';

  return (
    <button
      type="button"
      onClick={() => onReveal(index)}
      disabled={disabled}
      className={cn(
        'group relative aspect-square w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-tuao-primary/60',
        isAutoPlaying && gameState === 'PLAYING' && 'cursor-wait'
      )}
      style={{ perspective: '1000px' }}
    >
      <div
        className={cn(
          'relative h-full w-full transition-all duration-500',
          showContent ? '[transform:rotateY(180deg)]' : 'hover:-translate-y-0.5'
        )}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="absolute inset-0 flex h-full w-full items-center justify-center rounded-lg border-b-4 border-tuao-dark-950 bg-tuao-dark-800"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="h-full w-full rounded-lg bg-gradient-to-br from-tuao-dark-700 to-tuao-dark-800 opacity-50" />
        </div>

        <div
          className={cn(
            'absolute inset-0 flex h-full w-full items-center justify-center rounded-lg border border-tuao-dark-800 bg-tuao-dark-950',
            isGameOver && isMine && 'border-red-500/40 bg-red-500/15',
            isPlayerOpened &&
              !isMine &&
              'border-tuao-primary/35 bg-tuao-primary/[0.08] shadow-[0_0_14px_rgba(0,240,255,0.12)]'
          )}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {isMine ? (
            <Bomb
              className={cn('h-[46%] w-[46%] sm:h-[52%] sm:w-[52%]', bombClass)}
              aria-hidden
            />
          ) : (
            <Gem className={cn('h-[46%] w-[46%] sm:h-[52%] sm:w-[52%]', gemClass)} aria-hidden />
          )}
        </div>
      </div>
    </button>
  );
}
