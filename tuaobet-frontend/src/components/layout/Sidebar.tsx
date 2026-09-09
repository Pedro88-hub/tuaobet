import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Rocket,
  Disc,
  Bomb,
  Dices,
  LayoutGrid,
  Scale,
  X,
  Trophy,
  Ticket,
  Radio,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Shield,
  Search,
  Spade,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { BACCARAT_IN_MAINTENANCE } from '../../lib/gameMaintenance';

interface SidebarProps {
  isExpanded: boolean;
  isMobileOpen: boolean;
  closeMobile: () => void;
}

const popularLeagues = [
  { label: 'Brasileirão Série A', league: 'brasileir' },
  { label: 'Premier League', league: 'premier' },
  { label: 'Liga dos Campeões', league: 'champions' },
  { label: 'La Liga', league: 'laliga' },
  { label: 'Serie A (IT)', league: 'serie a' },
  { label: 'Bundesliga', league: 'bundesliga' },
] as const;

type SidebarGame = {
  name: string;
  icon: React.ElementType;
  path: string;
  color: string;
  maintenance?: boolean;
};

const games: SidebarGame[] = [
  { name: 'Crash', icon: Rocket, path: '/crash', color: 'text-red-500' },
  { name: 'Double', icon: Disc, path: '/double', color: 'text-white' },
  { name: 'Mines', icon: Bomb, path: '/mines', color: 'text-yellow-500' },
  { name: 'Dice', icon: Dices, path: '/dice', color: 'text-blue-500' },
  { name: 'Plinko', icon: LayoutGrid, path: '/plinko', color: 'text-pink-500' },
  {
    name: 'Baccarat',
    icon: Spade,
    path: '/baccarat',
    color: 'text-emerald-400',
    maintenance: BACCARAT_IN_MAINTENANCE,
  },
  { name: 'Justiça', icon: Scale, path: '/fairness', color: 'text-tuao-primary' },
];

function BasketballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 3c0 6-4 9-9 9M12 3c0 6 4 9 9 9M3 12h18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({ isExpanded, isMobileOpen, closeMobile }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [sportsOpen, setSportsOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<'cassino' | 'esportes'>('cassino');
  const [originalsOpen, setOriginalsOpen] = useState(true);
  const [drawerQuery, setDrawerQuery] = useState('');

  const sportsActive = location.pathname.startsWith('/sports');
  const sp = new URLSearchParams(location.search);
  const liveView =
    location.hash === '#sports-ao-vivo' || sp.get('view') === 'live';
  const leagueFilter = sp.get('league') ?? '';

  const filteredGames = useMemo(() => {
    const q = drawerQuery.trim().toLowerCase();
    if (!q) return games;
    return games.filter((g) => g.name.toLowerCase().includes(q) || g.path.includes(q));
  }, [drawerQuery]);

  const sportsNav = (
    <nav className="space-y-1 border-l border-tuao-dark-800/80 pl-2">
      <Link
        to="/sports"
        onClick={closeMobile}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
          sportsActive && !liveView && !leagueFilter
            ? 'bg-tuao-dark-800 text-white'
            : 'text-tuao-text-secondary hover:bg-tuao-dark-800 hover:text-white'
        )}
      >
        <Trophy size={18} className="shrink-0 text-amber-400" />
        <span className="font-medium">Destaques</span>
      </Link>
      <Link
        to="/sports#sports-ao-vivo"
        onClick={closeMobile}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
          sportsActive && liveView
            ? 'bg-tuao-dark-800 text-white'
            : 'text-tuao-text-secondary hover:bg-tuao-dark-800 hover:text-white'
        )}
      >
        <Radio size={18} className="shrink-0 text-red-400" />
        <span className="font-medium">Jogos ao vivo</span>
      </Link>
      <Link
        to="/sports#sports-cupom"
        onClick={closeMobile}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
          'text-tuao-text-secondary hover:bg-tuao-dark-800 hover:text-white'
        )}
      >
        <Ticket size={18} className="shrink-0 text-tuao-primary" />
        <span className="font-medium">As minhas apostas</span>
      </Link>

      <p className="px-3 pt-3 text-[10px] font-black uppercase tracking-wider text-tuao-text-secondary/90">
        Popular
      </p>
      {popularLeagues.map((L) => {
        const active =
          sportsActive && leagueFilter.toLowerCase() === L.league.toLowerCase();
        return (
          <Link
            key={L.league}
            to={`/sports?league=${encodeURIComponent(L.league)}`}
            onClick={closeMobile}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
              active
                ? 'bg-tuao-dark-800 text-white'
                : 'text-tuao-text-secondary hover:bg-tuao-dark-800 hover:text-white'
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-tuao-dark-700 bg-tuao-dark-950 text-[10px] font-black text-tuao-text-secondary">
              {L.label.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 truncate font-medium">{L.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-tuao-dark-800 bg-[#0f1419] transition-all duration-300 lg:static',
        isExpanded ? 'w-64' : 'w-20',
        isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
        isMobileOpen && 'w-[min(100vw,360px)] sm:max-w-sm'
      )}
    >
      {/* ——— Drawer mobile (Blaze-style) ——— */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div className="flex h-14 shrink-0 items-center justify-between px-4 pt-2">
          <Link to="/" onClick={closeMobile} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-tuao-primary to-cyan-600 shadow-[0_0_14px_rgba(0,240,255,0.4)]">
              <span className="font-black text-sm leading-none text-tuao-dark-950">T</span>
            </div>
            <span className="text-lg font-black lowercase tracking-tight text-white">
              tuão<span className="text-tuao-primary">bet</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-tuao-dark-800 text-tuao-text-secondary transition-colors hover:bg-tuao-dark-700 hover:text-white"
            aria-label="Fechar menu"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-0 border-b border-tuao-dark-800 px-2 pb-2">
          <button
            type="button"
            onClick={() => setMobileTab('cassino')}
            className={cn(
              'flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-wider transition-colors',
              mobileTab === 'cassino' ? 'text-white' : 'text-tuao-text-secondary'
            )}
          >
            <LayoutGrid size={18} className="opacity-90" />
            Cassino
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('esportes')}
            className={cn(
              'flex items-center justify-center gap-2 py-3 text-[11px] font-black uppercase tracking-wider transition-colors',
              mobileTab === 'esportes' ? 'text-white' : 'text-tuao-text-secondary'
            )}
          >
            <BasketballIcon className="h-[18px] w-[18px]" />
            Esportes
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3 custom-scrollbar">
          {mobileTab === 'cassino' ? (
            <>
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-tuao-dark-700/80 bg-tuao-dark-950 px-3 py-2.5">
                <Search size={16} className="shrink-0 text-tuao-text-secondary" strokeWidth={2.2} />
                <input
                  type="search"
                  value={drawerQuery}
                  onChange={(e) => setDrawerQuery(e.target.value)}
                  placeholder="Procure Jogos ou Provedores"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-tuao-text-secondary/80"
                />
              </div>

              <button
                type="button"
                onClick={() => setOriginalsOpen((o) => !o)}
                className="mb-2 flex w-full items-center justify-between py-2 text-left"
              >
                <span className="text-[11px] font-black uppercase tracking-wider text-tuao-text-secondary">
                  Originais TuãoBet
                </span>
                {originalsOpen ? (
                  <ChevronUp size={16} className="text-tuao-text-secondary" />
                ) : (
                  <ChevronDown size={16} className="text-tuao-text-secondary" />
                )}
              </button>

              {originalsOpen && (
                <nav className="space-y-0.5 border-t border-tuao-dark-800/80 pt-2">
                  {filteredGames.length === 0 ? (
                    <p className="py-4 text-center text-xs text-tuao-text-secondary">Nenhum jogo encontrado.</p>
                  ) : (
                    filteredGames.map((game) => {
                      const isActive = location.pathname === game.path;
                      return (
                        <Link
                          key={game.path}
                          to={game.path}
                          onClick={closeMobile}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-2 py-3 transition-colors',
                            isActive ? 'bg-white/[0.06] text-white' : 'text-tuao-text-secondary hover:bg-white/[0.04] hover:text-white'
                          )}
                        >
                          <game.icon size={20} className="shrink-0 text-tuao-text-secondary" strokeWidth={2} />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{game.name}</span>
                          {game.maintenance && (
                            <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
                              Manutenção
                            </span>
                          )}
                        </Link>
                      );
                    })
                  )}
                </nav>
              )}

              {user?.role === 'ADMIN' && (
                <div className="mt-8 border-t border-tuao-dark-800 pt-4">
                  <Link
                    to="/admin"
                    onClick={closeMobile}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-2 py-3 transition-colors',
                      location.pathname === '/admin'
                        ? 'bg-white/[0.06] text-white'
                        : 'text-tuao-text-secondary hover:bg-white/[0.04] hover:text-white'
                    )}
                  >
                    <Shield size={20} className="shrink-0 text-tuao-text-secondary" />
                    <span className="text-sm font-medium">Central admin</span>
                  </Link>
                </div>
              )}
            </>
          ) : (
            sportsNav
          )}
        </div>
      </div>

      {/* ——— Sidebar desktop ——— */}
      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <div className="mb-2 px-4">
            <p
              className={cn(
                'text-xs font-bold uppercase tracking-wider text-tuao-text-secondary transition-opacity',
                !isExpanded && !isMobileOpen && 'opacity-0'
              )}
            >
              Jogos Originais
            </p>
          </div>

          <nav className="space-y-1 px-2">
            {games.map((game) => {
              const isActive = location.pathname === game.path;
              return (
                <Link
                  key={game.path}
                  to={game.path}
                  onClick={closeMobile}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-3 transition-all',
                    isActive
                      ? 'border border-tuao-dark-700 bg-tuao-dark-800 text-white shadow-sm'
                      : 'text-tuao-text-secondary hover:bg-tuao-dark-800 hover:text-white'
                  )}
                >
                  <game.icon
                    size={20}
                    className={cn('transition-colors', isActive ? game.color : 'group-hover:text-white')}
                  />

                  <span
                    className={cn(
                      'whitespace-nowrap font-medium transition-all duration-200',
                      !isExpanded && !isMobileOpen ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
                    )}
                  >
                    {game.name}
                  </span>

                  {game.maintenance && (isExpanded || isMobileOpen) && (
                    <span className="ml-auto shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
                      Manutenção
                    </span>
                  )}

                  {!isExpanded && !isMobileOpen && (
                    <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded border border-tuao-dark-700 bg-tuao-dark-800 px-2 py-1 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                      {game.maintenance ? `${game.name} · manutenção` : game.name}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {user?.role === 'ADMIN' && (
            <>
              <div className="mb-2 mt-8 px-4">
                <p
                  className={cn(
                    'text-xs font-bold uppercase tracking-wider text-tuao-text-secondary transition-opacity',
                    !isExpanded && !isMobileOpen && 'opacity-0'
                  )}
                >
                  Administração
                </p>
              </div>
              <nav className="space-y-1 px-2">
                <Link
                  to="/admin"
                  onClick={closeMobile}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-3 transition-all',
                    location.pathname === '/admin'
                      ? 'border border-tuao-dark-700 bg-tuao-dark-800 text-white shadow-sm'
                      : 'text-tuao-text-secondary hover:bg-tuao-dark-800 hover:text-white'
                  )}
                >
                  <Shield
                    size={20}
                    className={cn(
                      'transition-colors',
                      location.pathname === '/admin' ? 'text-tuao-primary' : 'group-hover:text-white'
                    )}
                  />
                  <span
                    className={cn(
                      'whitespace-nowrap font-medium transition-all duration-200',
                      !isExpanded && !isMobileOpen ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'
                    )}
                  >
                    Central admin
                  </span>
                  {!isExpanded && !isMobileOpen && (
                    <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded border border-tuao-dark-700 bg-tuao-dark-800 px-2 py-1 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                      Central admin
                    </div>
                  )}
                </Link>
              </nav>
            </>
          )}

          <div className="mt-8 px-2">
            {(isExpanded || isMobileOpen) && (
              <button
                type="button"
                onClick={() => setSportsOpen((o) => !o)}
                className="mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-tuao-dark-800/80"
              >
                {sportsOpen ? (
                  <ChevronDown size={14} className="text-tuao-text-secondary" />
                ) : (
                  <ChevronRight size={14} className="text-tuao-text-secondary" />
                )}
                <p className="text-xs font-bold uppercase tracking-wider text-tuao-text-secondary">Esportes</p>
              </button>
            )}

            {(isExpanded || isMobileOpen) && sportsOpen && sportsNav}

            {!isExpanded && !isMobileOpen && (
              <nav className="space-y-1">
                <Link
                  to="/sports"
                  onClick={closeMobile}
                  className={cn(
                    'group relative flex items-center justify-center rounded-lg px-3 py-3 transition-all',
                    sportsActive
                      ? 'bg-tuao-dark-800 text-white'
                      : 'text-tuao-text-secondary hover:bg-tuao-dark-800'
                  )}
                >
                  <Trophy size={20} className="text-amber-400" />
                  <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded border border-tuao-dark-700 bg-tuao-dark-800 px-2 py-1 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    Esportes
                  </div>
                </Link>
              </nav>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
