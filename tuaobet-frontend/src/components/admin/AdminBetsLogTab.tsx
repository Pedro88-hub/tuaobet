import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ApiError } from '../../services/api';
import { type AdminBetLogRow, fetchAdminBetsLog } from '../../services/adminApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { cn } from '../../lib/utils';

const PAGE = 40;

type Props = {
  onError: (msg: string | null) => void;
};

export const AdminBetsLogTab: React.FC<Props> = ({ onError }) => {
  const [bets, setBets] = useState<AdminBetLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 400);
  const [game, setGame] = useState('');
  const [result, setResult] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    onError(null);
    try {
      const r = await fetchAdminBetsLog({
        limit: PAGE,
        offset: page * PAGE,
        q: debouncedQ.trim() || undefined,
        game: game || undefined,
        result: result || undefined,
      });
      setBets(r.bets);
      setTotal(r.total);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao carregar apostas');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, game, result, onError]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, game, result]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="rounded-xl border border-tuao-dark-700 bg-tuao-dark-900/80 p-4">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <input
          type="search"
          placeholder="Email ou username…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[160px] flex-1 rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
        />
        <select
          value={game}
          onChange={(e) => setGame(e.target.value)}
          className="rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-2 py-2 text-xs text-white"
        >
          <option value="">Jogo (todos)</option>
          <option value="crash">crash</option>
          <option value="double">double</option>
          <option value="sport">sport</option>
          <option value="mines">mines</option>
          <option value="dice">dice</option>
          <option value="plinko">plinko</option>
        </select>
        <select
          value={result}
          onChange={(e) => setResult(e.target.value)}
          className="rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-2 py-2 text-xs text-white"
        >
          <option value="">Resultado</option>
          <option value="pending">pending</option>
          <option value="win">win</option>
          <option value="loss">loss</option>
        </select>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-tuao-dark-600 px-3 py-2 text-xs font-semibold uppercase text-white hover:bg-tuao-dark-800 disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(loading && 'animate-spin')} /> Atualizar
        </button>
      </div>

      <p className="mb-2 text-xs text-tuao-text-secondary">
        {total} aposta(s) {loading && '· a carregar…'}
      </p>

      <div className="max-h-[560px] overflow-auto rounded-lg border border-tuao-dark-800">
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-tuao-dark-950 text-tuao-text-secondary">
            <tr>
              <th className="p-2 font-semibold">Data</th>
              <th className="p-2 font-semibold">Usuário</th>
              <th className="p-2 font-semibold">Jogo</th>
              <th className="p-2 font-semibold">Valor</th>
              <th className="p-2 font-semibold">Res.</th>
              <th className="p-2 font-semibold">Retorno</th>
              <th className="p-2 font-semibold">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((b) => (
              <tr key={b.id} className="border-t border-tuao-dark-800/80 align-top">
                <td className="p-2 whitespace-nowrap text-tuao-text-secondary">
                  {new Date(b.createdAt).toLocaleString('pt-BR')}
                </td>
                <td className="p-2">
                  <span className="font-medium text-white">{b.user.username}</span>
                  <br />
                  <span className="text-[10px] text-tuao-text-secondary">{b.user.email}</span>
                </td>
                <td className="p-2 font-mono text-tuao-primary">{b.game}</td>
                <td className="p-2 tabular-nums">{b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td
                  className={cn(
                    'p-2 font-semibold',
                    b.result === 'win' && 'text-emerald-400',
                    b.result === 'loss' && 'text-red-400',
                    b.result === 'pending' && 'text-amber-300'
                  )}
                >
                  {b.result}
                </td>
                <td className="p-2 tabular-nums text-tuao-text-secondary">
                  {b.payout != null
                    ? b.payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                    : '—'}
                </td>
                <td className="max-w-[200px] p-2 text-[10px] text-tuao-text-secondary">
                  {b.sportFixture
                    ? `${b.sportFixture.homeTeamName} vs ${b.sportFixture.awayTeamName}`
                    : b.sportSelection
                      ? `${b.sportMarket ?? ''} ${b.sportSelection}`
                      : b.multiplier != null
                        ? `× ${b.multiplier}`
                        : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bets.length === 0 && !loading && (
        <p className="mt-3 text-xs text-tuao-text-secondary">Nenhuma aposta com estes filtros.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-tuao-text-secondary">
          Página {page + 1} / {pages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-tuao-dark-600 px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-tuao-dark-600 px-3 py-1.5 disabled:opacity-40"
          >
            Seguinte
          </button>
        </div>
      </div>
    </div>
  );
};
