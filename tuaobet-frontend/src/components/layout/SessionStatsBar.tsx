import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const SESSION_STARTED_KEY = 'tuaobet_session_started_at';

function formatBrl(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSessionDuration(startedAt: number, now: number) {
  const totalSec = Math.max(0, Math.floor((now - startedAt) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function SessionStatsBar() {
  const { isAuthenticated, user } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.removeItem(SESSION_STARTED_KEY);
      setSessionStartedAt(null);
      return;
    }
    const existing = sessionStorage.getItem(SESSION_STARTED_KEY);
    if (existing) {
      const parsed = Number(existing);
      if (Number.isFinite(parsed)) {
        setSessionStartedAt(parsed);
        return;
      }
    }
    const started = Date.now();
    sessionStorage.setItem(SESSION_STARTED_KEY, String(started));
    setSessionStartedAt(started);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || sessionStartedAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, sessionStartedAt]);

  if (!isAuthenticated) return null;

  const sessionTime =
    sessionStartedAt != null ? formatSessionDuration(sessionStartedAt, now) : '—';

  const items = [
    { label: 'Login anterior', value: '—' },
    { label: 'Ganho', value: '—' },
    { label: 'Perdido', value: '—' },
    { label: 'Saldo', value: user ? formatBrl(user.balance) : '—', emphasize: true },
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
