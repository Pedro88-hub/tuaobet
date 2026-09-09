import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import type { DoubleColor } from '../../hooks/useDoubleGame';
import tuaoLogo from '../../assets/tuao-logo.png';

/** Classes de cor iguais aos quadrados da roleta (número 0 = branco, 1–7 “vermelho” com tuao-primary na UI, 8–14 preto). */
export function doubleTileClassesForNumber(num: number): string {
  let colorClass = 'bg-tuao-dark-800 border-tuao-dark-700 text-white';
  if (num === 0) colorClass = 'bg-white text-black border-gray-300';
  if (num >= 1 && num <= 7) colorClass = 'bg-tuao-primary text-tuao-dark-950 border-tuao-dark-950/25';
  if (num >= 8 && num <= 14) colorClass = 'bg-tuao-dark-800 text-white border-tuao-dark-700';
  return colorClass;
}

export function doubleTileClassesForColor(color: DoubleColor): string {
  if (color === 'red') return 'bg-tuao-primary text-tuao-dark-950 border-tuao-dark-950/25';
  if (color === 'white') return 'bg-white text-black border-gray-300';
  return 'bg-tuao-dark-800 text-white border-tuao-dark-700';
}

/** Número de exemplo por coluna de aposta (mesma paleta que na roleta). */
export function sampleNumberForBetColor(color: DoubleColor): number {
  if (color === 'red') return 3;
  if (color === 'white') return 0;
  return 10;
}

const tileShell = 'rounded-lg border-b-4 font-bold shadow-lg relative';
const baseTile = cn('flex items-center justify-center shrink-0', tileShell);

type DoubleRouletteTileProps = {
  number: number;
  variant: 'strip' | 'compact';
  className?: string;
  style?: CSSProperties;
  title?: string;
};

/**
 * Quadrado idêntico em estilo ao da roleta (borda inferior grossa, cores por número).
 */
export function DoubleRouletteTile({ number, variant, className, style, title }: DoubleRouletteTileProps) {
  const colorClass = doubleTileClassesForNumber(number);

  if (variant === 'strip') {
    if (number === 0) {
      return (
        <div className={cn(baseTile, 'text-xl', colorClass, className)} style={style} title={title}>
          <div className="box-border flex aspect-square w-[min(74%,3.35rem)] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-tuao-primary bg-white shadow-[0_0_22px_rgba(0,240,255,0.45)]">
            <img
              src={tuaoLogo}
              alt=""
              draggable={false}
              className="h-[82%] w-[82%] select-none object-contain"
              aria-hidden
            />
          </div>
        </div>
      );
    }
    return (
      <div className={cn(baseTile, 'text-xl', colorClass, className)} style={style} title={title}>
        {number}
      </div>
    );
  }

  /** Histórico: mesmo footprint que botões h-8 w-8 (32px), alinhado numa única linha. */
  const compactShell =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-b-2 text-[11px] font-bold leading-none shadow-sm';

  return (
    <div className={cn(compactShell, colorClass, className)} style={style} title={title}>
      {number === 0 ? (
        <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-tuao-primary bg-white shadow-[0_0_12px_rgba(0,240,255,0.4)]">
          <img
            src={tuaoLogo}
            alt=""
            draggable={false}
            className="h-[78%] w-[78%] select-none object-contain"
            aria-hidden
          />
        </div>
      ) : (
        number
      )}
    </div>
  );
}

type DoubleBetTileRowProps = {
  color: DoubleColor;
  children: ReactNode;
  className?: string;
};

/**
 * Cartão em formato de peça da roleta (retângulo com border-b-4), preenchido com conteúdo livre (apostas).
 */
export function DoubleBetTileRow({ color, children, className }: DoubleBetTileRowProps) {
  return (
    <div
      className={cn(
        'flex flex-row items-center justify-between gap-2 w-full min-h-[52px] px-2.5 py-2 shrink-0',
        tileShell,
        doubleTileClassesForColor(color),
        className
      )}
    >
      {children}
    </div>
  );
}
