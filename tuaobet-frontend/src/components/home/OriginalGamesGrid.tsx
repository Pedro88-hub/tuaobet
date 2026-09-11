import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TuaoLogoMark } from '../brand/TuaoLogoMark';
import crashArt from '../../assets/originals/crash.png';
import doubleArt from '../../assets/originals/double.png';
import minesArt from '../../assets/originals/mines.png';
import diceArt from '../../assets/originals/dice.png';
import plinkoArt from '../../assets/originals/plinko.png';
import towerArt from '../../assets/originals/tower.png';
import baccaratArt from '../../assets/originals/baccarat.svg';

type GameItem = {
  name: string;
  path: string;
  image: string;
  maintenance?: boolean;
};

const games: GameItem[] = [
  { name: 'Baccarat', path: '/baccarat', image: baccaratArt },
  { name: 'Crash', path: '/crash', image: crashArt },
  { name: 'Double', path: '/double', image: doubleArt },
  { name: 'Mines', path: '/mines', image: minesArt },
  { name: 'Dice', path: '/dice', image: diceArt },
  { name: 'Plinko', path: '/plinko', image: plinkoArt },
  { name: 'Tower', path: '/tower', image: towerArt, maintenance: true },
];

const GAP_PX = 12;

export const OriginalGamesGrid: React.FC = () => {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollGames = (direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.firstElementChild as HTMLElement | null;
    const step = (firstCard?.offsetWidth ?? 160) + GAP_PX;
    el.scrollTo({ left: el.scrollLeft + direction * step, behavior: 'smooth' });
  };

  return (
    <section id="jogos-originais" className="mb-10 scroll-mt-24">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 px-0.5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black tracking-tight text-white md:text-2xl">
            <TuaoLogoMark className="h-7 w-7 md:h-8 md:w-8" alt="" />
            Originais
          </h2>
          <a
            href="#jogos-originais"
            className="inline-flex items-center gap-0.5 text-sm font-medium text-tuao-text-secondary transition hover:text-white"
          >
            Ver todos
            <ChevronRight size={16} />
          </a>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollGames(-1)}
            aria-label="Anterior"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-900 text-tuao-text-secondary transition hover:border-tuao-dark-600 hover:text-white"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => scrollGames(1)}
            aria-label="Próximo"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-900 text-tuao-text-secondary transition hover:border-tuao-dark-600 hover:text-white"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="-mx-1 flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:thin]"
      >
        {games.map((g) => (
          <Link
            key={g.path}
            to={g.path}
            aria-label={g.maintenance ? `${g.name} — em manutenção` : `Jogar ${g.name}`}
            className={cn(
              'group relative w-[min(42vw,156px)] shrink-0 snap-start overflow-hidden rounded-xl',
              'border border-tuao-dark-700 bg-tuao-dark-900 shadow-panel transition duration-200',
              'hover:scale-[1.03] hover:border-tuao-primary/50 hover:shadow-[0_0_18px_rgba(0,240,255,0.22)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tuao-primary',
              g.maintenance && 'hover:border-amber-500/45 hover:shadow-[0_0_18px_rgba(245,158,11,0.2)]'
            )}
          >
            <img
              src={g.image}
              alt=""
              draggable={false}
              className="aspect-[3/4] w-full object-cover transition duration-200 group-hover:brightness-110"
            />
            {g.maintenance && (
              <span className="absolute right-2 top-2 rounded-md border border-amber-500/40 bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-tuao-dark-950 shadow-sm">
                Manutenção
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
};
