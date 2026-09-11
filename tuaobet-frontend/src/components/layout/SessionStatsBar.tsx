import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const POLL_MS = 2 * 60 * 1000;

type SessionStats = {
  previousLoginAt: string | null;
  wonAmount: number;
  lostAmount: number;
  balance: number;
  sessionStartedAt: string | null;
  updatedAt: string;
};

function formatBrl(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPreviousLogin(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSessionDuration(startedAt: number, now: number) {
  const totalSec = Math.max(0, Math.floor((now - startedAt) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function SessionStatsBar() {
  const { isAuthenticated, user, setUserBalance } = useAuth();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isAuthenticated) {
      setStats(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const data = await apiFetch<SessionStats>('/api/auth/session-stats');
        if (cancelled) return;
        setStats(data);
        if (Number.isFinite(data.balance)) {
          setUserBalance(data.balance);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[SessionStatsBar] falha ao carregar /api/auth/session-stats', err);
        }
      }
    };

    void load();
    const pollId = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
    };
  }, [isAuthenticated, setUserBalance]);

  useEffect(() => {
    if (!isAuthenticated || !stats?.sessionStartedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, stats?.sessionStartedAt]);

  if (!isAuthenticated) return null;

  const sessionStartedMs = stats?.sessionStartedAt
    ? Date.parse(stats.sessionStartedAt)
    : NaN;
  const sessionTime = Number.isFinite(sessionStartedMs)
    ? formatSessionDuration(sessionStartedMs, now)
    : '—';

  const balance =
    user && Number.isFinite(user.balance)
      ? user.balance
      : stats && Number.isFinite(stats.balance)
        ? stats.balance
        : null;

  const items = [
    { label: 'Login anterior', value: formatPreviousLogin(stats?.previousLoginAt ?? null) },
    {
      label: 'Ganho',
      value: stats ? formatBrl(stats.wonAmount) : '—',
    },
    {
      label: 'Perdido',
      value: stats ? formatBrl(stats.lostAmount) : '—',
    },
    {
      label: 'Saldo',
      value: balance != null ? formatBrl(balance) : '—',
      emphasize: true,
    },
    { label: 'Sessão', value: sessionTime },
  ] as const;

  return (
    <div className="border-t border-tuao-dark-800/40 px-4 py-3 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-tuao-text-secondary md:justify-between">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-4">
            {i > 0 && (
              <span
                className="hidden h-3 w-px bg-tuao-dark-700/80 md:block"
                aria-hidden
              />
            )}
            <p className="whitespace-nowrap">
              <span className="text-tuao-text-secondary/70">{item.label}</span>
              <span
                className={`ml-1.5 tabular-nums ${
                  'emphasize' in item && item.emphasize
                    ? 'font-medium text-white'
                    : 'text-tuao-text-secondary'
                }`}
              >
                {item.value}
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
