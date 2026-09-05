import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Megaphone,
  ScrollText,
  Shield,
  Users,
} from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminBannersTab } from '../components/admin/AdminBannersTab';
import { AdminAnnouncementsTab } from '../components/admin/AdminAnnouncementsTab';
import { AdminAuditTab } from '../components/admin/AdminAuditTab';
import { AdminDashboardTab } from '../components/admin/AdminDashboardTab';
import { AdminBetsLogTab } from '../components/admin/AdminBetsLogTab';

type Tab = 'dashboard' | 'users' | 'bets' | 'banners' | 'announcements' | 'audit';

export const AdminPage: React.FC = () => {
  const { user, isLoading, authReady } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const flash = useCallback((m: string) => {
    setMsg(m);
    setErr(null);
    window.setTimeout(() => setMsg(null), 4000);
  }, []);

  if (!authReady || isLoading) {
    return (
      <Layout>
        <p className="text-tuao-text-secondary">A carregar…</p>
      </Layout>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <Layout>
        <div className="mx-auto max-w-lg rounded-xl border border-tuao-dark-700 bg-tuao-dark-900 p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-tuao-text-secondary" />
          <h1 className="mt-4 text-xl font-bold text-white">Área restrita</h1>
          <p className="mt-2 text-tuao-text-secondary">Precisas de sessão de administrador.</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-tuao-primary hover:underline"
          >
            <ArrowLeft size={18} /> Voltar ao início
          </Link>
        </div>
      </Layout>
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
    <Layout>
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-tuao-primary/15 text-tuao-primary">
              <Shield size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-white md:text-2xl">Central de administração</h1>
              <p className="text-xs text-tuao-text-secondary">
                Utilizadores, saldo, imagens, avisos globais e trilho de auditoria
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-tuao-dark-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-tuao-text-secondary transition hover:border-tuao-primary/40 hover:text-white"
          >
            <ArrowLeft size={16} /> Site
          </Link>
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
      </div>
    </Layout>
  );
};
