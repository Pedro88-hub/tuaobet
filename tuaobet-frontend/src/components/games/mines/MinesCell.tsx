import minesBomb from '../../../assets/mines/bomb.png';
import minesDiamond from '../../../assets/mines/diamond.png';
import { cn } from '../../../lib/utils';
import type { GameState } from '../../../hooks/useMinesGame';

type MinesCellProps = {
  index: number;
  isMine: boolean;
  /** Casa aberta pelo jogador (não inclui flip cosmético). */
  isPlayerOpened: boolean;
  /** True quando o tabuleiro já tem as posições das minas (cashout/loss). */
  boardResolved: boolean;
  gameState: GameState;
  disabled: boolean;
  isAutoPlaying: boolean;
  onReveal: (index: number) => void;
};

export function MinesCell({
  index,
  isMine,
  isPlayerOpened,
  boardResolved,
  gameState,
  disabled,
  isAutoPlaying,
  onReveal,
}: MinesCellProps) {
  // Só abre casas não jogadas quando já temos o layout das minas (evita 25 diamantes fake).
  const showContent = isPlayerOpened || boardResolved;

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
          className="absolute inset-0 flex h-full w-full items-center justify-center rounded-lg border border-tuao-dark-800 bg-tuao-dark-950"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <img
            src={isMine ? minesBomb : minesDiamond}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none h-[72%] w-[72%] object-contain select-none sm:h-[78%] sm:w-[78%]"
          />
        </div>
      </div>
    </button>
  );
}
