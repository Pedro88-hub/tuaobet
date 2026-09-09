import { cn } from '../../../lib/utils';
import type { BaccaratHistoryCell, BaccaratSide } from '../../../hooks/useBaccaratGame';

const OUTCOME_LABEL: Record<BaccaratSide, string> = {
  player: 'J',
  banker: 'B',
  tie: 'E',
};

const OUTCOME_CLASS: Record<BaccaratSide, string> = {
  player: 'border-blue-500/40 bg-blue-950/80 text-blue-200',
  banker: 'border-red-500/40 bg-red-950/80 text-red-200',
  tie: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200',
};

export function BaccaratHistoryRoad({
  history,
}: {
  history: BaccaratHistoryCell[];
}) {
  const cells = [...history].reverse();

  return (
    <div className="min-w-0 shrink-0 border-b border-tuao-dark-800 bg-blaze-panel px-3 py-2.5 lg:bg-tuao-dark-950/50">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-tuao-text-secondary">
          Histórico
        </span>
        <span className="text-[10px] text-tuao-text-secondary/70">
          J Jogador · B Banca · E Empate
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
        {cells.length === 0 ? (
          <p className="py-1 text-[11px] text-tuao-text-secondary/70">Aguardando rodadas…</p>
        ) : (
          cells.map((cell, i) => (
            <div
              key={`${cell.outcome}-${cell.playerTotal}-${cell.bankerTotal}-${i}`}
              title={`Jogador ${cell.playerTotal} × Banca ${cell.bankerTotal}`}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-[11px] font-black',
                OUTCOME_CLASS[cell.outcome]
              )}
            >
              {OUTCOME_LABEL[cell.outcome]}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
