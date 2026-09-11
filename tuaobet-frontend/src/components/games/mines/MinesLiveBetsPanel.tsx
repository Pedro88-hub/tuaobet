import { Crown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { MinesLivePlayer } from '../../../hooks/useMinesLiveBets';

const MAX_VISIBLE = 14;

const formatBrlAmount = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function crownToneClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const r = Math.abs(h) % 3;
  if (r === 0) return 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]';
  if (r === 1) return 'text-tuao-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.35)]';
  return 'text-amber-400/95 drop-shadow-[0_0_6px_rgba(251,191,36,0.25)]';
}

type MinesLiveBetsPanelProps = {
  liveBets: MinesLivePlayer[];
};

export function MinesLiveBetsPanel({ liveBets }: MinesLiveBetsPanelProps) {
  return (
    <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden bg-blaze-panel lg:bg-tuao-dark-900">
      <div className="shrink-0 border-b border-tuao-dark-800 bg-[#1a242d]/55 px-3 py-3 lg:bg-tuao-dark-950/55">
        <p className="text-[13px] font-black uppercase leading-tight tracking-tight text-white">
          Apostas ao vivo
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-tuao-text-secondary/90">
          Jogadores a jogar neste momento
        </p>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 bg-tuao-dark-800/95 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-tuao-text-secondary">
          Usuário
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-tuao-text-secondary">
          Minas
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-tuao-text-secondary">
          Valor
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
        {liveBets.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center px-4 py-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary/80">
              Aguardando apostas
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-tuao-dark-800/80">
            {[...liveBets]
              .sort((a, b) => b.amount - a.amount)
              .slice(0, MAX_VISIBLE)
              .map((bet) => {
                const label = bet.username || bet.name || '—';
                const seed = bet.id || label;
                return (
                  <li
                    key={bet.id}
                    className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-tuao-dark-950/40"
                  >
                    <Crown
                      className={cn('h-3.5 w-3.5 shrink-0', crownToneClass(seed))}
                      strokeWidth={2.4}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold text-white">
                      {label}
                    </span>
                    <span className="w-10 shrink-0 text-center text-[12px] font-bold tabular-nums text-tuao-text-secondary">
                      {bet.minesCount}
                    </span>
                    <span className="w-[4.5rem] shrink-0 text-right text-[12px] font-semibold tabular-nums text-white/95">
                      {formatBrlAmount(bet.amount)}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
      {liveBets.length > MAX_VISIBLE && (
        <div className="shrink-0 border-t border-tuao-dark-800 bg-tuao-dark-950/60 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-tuao-text-secondary">
          +{liveBets.length - MAX_VISIBLE} na fila
        </div>
      )}
    </div>
  );
}
