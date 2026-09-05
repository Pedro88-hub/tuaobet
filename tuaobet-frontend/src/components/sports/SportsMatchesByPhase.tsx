import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Clock, Radio } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CachedMatchRow, Odds1x2 } from '../../services/sportsApi';
import type { Selection } from './SportBetModal';
import { SportsMatchCard } from './SportsMatchCard';
import { groupMatchesByCompetition, partitionMatchesByPhase } from './sportsMatchGroups';
import { CompetitionEmblem } from './SportsMatchCard';

interface SportsMatchesByPhaseProps {
  matches: CachedMatchRow[];
  odds: Odds1x2;
  isAuthenticated: boolean;
  onOpenBet: (m: CachedMatchRow, selection: Selection | null) => void;
  onOpenLogin: () => void;
}

function SectionHeader({
  id,
  headingId,
  icon: Icon,
  title,
  count,
  iconClassName,
}: {
  id: string;
  headingId: string;
  icon: LucideIcon;
  title: string;
  count: number;
  iconClassName?: string;
}) {
  return (
    <div id={id} className="scroll-mt-28">
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-900',
            iconClassName
          )}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        <div>
          <h2
            id={headingId}
            className="text-sm font-black uppercase tracking-wide text-white"
          >
            {title}
          </h2>
          <p className="text-[11px] text-tuao-text-secondary">
            {count === 0 ? 'Nenhum jogo' : `${count} jogo${count === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function SportsMatchesByPhase({
  matches,
  odds,
  isAuthenticated,
  onOpenBet,
  onOpenLogin,
}: SportsMatchesByPhaseProps) {
  const { live, upcoming, finished } = partitionMatchesByPhase(matches);

  const renderGrouped = (list: CachedMatchRow[]) => {
    const groups = groupMatchesByCompetition(list);
    return (
      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <div key={g.key}>
            <div className="mb-3 flex items-center gap-2 border-b border-tuao-dark-800 pb-2">
              <CompetitionEmblem emblemUrl={g.emblemUrl} label={g.label} />
              <span className="text-xs font-black uppercase tracking-wide text-white">
                {g.label}
              </span>
              <span className="text-[10px] text-tuao-text-secondary">
                ({g.matches.length})
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:gap-4">
              {g.matches.map((m) => (
                <SportsMatchCard
                  key={m.id}
                  m={m}
                  odds={odds}
                  prematch={m.status === 'SCHEDULED' || m.status === 'TIMED'}
                  isAuthenticated={isAuthenticated}
                  onSelectOdd={(sel) => onOpenBet(m, sel)}
                  onOpenMarkets={() => onOpenBet(m, null)}
                  onOpenLogin={onOpenLogin}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const emptyBox = (msg: string) => (
    <p className="rounded-xl border border-tuao-dark-800/80 bg-tuao-dark-900/25 px-4 py-8 text-center text-sm text-tuao-text-secondary">
      {msg}
    </p>
  );

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="sports-live-heading">
        <SectionHeader
          id="sports-ao-vivo"
          headingId="sports-live-heading"
          icon={Radio}
          title="Ao vivo"
          count={live.length}
          iconClassName="text-red-400"
        />
        {live.length === 0
          ? emptyBox(
              'Sem jogos ao vivo nesta janela. Sincroniza com Atualizar para estados mais recentes.'
            )
          : renderGrouped(live)}
      </section>

      <section aria-labelledby="sports-upcoming-heading">
        <SectionHeader
          id="sports-proximos"
          headingId="sports-upcoming-heading"
          icon={Clock}
          title="Vão acontecer"
          count={upcoming.length}
          iconClassName="text-tuao-primary"
        />
        {upcoming.length === 0
          ? emptyBox('Sem jogos agendados nesta janela.')
          : renderGrouped(upcoming)}
      </section>

      <section aria-labelledby="sports-finished-heading">
        <SectionHeader
          id="sports-terminados"
          headingId="sports-finished-heading"
          icon={CheckCircle2}
          title="Já aconteceram"
          count={finished.length}
          iconClassName="text-emerald-400/90"
        />
        {finished.length === 0
          ? emptyBox(
              'Sem jogos terminados listados (máx. 4 por competição nesta janela).'
            )
          : renderGrouped(finished)}
      </section>
    </div>
  );
}
