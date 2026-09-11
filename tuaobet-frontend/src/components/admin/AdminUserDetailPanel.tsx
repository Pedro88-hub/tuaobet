import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ApiError } from '../../services/api';
import {
  type AdminBetRow,
  type AdminTransactionRow,
  type AdminUser,
  type UserAccountStatus,
  deleteAdminUser,
  fetchUserBets,
  fetchUserTransactions,
  patchAdminUser,
  postAdminUserBalance,
  postAdminUserPassword,
} from '../../services/adminApi';
import { cn } from '../../lib/utils';

type SubTab = 'profile' | 'transactions' | 'bets';

type Props = {
  user: AdminUser;
  onFlash: (msg: string) => void;
  onError: (msg: string | null) => void;
  onReloadList: () => Promise<void>;
  onUpdateSelected: (u: AdminUser) => void;
  onDeselect: () => void;
};

const PAGE = 15;

export const AdminUserDetailPanel: React.FC<Props> = ({
  user,
  onFlash,
  onError,
  onReloadList,
  onUpdateSelected,
  onDeselect,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('profile');
  const [editEmail, setEditEmail] = useState(user.email);
  const [editUsername, setEditUsername] = useState(user.username);
  const [editRole, setEditRole] = useState<'USER' | 'ADMIN'>(user.role);
  const [editStatus, setEditStatus] = useState<UserAccountStatus>(user.status);
  const [editXp, setEditXp] = useState(user.xp);
  const [newPassword, setNewPassword] = useState('');
  const [balanceDelta, setBalanceDelta] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingBalance, setSavingBalance] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [tx, setTx] = useState<AdminTransactionRow[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(0);
  const [txLoading, setTxLoading] = useState(false);

  const [bets, setBets] = useState<AdminBetRow[]>([]);
  const [betsTotal, setBetsTotal] = useState(0);
  const [betsPage, setBetsPage] = useState(0);
  const [betsLoading, setBetsLoading] = useState(false);

  useEffect(() => {
    setEditEmail(user.email);
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditXp(user.xp);
    setNewPassword('');
    setBalanceDelta('');
    setBalanceReason('');
    setSubTab('profile');
    setTxPage(0);
    setBetsPage(0);
  }, [user.id, user.email, user.username, user.role, user.status, user.xp]);

  const loadTx = useCallback(async () => {
    setTxLoading(true);
    onError(null);
    try {
      const r = await fetchUserTransactions(user.id, PAGE, txPage * PAGE);
      setTx(r.transactions);
      setTxTotal(r.total);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao carregar transações');
    } finally {
      setTxLoading(false);
    }
  }, [user.id, txPage, onError]);

  const loadBets = useCallback(async () => {
    setBetsLoading(true);
    onError(null);
    try {
      const r = await fetchUserBets(user.id, PAGE, betsPage * PAGE);
      setBets(r.bets);
      setBetsTotal(r.total);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao carregar apostas');
    } finally {
      setBetsLoading(false);
    }
  }, [user.id, betsPage, onError]);

  useEffect(() => {
    if (subTab !== 'transactions') return;
    void loadTx();
  }, [subTab, loadTx]);

  useEffect(() => {
    if (subTab !== 'bets') return;
    void loadBets();
  }, [subTab, loadBets]);

  const saveUser = async () => {
    setSavingProfile(true);
    onError(null);
    try {
      const updated = await patchAdminUser(user.id, {
        email: editEmail,
        username: editUsername,
        role: editRole,
        xp: editXp,
        status: editStatus,
      });
      onFlash('Usuário atualizado');
      await onReloadList();
      onUpdateSelected(updated);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao salvar');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 6) {
      onError('Senha com mínimo 6 caracteres');
      return;
    }
    setSavingPassword(true);
    onError(null);
    try {
      await postAdminUserPassword(user.id, newPassword);
      onFlash('Senha alterada');
      setNewPassword('');
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setSavingPassword(false);
    }
  };

  const applyBalance = async () => {
    const d = Number(balanceDelta.replace(',', '.'));
    if (!Number.isFinite(d) || d === 0) {
      onError('Indica um valor válido (positivo ou negativo)');
      return;
    }
    setSavingBalance(true);
    onError(null);
    try {
      const r = await postAdminUserBalance(user.id, d, balanceReason);
      onFlash('Saldo ajustado');
      setBalanceDelta('');
      setBalanceReason('');
      await onReloadList();
      onUpdateSelected({ ...user, balance: r.balance });
      if (subTab === 'transactions') void loadTx();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro no saldo');
    } finally {
      setSavingBalance(false);
    }
  };

  const removeUser = async () => {
    if (!window.confirm(`Excluir definitivamente ${user.username}?`)) return;
    setDeleting(true);
    onError(null);
    try {
      await deleteAdminUser(user.id);
      onFlash('Conta eliminada');
      await onReloadList();
      onDeselect();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  const txPages = Math.max(1, Math.ceil(txTotal / PAGE));
  const betsPages = Math.max(1, Math.ceil(betsTotal / PAGE));

  const subs: { id: SubTab; label: string }[] = [
    { id: 'profile', label: 'Dados' },
    { id: 'transactions', label: 'Transações' },
    { id: 'bets', label: 'Apostas' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-tuao-dark-700 pb-3">
        {subs.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSubTab(s.id);
              onError(null);
            }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition',
              subTab === s.id
                ? 'bg-tuao-primary text-tuao-dark-950'
                : 'text-tuao-text-secondary hover:text-white'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="font-mono text-[10px] text-tuao-text-secondary">id: {user.id}</p>
      <p className="text-[11px] text-tuao-text-secondary">
        Registro: {new Date(user.createdAt).toLocaleString('pt-BR')}
      </p>

      {subTab === 'profile' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white">Editar {user.username}</h2>
          <p className="text-sm tabular-nums text-emerald-300/90">
            Saldo atual:{' '}
            {user.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-tuao-dark-700 bg-tuao-dark-950/50 p-3 text-[11px]">
            <div>
              <p className="text-tuao-text-secondary">Apostado</p>
              <p className="tabular-nums text-white">
                {(user.totalWagered ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-tuao-text-secondary">Ganho</p>
              <p className="tabular-nums text-emerald-300/90">
                {(user.totalWon ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-tuao-text-secondary">Perdido</p>
              <p className="tabular-nums text-rose-300/90">
                {(user.totalLost ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <label className="block text-xs text-tuao-text-secondary">
            Email
            <input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-tuao-text-secondary">
            Username
            <input
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value)}
              className="mt-1 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
            />
          </label>
                  <label className="block text-xs text-tuao-text-secondary">
                    Papel
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as 'USER' | 'ADMIN')}
                      className="mt-1 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </label>
                  <label className="block text-xs text-tuao-text-secondary">
                    Estado da conta
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as UserAccountStatus)}
                      className="mt-1 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="ACTIVE">Ativo — pode jogar</option>
                      <option value="SUSPENDED">Suspenso — bloqueado</option>
                      <option value="BANNED">Banido — bloqueado</option>
                    </select>
                  </label>
          <label className="block text-xs text-tuao-text-secondary">
            XP
            <input
              type="number"
              min={0}
              value={editXp}
              onChange={(e) => setEditXp(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <button
            type="button"
            disabled={savingProfile}
            onClick={() => void saveUser()}
            className="w-full rounded-lg bg-tuao-primary py-2.5 text-xs font-bold uppercase text-tuao-dark-950 disabled:opacity-50"
          >
            {savingProfile ? 'Salvando…' : 'Salvar dados'}
          </button>

          <div className="border-t border-tuao-dark-700 pt-4">
            <p className="mb-2 text-xs font-semibold text-tuao-text-secondary">Nova senha</p>
            <input
              type="password"
              placeholder="Mín. 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mb-2 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={savingPassword}
              onClick={() => void savePassword()}
              className="w-full rounded-lg border border-tuao-dark-600 py-2 text-xs font-semibold text-white hover:bg-tuao-dark-800 disabled:opacity-50"
            >
              {savingPassword ? 'Alterando…' : 'Alterar senha'}
            </button>
          </div>

          <div className="border-t border-tuao-dark-700 pt-4">
            <p className="mb-2 text-xs font-semibold text-tuao-text-secondary">Saldo (+ crédito / − débito)</p>
            <input
              type="text"
              placeholder="Ex: 100 ou -50"
              value={balanceDelta}
              onChange={(e) => setBalanceDelta(e.target.value)}
              className="mb-2 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
            />
            <input
              type="text"
              placeholder="Motivo (opcional)"
              value={balanceReason}
              onChange={(e) => setBalanceReason(e.target.value)}
              className="mb-2 w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              disabled={savingBalance}
              onClick={() => void applyBalance()}
              className="w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-50"
            >
              {savingBalance ? 'Aplicando…' : 'Aplicar ajuste'}
            </button>
          </div>

          <button
            type="button"
            disabled={deleting}
            onClick={() => void removeUser()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2 size={14} /> {deleting ? 'Excluindo…' : 'Excluir conta'}
          </button>
        </div>
      )}

      {subTab === 'transactions' && (
        <div>
          {txLoading ? (
            <p className="text-sm text-tuao-text-secondary">Carregando transações…</p>
          ) : (
            <>
              <div className="max-h-[360px] overflow-auto rounded-lg border border-tuao-dark-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-tuao-dark-950 text-tuao-text-secondary">
                    <tr>
                      <th className="p-2">Data</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Valor</th>
                      <th className="p-2">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.map((t) => (
                      <tr key={t.id} className="border-t border-tuao-dark-800/80">
                        <td className="p-2 whitespace-nowrap text-tuao-text-secondary">
                          {new Date(t.createdAt).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-2 font-mono">{t.type}</td>
                        <td className="p-2 tabular-nums text-emerald-300/90">
                          {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-tuao-text-secondary">{t.description ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tx.length === 0 && <p className="mt-2 text-xs text-tuao-text-secondary">Sem transações.</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-tuao-text-secondary">
                  Página {txPage + 1} / {txPages} · {txTotal} total
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={txPage <= 0}
                    onClick={() => setTxPage((p) => Math.max(0, p - 1))}
                    className="rounded border border-tuao-dark-600 px-2 py-1 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={txPage >= txPages - 1}
                    onClick={() => setTxPage((p) => p + 1)}
                    className="rounded border border-tuao-dark-600 px-2 py-1 disabled:opacity-40"
                  >
                    Seguinte
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {subTab === 'bets' && (
        <div>
          {betsLoading ? (
            <p className="text-sm text-tuao-text-secondary">Carregando apostas…</p>
          ) : (
            <>
              <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                {bets.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-tuao-dark-800 bg-tuao-dark-950/80 p-2 text-[11px]"
                  >
                    <div className="flex flex-wrap justify-between gap-1">
                      <span className="font-mono text-tuao-primary">{b.game}</span>
                      <span
                        className={cn(
                          b.result === 'win' && 'text-emerald-400',
                          b.result === 'loss' && 'text-red-400',
                          b.result === 'pending' && 'text-amber-300'
                        )}
                      >
                        {b.result}
                      </span>
                    </div>
                    {b.sportFixture && (
                      <p className="mt-1 text-tuao-text-secondary">
                        {b.sportFixture.homeTeamName} vs {b.sportFixture.awayTeamName}
                        {b.sportFixture.competitionName ? ` · ${b.sportFixture.competitionName}` : ''}
                      </p>
                    )}
                    <p className="mt-1 tabular-nums text-white">
                      stake {b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      {b.multiplier != null && ` · odds ${b.multiplier}`}
                      {b.payout != null &&
                        ` · retorno ${b.payout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </p>
                    <p className="text-[10px] text-tuao-text-secondary">
                      {new Date(b.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))}
              </div>
              {bets.length === 0 && <p className="mt-2 text-xs text-tuao-text-secondary">Sem apostas.</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-tuao-text-secondary">
                  Página {betsPage + 1} / {betsPages} · {betsTotal} total
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={betsPage <= 0}
                    onClick={() => setBetsPage((p) => Math.max(0, p - 1))}
                    className="rounded border border-tuao-dark-600 px-2 py-1 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={betsPage >= betsPages - 1}
                    onClick={() => setBetsPage((p) => p + 1)}
                    className="rounded border border-tuao-dark-600 px-2 py-1 disabled:opacity-40"
                  >
                    Seguinte
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
