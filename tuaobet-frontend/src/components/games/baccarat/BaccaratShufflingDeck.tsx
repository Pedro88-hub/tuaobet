import { BaccaratCardBack } from './BaccaratCard';

export function BaccaratShufflingDeck({ statusText }: { statusText: string }) {
  const CARD_H_PX = 72;
  const CARD_W_PX = 50;
  const HALF = 6;
  return (
    <div className="pointer-events-none flex flex-col items-center gap-2" aria-hidden>
      <div
        className="relative rounded-2xl p-3 backdrop-blur-[3px]"
        style={{
          minHeight: CARD_H_PX + 38,
          minWidth: CARD_W_PX + 120,
          background:
            'radial-gradient(120% 70% at 50% 30%, rgba(0,0,0,0.45), rgba(0,0,0,0.15) 70%)',
          border: '1px solid rgba(251,191,36,0.30)',
          boxShadow:
            '0 14px 40px rgba(0,0,0,0.55), inset 0 0 18px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-3 top-1 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(251,191,36,0.65), transparent)',
          }}
        />
        <div
          className="relative mx-auto motion-safe:animate-baccarat-shuffle-bob"
          style={{ height: CARD_H_PX, width: CARD_W_PX + 96 }}
        >
          <div
            className="absolute bottom-0 left-0 motion-safe:animate-baccarat-shuffle-fan-l"
            style={{ width: CARD_W_PX, height: CARD_H_PX, transformOrigin: '50% 100%' }}
          >
            {Array.from({ length: HALF }).map((_, i) => (
              <div
                key={`l-${i}`}
                className="absolute bottom-0 left-0 motion-safe:animate-baccarat-shuffle-riffle-l"
                style={{
                  transform: `translate(${i * 0.6}px, ${-i * 1.6}px) rotate(${-2 + i * 0.4}deg)`,
                  zIndex: i + 1,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <BaccaratCardBack compact />
              </div>
            ))}
          </div>
          <div
            className="absolute bottom-0 right-0 motion-safe:animate-baccarat-shuffle-fan-r"
            style={{ width: CARD_W_PX, height: CARD_H_PX, transformOrigin: '50% 100%' }}
          >
            {Array.from({ length: HALF }).map((_, i) => (
              <div
                key={`r-${i}`}
                className="absolute bottom-0 right-0 motion-safe:animate-baccarat-shuffle-riffle-r"
                style={{
                  transform: `translate(${-i * 0.6}px, ${-i * 1.6}px) rotate(${2 - i * 0.4}deg)`,
                  zIndex: i + 1,
                  animationDelay: `${i * 60 + 30}ms`,
                }}
              >
                <BaccaratCardBack compact />
              </div>
            ))}
          </div>
          <div
            className="absolute bottom-0 left-1/2 -z-10 -translate-x-1/2"
            style={{
              width: CARD_W_PX + 8,
              height: 6,
              borderRadius: '50%',
              background:
                'radial-gradient(50% 100% at 50% 50%, rgba(0,0,0,0.5), transparent 70%)',
              filter: 'blur(1px)',
            }}
          />
        </div>
      </div>
      <p
        className="max-w-[14rem] text-center text-[10px] font-bold uppercase tracking-[0.22em] md:text-[11px]"
        style={{
          color: '#fde68a',
          textShadow: '0 1px 0 rgba(0,0,0,0.55), 0 0 12px rgba(251,191,36,0.35)',
        }}
      >
        {statusText}
      </p>
    </div>
  );
}
