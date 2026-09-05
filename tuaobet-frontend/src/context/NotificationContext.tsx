import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getSocket } from '../services/socket';
import { fetchPublicAnnouncement } from '../services/publicSite';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'tuaobet_notifications_v1';
const MAX_ITEMS = 40;

export type InAppNotification = {
  id: string;
  kind: string;
  title: string;
  message: string;
  ts: number;
  read: boolean;
};

function loadStored(): InAppNotification[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is InAppNotification =>
        typeof x === 'object' &&
        x !== null &&
        typeof (x as InAppNotification).id === 'string' &&
        typeof (x as InAppNotification).title === 'string' &&
        typeof (x as InAppNotification).message === 'string' &&
        typeof (x as InAppNotification).ts === 'number'
    );
  } catch {
    return [];
  }
}

function saveStored(items: InAppNotification[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* ignore */
  }
}

interface NotificationContextValue {
  items: InAppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authReady, isAuthenticated } = useAuth();
  const [items, setItems] = useState<InAppNotification[]>(() => loadStored());

  const persist = useCallback((next: InAppNotification[]) => {
    saveStored(next);
    setItems(next);
  }, []);

  const push = useCallback(
    (n: Omit<InAppNotification, 'read' | 'ts'> & { read?: boolean; ts?: number }) => {
      const entry: InAppNotification = {
        id: n.id,
        kind: n.kind,
        title: n.title,
        message: n.message,
        ts: n.ts ?? Date.now(),
        read: n.read ?? false,
      };
      setItems((prev) => {
        if (prev.some((x) => x.id === entry.id)) return prev;
        const next = [entry, ...prev].slice(0, MAX_ITEMS);
        saveStored(next);
        return next;
      });
    },
    []
  );

  useEffect(() => {
    const s = getSocket();

    const onAnnouncement = (payload: { id: string; title: string; message: string }) => {
      push({
        id: `ann-${payload.id}`,
        kind: 'announcement',
        title: payload.title,
        message: payload.message,
      });
    };

    const onUserNotify = (payload: { type?: string; title?: string; message?: string }) => {
      if (!payload?.title || !payload?.message) return;
      push({
        id: `nfy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        kind: payload.type ?? 'info',
        title: payload.title,
        message: payload.message,
      });
    };

    s.on('site:announcement', onAnnouncement);
    s.on('user:notify', onUserNotify);
    return () => {
      s.off('site:announcement', onAnnouncement);
      s.off('user:notify', onUserNotify);
    };
  }, [push]);

  /** Quem perdeu o evento socket ainda vê o aviso ativo ao abrir o site. */
  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    let cancelled = false;
    const sync = async () => {
      try {
        const ann = await fetchPublicAnnouncement();
        if (cancelled || !ann) return;
        push({
          id: `ann-${ann.id}`,
          kind: 'announcement',
          title: ann.title,
          message: ann.message,
        });
      } catch {
        /* ignore */
      }
    };
    void sync();
    const t = window.setInterval(sync, 90_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [authReady, isAuthenticated, push]);

  const unreadCount = useMemo(() => items.filter((x) => !x.read).length, [items]);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((x) => ({ ...x, read: true }));
      saveStored(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    persist([]);
  }, [persist]);

  const value = useMemo(
    () => ({ items, unreadCount, markAllRead, clearAll }),
    [items, unreadCount, markAllRead, clearAll]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications deve ser usado dentro de NotificationProvider');
  }
  return ctx;
}
