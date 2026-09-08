import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export const CRASH_COUNTDOWN_SECONDS = 6;
export const DOUBLE_COUNTDOWN_SECONDS = 12;

export type GameCountdownBarProps = {
  /** Fração de tempo restante entre 0 e 1 (1 = barra cheia). */
  progress: number;
  /** Conteúdo centrado sobre a barra (ex.: "Girando em 3.45s"). */
  children: ReactNode;
  className?: string;
  /** Classes da faixa de preenchimento (ex.: duração da transição). */
  fillClassName?: string;
  /** Classes do texto sobreposto. */
  labelClassName?: string;
};

/**
 * Barra de fase/countdown partilhada pelos jogos — trilho escuro TuaoBet + preenchimento neon.
 */
export function GameCountdownBar({
  progress,
  children,
  className,
  fillClassName,
  labelClassName,
}: GameCountdownBarProps) {
  const p = Math.min(1, Math.max(0, progress));
  const percentRounded = Math.round(p * 100);
  const widthPct = p * 100;
  /** Evita barra “invisível” com largura 0% mas tempo > 0. */
  const fillMinWidth = p > 0.001 && widthPct < 3 ? 3 : undefined;

  return (
    <div
      className={cn(
        'relative w-full min-h-7 h-7 rounded-md overflow-hidden',
        'bg-tuao-dark-950 border border-tuao-dark-700',
        'shadow-[inset_0_2px_4px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,240,255,0.12)]',
        'before:pointer-events-none before:absolute before:inset-x-3 before:top-0 before:h-px before:z-[1]',
        "before:content-['']",
        'before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent',
        className
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentRounded}
      aria-label="Tempo restante"
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 z-[1] h-full overflow-hidden rounded-md',
          'bg-gradient-to-r from-tuao-primary/85 via-tuao-primary to-tuao-primary-hover/95',
          'shadow-[0_0_24px_rgba(0,240,255,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]',
          'transition-none',
          fillClassName
        )}
        style={{
          width: `${widthPct}%`,
          minWidth: fillMinWidth,
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center px-2 text-center">
        <span
          className={cn(
            'text-xs font-bold tabular-nums tracking-tight text-white',
            'drop-shadow-[0_1px_2px_rgba(0,0,0,0.95),0_0_12px_rgba(0,0,0,0.5)]',
            labelClassName
          )}
        >
          {children}
        </span>
      </div>
    </div>
  );
}
