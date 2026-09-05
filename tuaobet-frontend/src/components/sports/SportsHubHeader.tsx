import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Crown,
  Flame,
  Gamepad2,
  Home,
  Radio,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { cn } from '../../lib/utils';

type SportTab = 'highlights' | 'creator';

const HERO_SLIDES = [
  {
    title: 'Futebol brasileiro',
    subtitle: 'Série A, Série B e Copa do Brasil — horários em Brasília e mercado 1X2.',
    gradient: 'from-tuao-dark-900 via-tuao-dark-950 to-cyan-950/40',
  },
  {
    title: 'Apostas pré-jogo',
    subtitle: 'Escolhe 1, X ou 2, define o valor e acompanha o resultado na TuãoBET.',
    gradient: 'from-tuao-dark-950 via-slate-950/80 to-tuao-dark-900',
  },
  {
    title: 'Ao vivo e próximos',
    subtitle: 'Lista por competição, como nas grandes casas — sincronizado com API-Football.',
    gradient: 'from-cyan-950/30 via-tuao-dark-950 to-tuao-dark-900',
  },
] as const;

/** IDs de liga API-Football — alinhado ao backend (SPORTS_LEAGUE_IDS). */
const BRASIL_LEAGUE_CHIPS = [
  { competition: '', label: 'Todos' },
  { competition: '71', label: 'Série A' },
  { competition: '72', label: 'Série B' },
  { competition: '73', label: 'Copa do Brasil' },
] as const;

export function SportsIconBar() {
  const location = useLocation();
  const isSports = location.pathname.startsWith('/sports');
  const isLiveAnchor =
    location.hash === '#sports-ao-vivo' || location.search.includes('view=live');

  const items = [
    {
      key: 'home',
      to: '/',
      icon: Home,
      label: 'Início',
      active: location.pathname === '/',
      disabled: false as const,
    },
    {
      key: 'live',
      to: '/sports#sports-ao-vivo',
      icon: Radio,
      label: 'Ao vivo',
      active: isSports && isLiveAnchor,
      disabled: false as const,
    },
    {
      key: 'fav',
      to: '/sports',
      icon: Star,
      label: 'Favoritos',
      active: false,
      disabled: true as const,
    },
    {
      key: 'football',
      to: '/sports',
      icon: Trophy,
      label: 'Futebol',
      active: isSports && !isLiveAnchor,
      disabled: false as const,
    },
    {
      key: 'esports',
      to: '/sports',
      icon: Gamepad2,
      label: 'Esports',
      active: false,
      disabled: true as const,
    },
  ] as const;

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const content = (
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors',
              item.active
                ? 'border-tuao-primary/50 bg-tuao-primary/15 text-tuao-primary shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'border-transparent bg-tuao-dark-800/80 text-tuao-text-secondary',
              item.disabled && 'cursor-not-allowed opacity-40',
              !item.disabled &&
                !item.active &&
                'hover:border-tuao-dark-700 hover:bg-tuao-dark-800 hover:text-white'
            )}
          >
            <Icon size={20} strokeWidth={2} />
          </span>
        );

        if (item.disabled) {
          return (
            <span key={item.key} title={item.label} aria-label={item.label}>
              {content}
            </span>
          );
        }

        return (
          <Link
            key={item.key}
            to={item.to}
            className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-tuao-primary/60"
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}

interface SubNavTabsProps {
  active: SportTab;
  onChange: (t: SportTab) => void;
}

export function SportsSubNavTabs({ active, onChange }: SubNavTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange('highlights')}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide transition-colors',
          active === 'highlights'
            ? 'border-tuao-primary/45 bg-tuao-primary/10 text-tuao-primary'
            : 'border-tuao-dark-700 bg-tuao-dark-800/60 text-tuao-text-secondary hover:border-tuao-dark-600 hover:text-white'
        )}
      >
        <Sparkles size={16} strokeWidth={2} />
        Destaques
      </button>
      <button
        type="button"
        onClick={() => onChange('creator')}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wide transition-colors',
          active === 'creator'
            ? 'border-tuao-primary/45 bg-tuao-primary/10 text-tuao-primary'
            : 'border-tuao-dark-700 bg-tuao-dark-800/60 text-tuao-text-secondary hover:border-tuao-dark-600 hover:text-white'
        )}
      >
        <Flame size={16} strokeWidth={2} />
        Criador de eventos
      </button>
    </div>
  );
}

export function SportsHeroCarousel() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % HERO_SLIDES.length), 5500);
    return () => window.clearInterval(t);
  }, []);

  const slide = HERO_SLIDES[i];

  return (
    <div className="relative overflow-hidden rounded-xl border border-tuao-dark-800">
      <div
        className={cn(
          'min-h-[140px] bg-gradient-to-br px-5 py-6 sm:min-h-[160px] sm:px-8 sm:py-8',
          slide.gradient
        )}
      >
        <h2 className="max-w-md text-xl font-black tracking-tight text-white sm:text-2xl">
          {slide.title}
        </h2>
        <p className="mt-2 max-w-lg text-sm text-tuao-text-secondary">{slide.subtitle}</p>
      </div>
      <div className="absolute bottom-3 left-5 flex gap-1.5 sm:left-8">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setI(idx)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              idx === i ? 'w-6 bg-tuao-primary' : 'w-1.5 bg-tuao-dark-600 hover:bg-tuao-dark-500'
            )}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export function SportsPopularChips() {
  const [params] = useSearchParams();
  const activeCompetition = params.get('competition') ?? '';

  const hrefForCompetition = (competition: string) => {
    const p = new URLSearchParams(params);
    if (competition) p.set('competition', competition);
    else p.delete('competition');
    const qs = p.toString();
    return qs ? `/sports?${qs}` : '/sports';
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Crown size={18} className="text-amber-400" strokeWidth={2} />
        <h3 className="text-sm font-black uppercase tracking-wide text-white">
          Campeonatos BR
        </h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BRASIL_LEAGUE_CHIPS.map((c) => {
          const isActive =
            c.competition === '' ? activeCompetition === '' : activeCompetition === c.competition;
          return (
            <Link
              key={c.competition || 'all'}
              to={hrefForCompetition(c.competition)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors',
                isActive
                  ? 'bg-tuao-primary text-tuao-dark-950'
                  : 'border border-tuao-dark-700 bg-tuao-dark-800 text-tuao-text-secondary hover:border-tuao-dark-600 hover:text-white'
              )}
            >
              {c.competition === '71' && <Trophy size={14} strokeWidth={2} />}
              {c.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
