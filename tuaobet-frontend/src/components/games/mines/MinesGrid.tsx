import type { GameState } from '../../../hooks/useMinesGame';
import { MinesCell } from './MinesCell';

type MinesGridProps = {
  grid: boolean[];
  revealed: boolean[];
  gameState: GameState;
  isAutoPlaying: boolean;
  onReveal: (index: number) => void;
};

export function MinesGrid({
  grid,
  revealed,
  gameState,
  isAutoPlaying,
  onReveal,
}: MinesGridProps) {
  return (
    <div className="grid aspect-square w-full max-w-[min(100%,560px)] grid-cols-5 gap-2.5 sm:max-w-[600px] sm:gap-4">
      {Array.from({ length: 25 }).map((_, index) => (
        <MinesCell
          key={index}
          index={index}
          isMine={grid[index] ?? false}
          isPlayerOpened={revealed[index] ?? false}
          gameState={gameState}
          disabled={gameState !== 'PLAYING' || !!revealed[index] || isAutoPlaying}
          isAutoPlaying={isAutoPlaying}
          onReveal={onReveal}
        />
      ))}
    </div>
  );
}
