import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CachedMatchRow, Odds1x2 } from '../../services/sportsApi';
import { formatMatchWhen, teamInitials } from './sportsFormatters';

export type OddsSelection = 'HOME' | 'DRAW' | 'AWAY';

interface SportsMatchCardProps {
  m: CachedMatchRow;
  odds: Odds1x2;
  prematch: boolean;
  isAuthenticated: boolean;
  onSelectOdd: (selection: OddsSelection) => void;
  onOpenMarkets: () => void;
  onOpenLogin: () => void;
}

export function CompetitionEmblem({
  emblemUrl,
  label,
}: {
  emblemUrl?: string | null;
  label: string;
}) {
  const initials = teamInitials(label);
  const [showImg, setShowImg] = useState(Boolean(emblemUrl?.trim()));

  useEffect(() => {
    setShowImg(Boolean(emblemUrl?.trim()));
  }, [emblemUrl]);

  return (
    <div
      className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-tuao-dark-700 bg-tuao-dark-950"
      aria-hidden
    >
      {showImg && emblemUrl ? (
        <img
          src={emblemUrl}
          alt=""
          className="h-full w-full object-contain p-0.5"
          loading="lazy"
          decoding="async"
          onError={() => setShowImg(false)}
        />
      ) : (
        <span className="text-[9px] font-black text-tuao-text-secondary">{initials}</span>
      )}
    </div>
  );
}

function TeamRow({ name, crestUrl }: { name: string; crestUrl?: string | null }) {
  const initials = teamInitials(name);
  const [showImg, setShowImg] = useState(Boolean(crestUrl?.trim()));

  useEffect(() => {
    setShowImg(Boolean(crestUrl?.trim()));
  }, [crestUrl]);

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div
        className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-tuao-dark-700 bg-tuao-dark-950"
        aria-hidden
      >
        {showImg && crestUrl ? (
          <img
            src={crestUrl}
            alt=""
            className="h-full w-full object-contain p-0.5"
            loading="lazy"
            decoding="async"
            onError={() => setShowImg(false)}
          />
        ) : (
          <span className="text-[10px] font-black text-tuao-text-secondary">{initials}</span>
        )}
      </div>
      <span className="min-w-0 truncate text-sm font-semibold text-white">{name}</span>
    </div>
  );
}

export function SportsMatchCard({
  m,
  odds,
  prematch,
  isAuthenticated,
  onSelectOdd,
  onOpenMarkets,
  onOpenLogin,
}: SportsMatchCardProps) {
  const league = m.competition?.name ?? m.competition?.code ?? 'Competição';
  const when = formatMatchWhen(m.utcDate);

  const oddBtn = (selection: OddsSelection, label: string, value: number) => {
    const disabled = !prematch;
    const handle = () => {
      if (disabled) return;
      if (!isAuthenticated) {
        onOpenLogin();
        return;
      }
      onSelectOdd(selection);
    };
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={handle}
        className={cn(
          'flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-2 transition-colors',
          disabled
            ? 'cursor-not-allowed border-tuao-dark-800 bg-tuao-dark-950/50 opacity-50'
            : 'border-tuao-dark-700 bg-tuao-dark-950 hover:border-tuao-primary/40 hover:bg-tuao-dark-800'
        )}
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-tuao-text-secondary">
          {label}
        </span>
        <span className="text-sm font-black tabular-nums text-white">{value.toFixed(2)}</span>
      </button>
    );
  };

  return (
    <article
      className={cn(
        'rounded-xl border border-tuao-dark-800 bg-tuao-dark-900/80 p-3 shadow-card transition-colors',
        'hover:border-tuao-dark-700 hover:bg-tuao-dark-900'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2 text-[11px]">
        <div className="flex min-w-0 items-center gap-2">
          <CompetitionEmblem emblemUrl={m.competition.emblemUrl} label={league} />
          <span className="min-w-0 truncate font-medium text-tuao-text-secondary">{league}</span>
        </div>
        <span className="shrink-0 tabular-nums text-tuao-text-secondary">{when}</span>
      </div>

      <div className="mb-4 flex flex-col gap-2.5">
        <TeamRow name={m.homeTeam.name} crestUrl={m.homeTeam.crestUrl} />
        <TeamRow name={m.awayTeam.name} crestUrl={m.awayTeam.crestUrl} />
      </div>

      <div className="flex items-stretch gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-tuao-text-secondary">
            1x2
          </span>
          <div className="flex gap-1.5">
            {oddBtn('HOME', '1', odds.home)}
            {oddBtn('DRAW', 'empate', odds.draw)}
            {oddBtn('AWAY', '2', odds.away)}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenMarkets}
          className="mt-auto flex h-[52px] w-10 shrink-0 items-center justify-center self-end rounded-lg border border-tuao-dark-700 bg-tuao-dark-950 text-tuao-text-secondary transition-colors hover:border-tuao-primary/35 hover:text-tuao-primary"
          aria-label="Mais mercados"
        >
          <ChevronDown size={18} strokeWidth={2} />
        </button>
      </div>
    </article>
  );
}
