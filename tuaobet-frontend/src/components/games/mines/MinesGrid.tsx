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
  const mineCountOnBoard = grid.reduce((n, isMine) => n + (isMine ? 1 : 0), 0);
  const boardResolved =
    (gameState === 'GAME_OVER' || gameState === 'CASHOUT') && mineCountOnBoard > 0;

  return (
    <div className="grid aspect-square w-full max-w-[min(100%,560px)] grid-cols-5 gap-2.5 sm:max-w-[600px] sm:gap-4">
      {Array.from({ length: 25 }).map((_, index) => (
        <MinesCell
          key={index}
          index={index}
          isMine={grid[index] ?? false}
          isPlayerOpened={revealed[index] ?? false}
          boardResolved={boardResolved}
          gameState={gameState}
          disabled={gameState !== 'PLAYING' || !!revealed[index] || isAutoPlaying}
          isAutoPlaying={isAutoPlaying}
          onReveal={onReveal}
        />
      ))}
    </div>
  );
}
