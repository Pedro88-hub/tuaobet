import { Crown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { BaccaratLiveBet, BetStacks } from '../../../hooks/useBaccaratGame';
import { levelFromXp, tierForLevel } from '../../../lib/xpDisplay';

const formatBrl = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function crownToneClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const r = Math.abs(h) % 3;
  if (r === 0) return 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]';
  if (r === 1) return 'text-tuao-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.35)]';
  return 'text-amber-400/95 drop-shadow-[0_0_6px_rgba(251,191,36,0.25)]';
}

function sideSummary(bets: BetStacks): string {
  const parts: string[] = [];
  if (bets.player > 0) parts.push(`J ${formatBrl(bets.player)}`);
  if (bets.tie > 0) parts.push(`E ${formatBrl(bets.tie)}`);
  if (bets.banker > 0) parts.push(`B ${formatBrl(bets.banker)}`);
  return parts.join(' · ') || '—';
}

export function BaccaratLiveBetsPanel({
  liveBets,
  pools,
  viewerUsername,
  viewerXp,
}: {
  liveBets: BaccaratLiveBet[];
  pools: BetStacks;
  viewerUsername?: string | null;
  viewerXp?: number;
}) {
  const totalPool = pools.player + pools.banker + pools.tie;

  return (
    <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden bg-tuao-dark-900">
      <div className="shrink-0 border-b border-tuao-dark-800 bg-tuao-dark-800/80 px-3 py-2.5 sm:px-4">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="text-[11px] font-medium leading-snug text-tuao-text-secondary sm:text-xs">
            {liveBets.length === 0
              ? 'Ainda sem apostas nesta rodada'
              : liveBets.length === 1
                ? '1 jogador fez a sua aposta'
                : `${liveBets.length} jogadores fizeram as suas apostas`}
          </p>
          <p className="text-sm font-bold tabular-nums text-white sm:shrink-0">
            R$ {formatBrl(totalPool)}
          </p>
        </div>
        {(pools.player > 0 || pools.banker > 0 || pools.tie > 0) && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold">
            <span className="rounded bg-blue-950/60 px-2 py-0.5 text-blue-200">
              J R$ {formatBrl(pools.player)}
            </span>
            <span className="rounded bg-emerald-950/60 px-2 py-0.5 text-emerald-200">
              E R$ {formatBrl(pools.tie)}
            </span>
            <span className="rounded bg-red-950/60 px-2 py-0.5 text-red-200">
              B R$ {formatBrl(pools.banker)}
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0 grid grid-cols-[minmax(0,1fr)_minmax(5rem,1.2fr)_5rem] items-center gap-1.5 border-b border-tuao-dark-800 bg-tuao-dark-800/95 px-3 py-2 sm:px-4">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-tuao-text-secondary sm:text-[10px]">
          Usuário
        </span>
        <span className="text-center text-[9px] font-bold uppercase tracking-[0.14em] text-tuao-text-secondary sm:text-[10px]">
          Lados
        </span>
        <span className="text-right text-[9px] font-bold uppercase tracking-[0.14em] text-tuao-text-secondary sm:text-[10px]">
          Total
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
        {liveBets.length === 0 ? (
          <div className="flex min-h-[140px] items-center justify-center px-4 py-8">
            <p className="text-center text-[11px] font-semibold text-tuao-text-secondary/80">
              Aguardando apostas…
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-tuao-dark-800/90">
            {liveBets.map((bet) => {
              const isViewer =
                !!viewerUsername &&
                bet.username.toLowerCase() === viewerUsername.toLowerCase();
              const crownClass = isViewer
                ? `${tierForLevel(levelFromXp(viewerXp ?? 0)).crownClass} drop-shadow-[0_0_8px_rgba(255,255,255,0.12)]`
                : crownToneClass(bet.id || bet.username);
              return (
                <li
                  key={bet.id}
                  className={cn(
                    'grid grid-cols-[minmax(0,1fr)_minmax(5rem,1.2fr)_5rem] items-center gap-1.5 px-3 py-2 text-[11px] sm:px-4 sm:py-2.5 sm:text-xs',
                    'hover:bg-tuao-dark-950/35',
                    isViewer && 'bg-tuao-dark-800/50 ring-1 ring-inset ring-tuao-primary/25'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Crown className={cn('h-3.5 w-3.5 shrink-0', crownClass)} strokeWidth={2.4} aria-hidden />
                    <span className="truncate font-semibold text-white/95">
                      {isViewer ? 'Tu' : bet.username}
                    </span>
                  </span>
                  <span className="truncate text-center text-[10px] font-medium text-tuao-text-secondary sm:text-[11px]">
                    {sideSummary(bet.bets)}
                  </span>
                  <span className="text-right font-semibold tabular-nums text-white/90">
                    R$ {formatBrl(bet.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
