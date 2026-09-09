import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Megaphone,
  ScrollText,
  Shield,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { TuaoLogoMark } from '../components/brand/TuaoLogoMark';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminBannersTab } from '../components/admin/AdminBannersTab';
import { AdminAnnouncementsTab } from '../components/admin/AdminAnnouncementsTab';
import { AdminAuditTab } from '../components/admin/AdminAuditTab';
import { AdminDashboardTab } from '../components/admin/AdminDashboardTab';
import { AdminBetsLogTab } from '../components/admin/AdminBetsLogTab';

type Tab = 'dashboard' | 'users' | 'bets' | 'banners' | 'announcements' | 'audit';

/** Shell próprio — sem navbar/sidebar do cassino. */
function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-tuao-dark-950 text-tuao-text-primary">
      <div className="border-b border-tuao-dark-800 bg-tuao-dark-900/80">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <TuaoLogoMark className="h-8 w-8 rounded-md" />
            <div className="leading-tight">
              <p className="text-sm font-black tracking-tight text-white">
                TUÃO<span className="text-tuao-primary">BET</span>
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-tuao-text-secondary">
                Painel admin
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-tuao-text-secondary transition hover:text-white"
          >
            <ArrowLeft size={14} /> Site
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-[1100px] px-4 py-8">{children}</div>
    </div>
  );
}

function AdminLoginPanel() {
  const { login, isLoading, logout, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login');
    }
  };

  const denied = Boolean(user && user.role !== 'ADMIN');

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-tuao-dark-700 bg-tuao-dark-900 p-8 shadow-[0_0_40px_rgba(0,240,255,0.06)]">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-tuao-primary/15 text-tuao-primary">
            <Shield size={24} />
          </div>
          <h1 className="mt-4 text-xl font-black text-white">Administração</h1>
          <p className="mt-1 text-sm text-tuao-text-secondary">
            Acesso restrito à operação TuãoBET
          </p>
        </div>

        {denied && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            A conta <span className="font-semibold">{user?.email}</span> não tem perfil ADMIN.
            <button
              type="button"
              onClick={() => logout()}
              className="mt-2 block text-xs font-bold uppercase tracking-wide text-tuao-primary hover:underline"
            >
              Sair e tentar outra conta
            </button>
          </div>
        )}

        {!user && (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary">
                Email
              </span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2.5 text-sm text-white outline-none focus:border-tuao-primary/50"
                placeholder="admin@tuao.dev.br"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary">
                Senha
              </span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-tuao-dark-600 bg-tuao-dark-950 px-3 py-2.5 text-sm text-white outline-none focus:border-tuao-primary/50"
                placeholder="••••••••"
              />
            </label>
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-tuao-primary py-3 text-sm font-black uppercase tracking-wide text-tuao-dark-950 shadow-[0_0_20px_rgba(0,240,255,0.25)] transition hover:bg-tuao-primary-hover disabled:opacity-60"
            >
              {isLoading ? 'Entrando…' : 'Entrar no painel'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export const AdminPage: React.FC = () => {
  const { user, authReady, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const flash = useCallback((m: string) => {
    setMsg(m);
    setErr(null);
    window.setTimeout(() => setMsg(null), 4000);
  }, []);

  if (!authReady) {
    return (
      <AdminShell>
        <p className="text-center text-tuao-text-secondary">Carregando…</p>
      </AdminShell>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <AdminShell>
        <AdminLoginPanel />
      </AdminShell>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'dashboard', label: 'Resumo', icon: LayoutDashboard },
    { id: 'users', label: 'Contas', icon: Users },
    { id: 'bets', label: 'Apostas', icon: ScrollText },
    { id: 'banners', label: 'Banners', icon: ImageIcon },
    { id: 'announcements', label: 'Avisos', icon: Megaphone },
    { id: 'audit', label: 'Auditoria', icon: FileText },
  ];

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white md:text-2xl">Central de administração</h1>
          <p className="text-xs text-tuao-text-secondary">
            Sessão: <span className="text-white">{user.email}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-2 rounded-lg border border-tuao-dark-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-tuao-text-secondary transition hover:border-red-500/40 hover:text-red-300"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>

      {msg && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {msg}
        </div>
      )}
      {err && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {err}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setErr(null);
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition',
              tab === t.id
                ? 'bg-tuao-primary text-tuao-dark-950'
                : 'border border-tuao-dark-600 bg-tuao-dark-900 text-tuao-text-secondary hover:text-white'
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <AdminDashboardTab onError={setErr} />}
      {tab === 'users' && <AdminUsersTab onFlash={flash} onError={setErr} />}
      {tab === 'bets' && <AdminBetsLogTab onError={setErr} />}
      {tab === 'banners' && <AdminBannersTab onFlash={flash} onError={setErr} />}
      {tab === 'announcements' && <AdminAnnouncementsTab onFlash={flash} onError={setErr} />}
      {tab === 'audit' && <AdminAuditTab onError={setErr} />}
    </AdminShell>
  );
};
