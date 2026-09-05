import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ApiError } from '../../services/api';
import {
  type AdminUser,
  type UserAccountStatus,
  type UserSortField,
  fetchAdminUsers,
} from '../../services/adminApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { AdminUserDetailPanel } from './AdminUserDetailPanel';
import { cn } from '../../lib/utils';

const PAGE_SIZE = 25;

type Props = {
  onFlash: (msg: string) => void;
  onError: (msg: string | null) => void;
};

export const AdminUsersTab: React.FC<Props> = ({ onFlash, onError }) => {
  const [userQ, setUserQ] = useState('');
  const debouncedQ = useDebouncedValue(userQ, 400);
  const [sortField, setSortField] = useState<UserSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<UserAccountStatus | ''>('');
  const [page, setPage] = useState(0);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    onError(null);
    try {
      const r = await fetchAdminUsers({
        q: debouncedQ,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        sort: sortField,
        order: sortOrder,
        status: statusFilter,
      });
      setUsers(r.users);
      setUsersTotal(r.total);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao carregar');
    } finally {
      setListLoading(false);
    }
  }, [debouncedQ, page, sortField, sortOrder, statusFilter, onError]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQ, sortField, sortOrder, statusFilter]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!selected) return;
    const still = users.find((u) => u.id === selected.id);
    if (still) setSelected(still);
  }, [users, selected?.id]);

  const totalPages = Math.max(1, Math.ceil(usersTotal / PAGE_SIZE));

  const openUser = (u: AdminUser) => {
    setSelected(u);
    onError(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="rounded-xl border border-tuao-dark-700 bg-tuao-dark-900/80 p-4">
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <input
            type="search"
            placeholder="Pesquisar email ou username…"
            value={userQ}
            onChange={(e) => setUserQ(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white placeholder:text-tuao-text-secondary/70"
          />
          <label className="flex flex-col text-[10px] font-semibold uppercase text-tuao-text-secondary">
            Ordenar
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as UserSortField)}
              className="mt-1 rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-2 py-2 text-xs text-white"
            >
              <option value="createdAt">Data de registo</option>
              <option value="balance">Saldo</option>
              <option value="xp">XP</option>
              <option value="email">Email</option>
              <option value="username">Username</option>
              <option value="status">Estado</option>
            </select>
          </label>
          <label className="flex flex-col text-[10px] font-semibold uppercase text-tuao-text-secondary">
            Ordem
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="mt-1 rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-2 py-2 text-xs text-white"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </label>
          <label className="flex flex-col text-[10px] font-semibold uppercase text-tuao-text-secondary">
            Estado
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserAccountStatus | '')}
              className="mt-1 rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-2 py-2 text-xs text-white"
            >
              <option value="">Todos</option>
              <option value="ACTIVE">Ativo</option>
              <option value="SUSPENDED">Suspenso</option>
              <option value="BANNED">Banido</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={listLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-tuao-dark-600 px-3 py-2 text-xs font-semibold uppercase text-white hover:bg-tuao-dark-800 disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(listLoading && 'animate-spin')} /> Atualizar
          </button>
        </div>
        <p className="mb-2 text-xs text-tuao-text-secondary">
          {usersTotal} conta(s)
          {listLoading && ' · a carregar…'}
        </p>
        <div className="max-h-[480px] overflow-auto rounded-lg border border-tuao-dark-800">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-tuao-dark-950 text-tuao-text-secondary">
              <tr>
                <th className="p-2 font-semibold">Utilizador</th>
                <th className="p-2 font-semibold">Email</th>
                <th className="p-2 font-semibold">Saldo</th>
                <th className="p-2 font-semibold">Papel</th>
                <th className="p-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className={cn(
                    'cursor-pointer border-t border-tuao-dark-800/80 hover:bg-tuao-dark-800/50',
                    selected?.id === u.id && 'bg-tuao-dark-800/80'
                  )}
                  onClick={() => openUser(u)}
                >
                  <td className="p-2 font-medium text-white">{u.username}</td>
                  <td className="p-2 text-tuao-text-secondary">{u.email}</td>
                  <td className="p-2 tabular-nums text-emerald-300/90">
                    {u.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2 text-[10px] font-semibold uppercase text-tuao-text-secondary">
                    {u.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-tuao-text-secondary">
            Página {page + 1} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 0 || listLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded border border-tuao-dark-600 px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1 || listLoading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-tuao-dark-600 px-3 py-1.5 disabled:opacity-40"
            >
              Seguinte
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-tuao-dark-700 bg-tuao-dark-900/80 p-4">
        {!selected ? (
          <p className="text-sm text-tuao-text-secondary">Seleciona uma conta na lista.</p>
        ) : (
          <AdminUserDetailPanel
            user={selected}
            onFlash={onFlash}
            onError={onError}
            onReloadList={loadUsers}
            onUpdateSelected={setSelected}
            onDeselect={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
};
