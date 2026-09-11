import minesBomb from '../../../assets/mines/bomb.png';
import minesDiamond from '../../../assets/mines/diamond.png';
import type { GameState } from '../../../hooks/useMinesGame';

type MinesResultOverlayProps = {
  gameState: GameState;
  multiplier: number;
  payout: number;
};

export function MinesResultOverlay({ gameState, multiplier, payout }: MinesResultOverlayProps) {
  if (gameState !== 'GAME_OVER' && gameState !== 'CASHOUT') return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="animate-in fade-in zoom-in flex flex-col items-center rounded-2xl border border-tuao-dark-700 bg-tuao-dark-950/92 px-8 py-6 shadow-2xl backdrop-blur-sm duration-300">
        {gameState === 'CASHOUT' ? (
          <>
            <img
              src={minesDiamond}
              alt=""
              aria-hidden
              draggable={false}
              className="mb-2 h-14 w-14 object-contain drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]"
            />
            <h2 className="text-xl font-black uppercase tracking-wider text-tuao-primary">Vitória</h2>
            <div className="mt-2 font-mono text-3xl font-bold text-white">
              {multiplier.toFixed(2)}×
            </div>
            <div className="mt-1 font-mono text-sm text-tuao-text-secondary">
              R${' '}
              {payout.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </>
        ) : (
          <>
            <img
              src={minesBomb}
              alt=""
              aria-hidden
              draggable={false}
              className="mb-2 h-14 w-14 object-contain"
            />
            <h2 className="text-xl font-black uppercase tracking-wider text-red-500">Explodiu</h2>
            <div className="mt-2 text-sm text-tuao-text-secondary">Tente outra rodada</div>
          </>
        )}
      </div>
    </div>
  );
}
