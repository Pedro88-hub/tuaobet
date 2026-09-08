import { cn } from '../../../lib/utils';

export type PlacedChip = { id: number; value: number };

export function BaccaratChipIcon({
  value,
  small,
}: {
  value: number;
  small?: boolean;
}) {
  type ChipPalette = {
    edge: string;
    face: string;
    faceDark: string;
    stripe: string;
    text: string;
    accent: string;
  };
  const palette: ChipPalette =
    value >= 100
      ? {
          edge: '#27272a',
          face: '#3f3f46',
          faceDark: '#18181b',
          stripe: '#fafafa',
          text: '#fef3c7',
          accent: '#facc15',
        }
      : value >= 25
        ? {
            edge: '#065f46',
            face: '#10b981',
            faceDark: '#065f46',
            stripe: '#ecfeff',
            text: '#ffffff',
            accent: '#fef3c7',
          }
        : value >= 5
          ? {
              edge: '#7f1d1d',
              face: '#dc2626',
              faceDark: '#991b1b',
              stripe: '#fff1f2',
              text: '#ffffff',
              accent: '#fef3c7',
            }
          : {
              edge: '#94a3b8',
              face: '#f8fafc',
              faceDark: '#cbd5e1',
              stripe: '#1e293b',
              text: '#1e293b',
              accent: '#b45309',
            };
  const size = small ? 32 : 44;
  const conic = `conic-gradient(
    ${palette.edge} 0deg 30deg, ${palette.stripe} 30deg 45deg,
    ${palette.edge} 45deg 75deg, ${palette.stripe} 75deg 90deg,
    ${palette.edge} 90deg 120deg, ${palette.stripe} 120deg 135deg,
    ${palette.edge} 135deg 165deg, ${palette.stripe} 165deg 180deg,
    ${palette.edge} 180deg 210deg, ${palette.stripe} 210deg 225deg,
    ${palette.edge} 225deg 255deg, ${palette.stripe} 255deg 270deg,
    ${palette.edge} 270deg 300deg, ${palette.stripe} 300deg 315deg,
    ${palette.edge} 315deg 345deg, ${palette.stripe} 345deg 360deg
  )`;
  return (
    <div
      className="relative shrink-0"
      style={{
        height: size,
        width: size,
        borderRadius: '9999px',
        background: conic,
        boxShadow:
          '0 4px 8px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.15) inset, 0 -2px 6px rgba(0,0,0,0.55) inset',
      }}
      aria-hidden
    >
      <div
        className="absolute flex items-center justify-center font-black"
        style={{
          inset: small ? 4 : 6,
          borderRadius: '9999px',
          background: `radial-gradient(circle at 30% 25%, ${palette.face} 0%, ${palette.faceDark} 100%)`,
          boxShadow:
            '0 0 0 1px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.06) inset, 0 2px 4px rgba(0,0,0,0.35) inset',
          color: palette.text,
          fontSize: small ? 10 : 13,
          letterSpacing: '0.02em',
        }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: `1px dashed ${palette.accent}55`,
            margin: small ? 2 : 3,
            opacity: 0.7,
          }}
        />
        <span style={{ textShadow: '0 1px 1px rgba(0,0,0,0.4)' }}>{value}</span>
      </div>
    </div>
  );
}

export function BaccaratChipStack({
  chips,
  emphasize,
}: {
  chips: PlacedChip[];
  emphasize?: boolean;
}) {
  if (chips.length === 0) return null;
  const visible = chips.slice(-6);
  const overflow = chips.length - visible.length;
  return (
    <div
      className={cn(
        'relative h-10 w-10',
        emphasize && 'motion-safe:animate-baccarat-win-pulse rounded-full'
      )}
    >
      {visible.map((c, idx) => {
        const isTop = idx === visible.length - 1;
        return (
          <div
            key={c.id}
            className={cn(
              'absolute left-0 right-0 flex justify-center',
              isTop && 'motion-safe:animate-baccarat-chip-place'
            )}
            style={{ bottom: idx * 4 }}
          >
            <BaccaratChipIcon value={c.value} small />
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className="absolute -right-1 -top-1 rounded-full px-1.5 py-px text-[9px] font-black"
          style={{
            background: 'linear-gradient(180deg,#fde68a,#b45309)',
            color: '#3f1d10',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
