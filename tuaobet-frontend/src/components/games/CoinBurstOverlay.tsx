import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  getCrashBetAnchorEl,
  getWalletBalanceEl,
  onCoinBurst,
  rectCenter,
  type CoinBurstDetail,
} from '../../lib/gameFx';

type FlyingCoin = {
  id: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  delay: number;
  duration: number;
};

let coinId = 0;

function CoinSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#f5c542" stroke="#c99212" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="#ffe08a" strokeWidth="1.2" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="9"
        fontWeight="800"
        fill="#8a6a10"
        fontFamily="system-ui,sans-serif"
      >
        R$
      </text>
    </svg>
  );
}

export function CoinBurstOverlay() {
  const [coins, setCoins] = useState<FlyingCoin[]>([]);

  useEffect(() => {
    return onCoinBurst((detail: CoinBurstDetail) => {
      const wallet = rectCenter(getWalletBalanceEl());
      const bet = rectCenter(getCrashBetAnchorEl());
      if (!wallet || !bet) return;

      const from = detail.direction === 'out' ? wallet : bet;
      const to = detail.direction === 'out' ? bet : wallet;
      const count = detail.count ?? 8;
      const next: FlyingCoin[] = [];
      for (let i = 0; i < count; i++) {
        const jitterX = (Math.random() - 0.5) * 36;
        const jitterY = (Math.random() - 0.5) * 24;
        next.push({
          id: ++coinId,
          x0: from.x + jitterX * 0.35,
          y0: from.y + jitterY * 0.35,
          x1: to.x + jitterX,
          y1: to.y + jitterY,
          delay: i * 28,
          duration: 520 + Math.random() * 180,
        });
      }
      setCoins((prev) => [...prev, ...next]);
      const maxLife = 800 + count * 28;
      window.setTimeout(() => {
        setCoins((prev) => prev.filter((c) => !next.some((n) => n.id === c.id)));
      }, maxLife);
    });
  }, []);

  if (typeof document === 'undefined' || coins.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden" aria-hidden>
      {coins.map((c) => {
        const style = {
          animation: `tuao-coin-fly ${c.duration}ms cubic-bezier(0.22, 0.8, 0.28, 1) ${c.delay}ms forwards`,
          ['--coin-x0' as string]: `${c.x0}px`,
          ['--coin-y0' as string]: `${c.y0}px`,
          ['--coin-x1' as string]: `${c.x1}px`,
          ['--coin-y1' as string]: `${c.y1}px`,
        } as CSSProperties;
        return (
          <span key={c.id} className="absolute left-0 top-0 will-change-transform" style={style}>
            <CoinSvg className="h-5 w-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] sm:h-6 sm:w-6" />
          </span>
        );
      })}
      <style>{`
        @keyframes tuao-coin-fly {
          0% {
            transform: translate(calc(var(--coin-x0) - 12px), calc(var(--coin-y0) - 12px)) scale(0.55);
            opacity: 0;
          }
          12% { opacity: 1; }
          70% { opacity: 1; }
          100% {
            transform: translate(calc(var(--coin-x1) - 12px), calc(var(--coin-y1) - 12px)) scale(0.85);
            opacity: 0;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
