import { useId, useMemo } from 'react';
import { buildCrashCurve } from './crashCurveMath';
import { CrashTuaoLogoMark } from './CrashChartMarkers';

type Props = {
  multiplier: number;
};

function formatAxisSeconds(sec: number): string {
  if (sec <= 0) return '0s';
  if (sec < 12) return `${sec.toFixed(1)}s`;
  return `${Math.round(sec)}s`;
}

/**
 * Gráfico do crash: área sob a curva, linha com glow e marcador na ponta (mesmo visual em voo e após parar).
 */
export function CrashFlightChart({ multiplier }: Props) {
  const curve = useMemo(() => buildCrashCurve(multiplier), [multiplier]);
  const svgUid = useId().replace(/:/g, '');
  const lineGradId = `crashLineGrad-${svgUid}`;
  const areaGradId = `crashAreaGrad-${svgUid}`;
  const glowFilterId = `crashLineGlow-${svgUid}`;
  const chartClipId = `crashChartClip-${svgUid}`;

  return (
    <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
      <div className="absolute inset-2 min-h-0 min-w-0 overflow-hidden sm:inset-3 md:inset-4">
        {curve.gridLines.map((line) => (
          <div
            key={line.value}
            className="absolute flex w-full items-start border-t border-white/[0.08]"
            style={{ top: `${line.y}%` }}
          >
            <span className="mt-0.5 px-1 font-mono text-[10px] font-bold leading-none text-white/30 sm:px-2">
              {line.value.toFixed(2)}x
            </span>
          </div>
        ))}

        {curve.verticalTimeLines.map((v) => (
          <div
            key={v.tSec}
            className="pointer-events-none absolute bottom-0 top-0 w-px bg-gradient-to-b from-white/[0.07] via-white/[0.04] to-white/[0.07]"
            style={{ left: `${v.leftPct}%`, transform: 'translateX(-50%)' }}
            aria-hidden
          />
        ))}

        <svg
          className="absolute inset-0 block h-full w-full overflow-hidden"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <clipPath id={chartClipId} clipPathUnits="userSpaceOnUse">
              <rect x="0" y="0" width="100" height="100" />
            </clipPath>
            <linearGradient id={lineGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.55" />
              <stop offset="55%" stopColor="#7dd3fc" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>
            <linearGradient id={areaGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
            </linearGradient>
            <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g clipPath={`url(#${chartClipId})`}>
            <path
              d={curve.areaD}
              fill={`url(#${areaGradId})`}
              className="opacity-100 transition-opacity duration-300"
            />

            <path
              d={curve.pathD}
              fill="none"
              stroke={`url(#${lineGradId})`}
              strokeWidth={1.65}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              filter={`url(#${glowFilterId})`}
              className="drop-shadow-[0_0_10px_rgba(0,240,255,0.45)]"
            />
          </g>
        </svg>

        <div
          className="absolute z-20 will-change-transform"
          style={{
            left: `${curve.planeLeftPct}%`,
            bottom: `${curve.planeBottomPct}%`,
            transform: 'translate(-50%, 50%)',
          }}
        >
          <CrashTuaoLogoMark />
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 z-10 h-5 px-0.5 pb-0.5 sm:h-6"
          aria-hidden
        >
          {curve.timeAxisTicks.map((tick, idx) => (
            <span
              key={`${idx}-${tick.sec.toFixed(3)}`}
              className="font-mono text-[9px] font-bold tabular-nums text-white/35 sm:text-[10px]"
              style={{
                position: 'absolute',
                left: `${tick.leftPct}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {formatAxisSeconds(tick.sec)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
