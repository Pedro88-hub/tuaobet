import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  User,
  Bell,
  Crown,
  LogOut,
  Scale,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { cn } from '../../lib/utils';
import { levelFromXp, tierForLevel, xpProgressInLevel } from '../../lib/xpDisplay';
import { TuaoLogoMark } from '../brand/TuaoLogoMark';

interface NavbarProps {
  toggleSidebar: () => void;
}

function formatBalancePtBr(value: number) {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function useAnimatedBalance(balance: number) {
  const [display, setDisplay] = useState(balance);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const displayRef = useRef(display);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const from = displayRef.current;
    const to = balance;
    if (!Number.isFinite(to) || from === to) {
      setDisplay(to);
      return;
    }
    setFlash(to > from ? 'up' : 'down');
    const flashTimer = window.setTimeout(() => setFlash(null), 450);
    const duration = 420;
    const start = performance.now();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        setDisplay(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      window.clearTimeout(flashTimer);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [balance]);

  return { display, flash };
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [ref, onOutside, enabled]);
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { isAuthenticated, user, openLoginModal, openRegisterModal, logout } = useAuth();
  const { items: notifItems, unreadCount: notificationCount, markAllRead, clearAll } =
    useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const balance = user?.balance ?? 0;
  const { display: animatedBalance, flash: balanceFlash } = useAnimatedBalance(balance);

  const [walletOpen, setWalletOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const walletRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const closeWallet = useCallback(() => setWalletOpen(false), []);
  const closeProfile = useCallback(() => setProfileOpen(false), []);
  const closeNotif = useCallback(() => setNotifOpen(false), []);

  useClickOutside(walletRef, closeWallet, walletOpen);
  useClickOutside(profileRef, closeProfile, profileOpen);
  useClickOutside(notifRef, closeNotif, notifOpen);

  const isCasino =
    location.pathname === '/' ||
    location.pathname.startsWith('/crash') ||
    location.pathname.startsWith('/double') ||
    location.pathname.startsWith('/mines') ||
    location.pathname.startsWith('/plinko') ||
    location.pathname.startsWith('/dice') ||
    location.pathname.startsWith('/baccarat') ||
    location.pathname.startsWith('/fairness');
  const isSports = location.pathname.startsWith('/sports');
  const isSearchRoute = location.pathname === '/' && new URLSearchParams(location.search).has('q');

  const xp = user?.xp ?? 0;
  const level = levelFromXp(xp);
  const tier = tierForLevel(level);
  const { pct: levelPct } = xpProgressInLevel(xp);

  const submitSearch = () => {
    const q = searchQuery.trim();
    if (q) navigate(`/?q=${encodeURIComponent(q)}`);
    else navigate('/');
    setSearchExpanded(false);
    searchInputRef.current?.blur();
  };

  const navTabClass = (active: boolean) =>
    cn(
      'relative flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-colors',
      active ? 'text-white' : 'text-tuao-text-secondary hover:text-white'
    );

  const navUnderline = (active: boolean) =>
    active
      ? 'after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-tuao-primary after:shadow-[0_0_10px_rgba(0,240,255,0.45)]'
      : '';

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center border-b border-tuao-dark-800 bg-tuao-dark-950 px-3 shadow-sm md:px-4">
      {/* Esquerda: menu + logo */}
      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-tuao-dark-800 lg:inline-flex"
          aria-label="Abrir menu"
        >
          <Menu size={22} strokeWidth={2} />
        </button>

        <Link to="/" className="flex min-w-0 items-center gap-2">
          <TuaoLogoMark className="h-9 w-9" />
          <span className="hidden font-black text-lg italic tracking-tight text-white sm:inline md:text-xl">
            TUÃO<span className="text-tuao-primary">BET</span>
          </span>
        </Link>
      </div>

      {/* Centro: só visitante — Cassino / Esportes / Pesquisa (estilo Blaze) */}
      {!isAuthenticated && (
        <div className="mx-4 hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex lg:gap-2">
          <Link to="/" className={cn(navTabClass(isCasino && !searchExpanded), navUnderline(isCasino && !searchExpanded))}>
            Cassino
          </Link>
          <Link to="/sports" className={cn(navTabClass(isSports), navUnderline(isSports))}>
            <Trophy size={16} className="opacity-90" />
            Esportes
          </Link>
          <button
            type="button"
            onClick={() => {
              setSearchExpanded(true);
              setTimeout(() => searchInputRef.current?.focus(), 0);
            }}
            className={cn(navTabClass(searchExpanded || isSearchRoute), navUnderline(searchExpanded || isSearchRoute))}
          >
            <Search size={16} strokeWidth={2.5} />
            Pesquisa
          </button>

          <div
            className={cn(
              'ml-2 flex max-w-md flex-1 items-center overflow-hidden transition-all duration-200',
              searchExpanded ? 'w-full opacity-100' : 'pointer-events-none w-0 opacity-0'
            )}
          >
            <div className="flex w-full min-w-[140px] items-center gap-2 rounded-full border border-tuao-dark-700 bg-tuao-dark-950 px-3 py-2 focus-within:border-tuao-primary/50">
              <Search size={14} className="shrink-0 text-tuao-text-secondary" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
                onBlur={() => {
                  if (!searchQuery.trim()) setSearchExpanded(false);
                }}
                placeholder="Buscar jogos..."
                className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-tuao-text-secondary"
              />
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && <div className="min-w-0 flex-1" aria-hidden />}

      {/* Espaço entre logo e CTAs no mobile (pesquisa fica no drawer / menu inferior) */}
      {!isAuthenticated && <div className="min-w-0 flex-1 md:hidden" aria-hidden />}

      {/* Direita */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-3">
        {isAuthenticated ? (
          <>
            {/* Nível / patente */}
            <div className="hidden lg:flex min-w-0 flex-col gap-1 border-r border-tuao-dark-800 pr-4">
              <div className="flex items-center gap-2">
                <Crown size={16} className={cn('shrink-0', tier.crownClass)} strokeWidth={2} />
                <div className="min-w-0 leading-tight">
                  <p className="text-[11px] font-bold text-white">{tier.label}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-tuao-text-secondary">
                    Nível {level}
                  </p>
                </div>
              </div>
              <div className="h-1 w-[120px] max-w-full overflow-hidden rounded-full bg-tuao-dark-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-tuao-primary transition-[width] duration-300"
                  style={{ width: `${Math.min(100, levelPct)}%` }}
                />
              </div>
            </div>

            {/* Notificações */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((v) => {
                    const opening = !v;
                    if (opening) markAllRead();
                    return opening;
                  });
                  setWalletOpen(false);
                  setProfileOpen(false);
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-tuao-dark-800"
                aria-label="Notificações"
              >
                <Bell size={20} strokeWidth={2} />
                {notificationCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-tuao-dark-800 bg-tuao-dark-900 py-3 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-tuao-dark-800 px-4 pb-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-tuao-text-secondary">
                      Notificações
                    </p>
                    {notifItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearAll()}
                        className="text-[10px] font-semibold uppercase tracking-wide text-tuao-primary hover:underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="max-h-[min(70vh,320px)] overflow-y-auto custom-scrollbar">
                    {notifItems.length === 0 ? (
                      <p className="px-4 py-6 text-center text-xs text-tuao-text-secondary">
                        Sem notificações.
                      </p>
                    ) : (
                      <ul className="py-1">
                        {notifItems.map((n) => (
                          <li
                            key={n.id}
                            className={cn(
                              'border-b border-tuao-dark-800/80 px-4 py-3 last:border-0',
                              n.read ? 'opacity-70' : 'bg-tuao-dark-800/20'
                            )}
                          >
                            <p className="text-xs font-bold text-white">{n.title}</p>
                            <p className="mt-1 text-[11px] leading-snug text-tuao-text-secondary">
                              {n.message}
                            </p>
                            <p className="mt-1.5 text-[10px] text-tuao-dark-600">
                              {new Date(n.ts).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Perfil */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setWalletOpen(false);
                  setNotifOpen(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-tuao-dark-700 bg-tuao-dark-800 text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white"
                aria-label="Conta"
              >
                <User size={20} strokeWidth={2} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-tuao-dark-800 bg-tuao-dark-900 py-2 shadow-2xl">
                  <div className="border-b border-tuao-dark-800 px-4 py-2">
                    <p className="truncate text-xs font-bold text-white">{user?.username}</p>
                    <p className="text-[10px] text-tuao-text-secondary">{user?.email}</p>
                  </div>
                  <Link
                    to="/fairness"
                    onClick={closeProfile}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-tuao-text-secondary hover:bg-tuao-dark-800 hover:text-white"
                  >
                    <Scale size={14} />
                    Provably fair
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      closeProfile();
                      logout();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-red-400 hover:bg-tuao-dark-800"
                  >
                    <LogOut size={14} />
                    Sair
                  </button>
                </div>
              )}
            </div>

            {/* Saldo + dropdown */}
            <div className="relative min-w-0" ref={walletRef}>
              <button
                type="button"
                data-wallet-balance
                onClick={() => {
                  setWalletOpen((v) => !v);
                  setProfileOpen(false);
                  setNotifOpen(false);
                }}
                aria-expanded={walletOpen}
                aria-haspopup="dialog"
                aria-label="Carteira e saldo"
                className={cn(
                  'flex max-w-[10.5rem] min-w-0 items-center justify-center rounded-lg border border-tuao-dark-700/85 bg-tuao-dark-950 px-3 py-2 transition-colors hover:border-tuao-dark-600 sm:max-w-none sm:px-4 sm:py-2.5',
                  balanceFlash === 'up' && 'border-emerald-500/60 text-emerald-300',
                  balanceFlash === 'down' && 'border-red-500/60 text-red-300'
                )}
              >
                <span
                  className={cn(
                    'min-w-0 truncate text-center text-xs font-extrabold tabular-nums tracking-tight text-white transition-colors sm:text-sm',
                    balanceFlash === 'up' && 'text-emerald-300',
                    balanceFlash === 'down' && 'text-red-300'
                  )}
                >
                  R$ {formatBalancePtBr(animatedBalance)}
                </span>
              </button>
              {walletOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-tuao-dark-800 bg-tuao-dark-900 p-4 shadow-2xl">
                  <p className="text-[10px] font-black uppercase tracking-wider text-tuao-text-secondary">Saldo disponível</p>
                  <p className="mt-1 text-xl font-black tabular-nums text-white">R$ {formatBalancePtBr(animatedBalance)}</p>
                  <p className="mt-3 text-[11px] text-tuao-text-secondary">
                    Depósitos e saques serão integrados em breve.
                  </p>
                  <button
                    type="button"
                    className="mt-4 w-full rounded-lg bg-tuao-primary py-2.5 text-sm font-black text-tuao-dark-950 shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-colors hover:bg-tuao-primary-hover"
                    onClick={() => setWalletOpen(false)}
                  >
                    Depositar
                  </button>
                </div>
              )}
            </div>

            {/* CTA Depositar (atalho — espelho Blaze) */}
            <button
              type="button"
              onClick={() => {
                setWalletOpen(true);
                setProfileOpen(false);
                setNotifOpen(false);
              }}
              className="hidden rounded-lg bg-tuao-primary px-4 py-2.5 text-xs font-black uppercase tracking-wide text-tuao-dark-950 shadow-[0_0_18px_rgba(0,240,255,0.3)] transition-colors hover:bg-tuao-primary-hover sm:block"
            >
              Depositar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={openLoginModal}
              className="px-2 text-sm font-bold text-white transition-colors hover:text-tuao-primary sm:px-3"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={openRegisterModal}
              className="rounded-lg bg-tuao-primary px-4 py-2.5 text-xs font-black uppercase tracking-wide text-tuao-dark-950 shadow-[0_0_18px_rgba(0,240,255,0.3)] transition-colors hover:bg-tuao-primary-hover"
            >
              Cadastre-se
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export { Navbar };
