import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../services/api';
import { fetchAdminDashboard, type AdminDashboardStats } from '../../services/adminApi';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

type Props = {
  onError: (msg: string | null) => void;
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-tuao-dark-700 bg-tuao-dark-900/80 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-tuao-text-secondary">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-white md:text-2xl">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-tuao-text-secondary">{sub}</p>}
    </div>
  );
}

export const AdminDashboardTab: React.FC<Props> = ({ onError }) => {
  const [data, setData] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    onError(null);
    try {
      const r = await fetchAdminDashboard();
      setData(r);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const fmt = (n: number, opts?: Intl.NumberFormatOptions) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2, ...opts });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-tuao-text-secondary">Visão geral da plataforma (últimas 24h onde aplicável)</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border border-tuao-dark-600 px-3 py-2 text-xs font-semibold uppercase text-white hover:bg-tuao-dark-800 disabled:opacity-50'
          )}
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> Atualizar
        </button>
      </div>

      {loading && !data && <p className="text-sm text-tuao-text-secondary">Carregando…</p>}

      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Usuários (total)" value={fmt(data.usersTotal, { maximumFractionDigits: 0 })} />
          <StatCard
            label="Contas ativas / suspensas / banidas"
            value={`${data.usersActive} / ${data.usersSuspended} / ${data.usersBanned}`}
            sub="Estado da conta"
          />
          <StatCard
            label="Novos registros (24h)"
            value={fmt(data.newUsersLast24h, { maximumFractionDigits: 0 })}
          />
          <StatCard
            label="Apostas (total na BD)"
            value={fmt(data.betsTotal, { maximumFractionDigits: 0 })}
          />
          <StatCard
            label="Apostas (24h)"
            value={fmt(data.betsLast24h, { maximumFractionDigits: 0 })}
            sub={`Volume ${fmt(data.betVolumeLast24h)} moeda`}
          />
          <StatCard
            label="Transações (24h)"
            value={fmt(data.transactionsLast24h, { maximumFractionDigits: 0 })}
          />
          <StatCard
            label="Soma de saldos (sistema)"
            value={fmt(data.totalBalanceInSystem)}
            sub="Referência — não é lucro"
          />
        </div>
      )}
    </div>
  );
};
