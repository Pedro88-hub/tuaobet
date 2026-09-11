import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Menu, Search, Spade, Star, Tv } from 'lucide-react';
import { cn } from '../../lib/utils';

const CASINO_PATHS = ['/crash', '/double', '/mines', '/plinko', '/dice', '/baccarat', '/fairness'];

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

const itemClass =
  'flex min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 py-2 text-center';

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu }) => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const isCasinoHub = CASINO_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const liveSportsTo = '/sports#sports-ao-vivo';

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[#0a0e14] lg:hidden',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(0,0,0,0.45)]'
      )}
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-0 px-1.5 sm:px-2">
        <button type="button" onClick={onOpenMenu} className={cn(itemClass, 'text-tuao-text-secondary active:text-white')}>
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
            <Menu className="h-[22px] w-[22px] opacity-90" strokeWidth={2.2} />
            <Search
              className="absolute -bottom-px -right-px h-3 w-3 rounded-full bg-[#0a0e14] p-px text-tuao-text-secondary"
              strokeWidth={2.5}
            />
          </span>
          <span className="w-full text-[9px] font-semibold leading-none">Menu</span>
        </button>

        <Link
          to={liveSportsTo}
          className={cn(itemClass, 'text-tuao-text-secondary transition-colors active:text-white')}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center">
            <Tv className="h-[22px] w-[22px] opacity-90" strokeWidth={2.2} />
          </span>
          <span className="w-full max-w-[5.5rem] text-[9px] font-semibold leading-tight">
            Cassino Ao Vivo
          </span>
        </Link>

        <Link to="/" className={itemClass}>
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[2.5px] transition-colors',
              isHome || isCasinoHub
                ? 'border-tuao-primary text-tuao-primary shadow-[0_0_16px_rgba(0,240,255,0.35)]'
                : 'border-transparent text-tuao-text-secondary'
            )}
          >
            {isCasinoHub && !isHome ? (
              <LayoutGrid className="h-5 w-5" strokeWidth={2.2} />
            ) : (
              <Home className="h-5 w-5" strokeWidth={2.2} />
            )}
          </span>
          <span
            className={cn(
              'w-full text-[9px] font-semibold leading-none',
              isHome || isCasinoHub ? 'font-bold text-tuao-primary' : 'text-tuao-text-secondary'
            )}
          >
            {isCasinoHub && !isHome ? 'Cassino' : 'Home'}
          </span>
        </Link>

        <Link
          to="/#jogos-originais"
          className={cn(itemClass, 'text-tuao-text-secondary transition-colors active:text-white')}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center">
            <Spade className="h-[22px] w-[22px] opacity-90" strokeWidth={2.2} />
          </span>
          <span className="w-full text-[9px] font-semibold leading-none">Originals</span>
        </Link>

        <Link to="/" className={cn(itemClass, 'text-tuao-text-secondary transition-colors active:text-white')}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-tuao-dark-600/80">
              <Star className="h-4 w-4 opacity-90" strokeWidth={2.2} />
            </span>
          </span>
          <span className="w-full text-[9px] font-semibold leading-none">Recompensas</span>
        </Link>
      </div>
    </nav>
  );
};
