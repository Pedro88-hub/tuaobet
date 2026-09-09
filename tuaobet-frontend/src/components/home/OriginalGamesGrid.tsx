import React from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Disc, Bomb, Dices, LayoutGrid, ChevronRight, Spade } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BACCARAT_IN_MAINTENANCE } from '../../lib/gameMaintenance';

type GameItem = {
  name: string;
  path: string;
  tagline: string;
  icon: React.ElementType;
  gradient: string;
  accent: string;
  maintenance?: boolean;
};

const games: GameItem[] = [
  {
    name: 'Crash',
    path: '/crash',
    tagline: 'Sai antes que estoure',
    icon: Rocket,
    gradient: 'from-red-600/40 via-tuao-dark-900 to-tuao-dark-950',
    accent: 'text-red-400',
  },
  {
    name: 'Double',
    path: '/double',
    tagline: 'Vermelho, branco ou preto',
    icon: Disc,
    gradient: 'from-zinc-500/30 via-tuao-dark-900 to-tuao-dark-950',
    accent: 'text-zinc-200',
  },
  {
    name: 'Mines',
    path: '/mines',
    tagline: 'Campo minado com prêmios',
    icon: Bomb,
    gradient: 'from-amber-500/35 via-tuao-dark-900 to-tuao-dark-950',
    accent: 'text-amber-400',
  },
  {
    name: 'Dice',
    path: '/dice',
    tagline: 'Previsão e multiplicador',
    icon: Dices,
    gradient: 'from-sky-500/35 via-tuao-dark-900 to-tuao-dark-950',
    accent: 'text-sky-400',
  },
  {
    name: 'Plinko',
    path: '/plinko',
    tagline: 'Deixa cair e ganha',
    icon: LayoutGrid,
    gradient: 'from-fuchsia-500/35 via-tuao-dark-900 to-tuao-dark-950',
    accent: 'text-fuchsia-400',
  },
  {
    name: 'Baccarat',
    path: '/baccarat',
    tagline: 'Player, Banker ou empate',
    icon: Spade,
    gradient: 'from-emerald-600/35 via-tuao-dark-900 to-tuao-dark-950',
    accent: 'text-emerald-400',
    maintenance: BACCARAT_IN_MAINTENANCE,
  },
];

export const OriginalGamesGrid: React.FC = () => {
  return (
    <section id="jogos-originais" className="mb-12 scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 px-0.5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">Jogos originais</h2>
          <p className="mt-1 max-w-xl text-sm text-tuao-text-secondary">
            Os clássicos da casa — rápidos de jogar, fáceis de perceber.
          </p>
        </div>
        <Link
          to="/fairness"
          className="inline-flex items-center gap-1 text-sm font-semibold text-tuao-primary transition hover:text-tuao-primary-hover"
        >
          Provably Fair
          <ChevronRight size={18} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((g) => (
          <Link
            key={g.path}
            to={g.path}
            className={cn(
              'group relative overflow-hidden rounded-2xl border border-tuao-dark-700 bg-tuao-dark-900 p-6 transition-all',
              g.maintenance
                ? 'hover:border-amber-500/40'
                : 'hover:border-tuao-primary/45 hover:shadow-neon'
            )}
          >
            <div
              className={cn(
                'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90 transition group-hover:opacity-100',
                g.gradient
              )}
            />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className={cn('text-xs font-bold uppercase tracking-wider', g.accent)}>{g.name}</p>
                  {g.maintenance && (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Manutenção
                    </span>
                  )}
                </div>
                <p className="mt-2 text-lg font-bold text-white">{g.tagline}</p>
              </div>
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25',
                  'transition group-hover:border-tuao-primary/40 group-hover:bg-black/40'
                )}
              >
                <g.icon size={22} className={g.accent} />
              </div>
            </div>
            <div
              className={cn(
                'relative mt-6 flex items-center text-sm font-semibold',
                g.maintenance ? 'text-amber-300' : 'text-tuao-primary'
              )}
            >
              {g.maintenance ? 'Em manutenção' : 'Jogar agora'}
              <ChevronRight
                size={18}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
