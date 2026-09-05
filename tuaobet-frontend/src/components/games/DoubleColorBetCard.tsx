import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import type { DoubleColor } from '../../hooks/useDoubleGame';

const surfaceByColor: Record<DoubleColor, string> = {
  red: cn(
    'relative flex-1 flex flex-col items-center justify-center',
    'bg-tuao-primary hover:bg-tuao-primary-hover text-tuao-dark-950',
    'border border-tuao-dark-950/15',
    'shadow-[0_0_20px_rgba(0,240,255,0.3)]'
  ),
  white: cn(
    'relative flex-1 flex flex-col items-center justify-center',
    'bg-white hover:bg-gray-100 text-tuao-dark-950',
    'border border-white/90',
    'shadow-[0_0_20px_rgba(255,255,255,0.12)]'
  ),
  black: cn(
    'relative flex-1 flex flex-col items-center justify-center',
    'bg-tuao-dark-800 hover:bg-tuao-dark-700 text-white',
    'border-2 border-tuao-dark-600',
    'shadow-inner'
  ),
};

const highlightByColor: Record<DoubleColor, string> = {
  red: 'ring-2 ring-white ring-inset z-[1] shadow-lg',
  white: 'ring-2 ring-tuao-dark-950 ring-inset z-[1] shadow-lg',
  black: 'ring-2 ring-white ring-inset z-[1] border-white shadow-lg',
};

export type DoubleColorBetCardProps = {
  color: DoubleColor;
  multiplier: string;
  disabled?: boolean;
  /** Destaque com borda clara (ex.: aposta ativa nesta cor na ronda). */
  highlighted?: boolean;
  onClick: () => void;
};

/**
 * Botão de aposta por cor no Double (lógica: red | white | black; “red” usa tuao-primary na UI).
 */
export function DoubleColorBetCard({
  color,
  multiplier,
  disabled,
  highlighted,
  onClick,
}: DoubleColorBetCardProps) {
  return (
    <Button
      type="button"
      className={cn(
        'h-[39px] min-h-[39px] rounded-lg px-1.5 py-0.5 min-w-0 flex-1',
        surfaceByColor[color],
        highlighted && highlightByColor[color]
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <span
        className={cn(
          'text-[0.7rem] font-black leading-none tracking-tight',
          color === 'white' && 'text-tuao-primary'
        )}
      >
        {multiplier}
      </span>
    </Button>
  );
}
