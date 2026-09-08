import { cn } from '../../../lib/utils';
import {
  BACCARAT_ODDS,
  type BaccaratSide,
  type BetStacks,
} from '../../../hooks/useBaccaratGame';
import { BaccaratChipStack, type PlacedChip } from './BaccaratChip';

const formatBrl = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ZoneKey = keyof BetStacks;

const ZONE_META: Record<
  ZoneKey,
  { label: string; odds: string; labelClass: string; hoverClass: string }
> = {
  player: {
    label: 'Jogador',
    odds: BACCARAT_ODDS.player,
    labelClass: 'text-blue-200',
    hoverClass: 'hover:bg-blue-500/10',
  },
  tie: {
    label: 'Empate',
    odds: BACCARAT_ODDS.tie,
    labelClass: 'text-emerald-200',
    hoverClass: 'hover:bg-emerald-500/10',
  },
  banker: {
    label: 'Banca',
    odds: BACCARAT_ODDS.banker,
    labelClass: 'text-red-200',
    hoverClass: 'hover:bg-red-500/10',
  },
};

export function BaccaratBetCapsule({
  stacks,
  acceptedBets,
  pools,
  placedChips,
  bettingLocked,
  outcomeDone,
  onAddChip,
}: {
  stacks: BetStacks;
  acceptedBets: BetStacks | null;
  pools: BetStacks;
  placedChips: Record<ZoneKey, PlacedChip[]>;
  bettingLocked: boolean;
  outcomeDone?: BaccaratSide;
  onAddChip: (zone: ZoneKey) => void;
}) {
  const zones: ZoneKey[] = ['player', 'tie', 'banker'];

  return (
    <div
      className="flex w-full max-w-[640px] items-stretch justify-between overflow-hidden rounded-2xl bg-black/45 shadow-[0_10px_30px_rgba(0,0,0,0.55)] backdrop-blur-md sm:rounded-full"
      style={{
        border: '1px solid rgba(251,191,36,0.35)',
        boxShadow:
          '0 10px 30px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 0 18px rgba(0,0,0,0.45)',
      }}
      role="group"
      aria-label="Zonas de aposta"
    >
      {zones.map((zone, i) => {
        const meta = ZONE_META[zone];
        const yourStake = acceptedBets ? acceptedBets[zone] : stacks[zone];
        const pool = pools[zone];
        const chips = !acceptedBets ? placedChips[zone] : [];

        return (
          <div key={zone} className="flex min-w-0 flex-1 items-stretch">
            {i > 0 && (
              <div
                aria-hidden
                className="my-1 w-px shrink-0"
                style={{
                  background:
                    'linear-gradient(180deg, transparent 0%, rgba(251,191,36,0.4) 50%, transparent 100%)',
                }}
              />
            )}
            <button
              type="button"
              onClick={() => onAddChip(zone)}
              disabled={bettingLocked}
              aria-label={`Apostar em ${meta.label}, odds ${meta.odds}`}
              className={cn(
                'group relative flex min-h-12 w-full flex-col items-center justify-center gap-0.5 px-2 py-3 text-center transition active:scale-[0.97] sm:min-h-[3.25rem] sm:px-4',
                zone === 'tie' && 'bg-black/20',
                !bettingLocked && meta.hoverClass,
                bettingLocked && 'cursor-not-allowed opacity-60',
                outcomeDone === zone &&
                  'motion-safe:animate-baccarat-win-pulse bg-amber-400/15'
              )}
            >
              <span
                className={cn(
                  'text-[10px] font-black uppercase tracking-[0.18em] sm:text-[11px]',
                  meta.labelClass
                )}
              >
                {meta.label}
              </span>
              <span className="font-mono text-[12px] font-bold text-white sm:text-[13px]">
                R$ {formatBrl(yourStake)}
              </span>
              {pool > 0 && (
                <span className="text-[9px] font-semibold text-white/45">
                  Sala R$ {formatBrl(pool)}
                </span>
              )}
              <span className="text-[9px] font-bold tracking-wider text-amber-200/70">
                {meta.odds}
              </span>
              {chips.length > 0 && (
                <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2">
                  <BaccaratChipStack chips={chips} />
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
