import React, { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../services/api';
import { type AdminAuditLogRow, fetchAuditLogs } from '../../services/adminApi';

const PAGE = 40;

type Props = {
  onError: (msg: string | null) => void;
};

export const AdminAuditTab: React.FC<Props> = ({ onError }) => {
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    onError(null);
    try {
      const r = await fetchAuditLogs(PAGE, page * PAGE);
      setLogs(r.logs);
      setTotal(r.total);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  }, [page, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="rounded-xl border border-tuao-dark-700 bg-tuao-dark-900/80 p-4">
      <h2 className="mb-3 text-sm font-bold text-white">Registo de ações (admin)</h2>
      <p className="mb-4 text-xs text-tuao-text-secondary">
        Alterações sensíveis (contas, saldo, senha, banners, avisos) ficam registadas com o administrador
        responsável.
      </p>
      {loading ? (
        <p className="text-sm text-tuao-text-secondary">A carregar…</p>
      ) : (
        <>
          <div className="max-h-[520px] overflow-auto rounded-lg border border-tuao-dark-800">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-tuao-dark-950 text-tuao-text-secondary">
                <tr>
                  <th className="p-2 font-semibold">Quando</th>
                  <th className="p-2 font-semibold">Admin</th>
                  <th className="p-2 font-semibold">Ação</th>
                  <th className="p-2 font-semibold">Alvo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-tuao-dark-800/80 align-top">
                    <td className="p-2 whitespace-nowrap text-tuao-text-secondary">
                      {new Date(l.createdAt).toLocaleString('pt-PT')}
                    </td>
                    <td className="p-2">
                      <span className="text-white">{l.admin.username}</span>
                      <br />
                      <span className="text-[10px] text-tuao-text-secondary">{l.admin.email}</span>
                    </td>
                    <td className="p-2 font-mono text-tuao-primary">{l.action}</td>
                    <td className="p-2 break-all text-tuao-text-secondary">
                      {l.targetUserId ?? '—'}
                      {l.metadata != null && (
                        <pre className="mt-1 max-h-24 overflow-auto rounded bg-tuao-dark-950 p-1 text-[9px] text-tuao-text-secondary">
                          {JSON.stringify(l.metadata, null, 0)}
                        </pre>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && <p className="mt-2 text-xs text-tuao-text-secondary">Sem registos.</p>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <span className="text-tuao-text-secondary">
              Página {page + 1} / {pages} · {total} total
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
        </>
      )}
    </div>
  );
};
