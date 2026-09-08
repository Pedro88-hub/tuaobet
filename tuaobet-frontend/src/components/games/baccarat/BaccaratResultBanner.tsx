import { cn } from '../../../lib/utils';
import type { BaccaratSide, BetStacks } from '../../../hooks/useBaccaratGame';

const formatBrl = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const OUTCOME_LABEL: Record<BaccaratSide, string> = {
  player: 'Jogador venceu',
  banker: 'Banca venceu',
  tie: 'Empate',
};

export function BaccaratResultBanner({
  outcome,
  personalPayout,
  acceptedBets,
}: {
  outcome: BaccaratSide;
  personalPayout: number | null;
  acceptedBets: BetStacks | null;
}) {
  const hadPlayerOrBanker =
    !!acceptedBets && (acceptedBets.player > 0 || acceptedBets.banker > 0);
  const showPush = outcome === 'tie' && hadPlayerOrBanker && personalPayout !== null && personalPayout > 0;

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-center backdrop-blur-sm',
        outcome === 'player' && 'border-blue-400/40 bg-blue-950/70',
        outcome === 'banker' && 'border-red-400/40 bg-red-950/70',
        outcome === 'tie' && 'border-emerald-400/40 bg-emerald-950/70'
      )}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-bold text-white">{OUTCOME_LABEL[outcome]}</p>
      {showPush && (
        <p className="mt-0.5 text-[11px] text-emerald-200/90">
          Apostas em Jogador/Banca devolvidas (push)
        </p>
      )}
      {personalPayout !== null && (
        <p
          className={cn(
            'mt-0.5 font-mono text-xs font-bold',
            personalPayout > 0 ? 'text-amber-200' : 'text-red-300'
          )}
        >
          {personalPayout > 0
            ? `+R$ ${formatBrl(personalPayout)}`
            : 'Sem ganho nesta ronda'}
        </p>
      )}
    </div>
  );
}
