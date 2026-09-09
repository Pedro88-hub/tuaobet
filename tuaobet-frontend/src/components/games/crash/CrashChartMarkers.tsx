import { useId } from 'react';
import { cn } from '../../../lib/utils';
import crashPlane from '../../../assets/crash-plane.png';

/**
 * Marcador na ponta da curva — avião TuãoBet (substitui o hexágono com “T”).
 */
export function CrashTuaoLogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex h-11 w-[4.75rem] shrink-0 items-center justify-center sm:h-14 sm:w-24',
        className,
      )}
    >
      <div className="pointer-events-none absolute -inset-2 rounded-full bg-tuao-primary/18 blur-lg" aria-hidden />
      <img
        src={crashPlane}
        alt=""
        draggable={false}
        className="relative z-10 h-full w-full select-none object-contain drop-shadow-[0_0_16px_rgba(0,240,255,0.5)]"
        aria-hidden
      />
    </div>
  );
}

/**
 * Ícone de crash — impacto radial + X central (substitui chama genérica).
 */
export function CrashImpactIcon({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `crashImpactGrad-${uid}`;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-red-400', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="45%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" className="stroke-red-500/35" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="14" className="stroke-red-400/25" strokeWidth="1" strokeDasharray="3 4" />
      <g stroke={`url(#${gradId})`} strokeLinecap="round" strokeWidth="2.2">
        <path d="M24 6v10M24 32v10M6 24h10M32 24h10" />
        <path d="M11 11l7 7M30 30l7 7M37 11l-7 7M18 30l-7 7" opacity="0.9" />
      </g>
      <circle
        cx="24"
        cy="24"
        r="5.5"
        fill={`url(#${gradId})`}
        className="drop-shadow-[0_0_12px_rgba(248,113,113,0.9)]"
      />
      <path
        d="M20.5 20.5l7 7M27.5 20.5l-7 7"
        stroke="#FFFBEB"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.98"
      />
    </svg>
  );
}
