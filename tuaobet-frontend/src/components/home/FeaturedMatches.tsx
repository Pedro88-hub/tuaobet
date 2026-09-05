import React from 'react';
import { Star, CircleDashed } from 'lucide-react';

type FeaturedMatch = {
  id: number;
  league: string;
  date: string;
  time: string;
  homeTeam: { name: string; logo: string };
  awayTeam: { name: string; logo: string };
  odds: { home: number; draw: number; away: number };
};

const FeaturedMatchRow = ({ match }: { match: FeaturedMatch }) => {
  return (
    <div className="flex cursor-pointer flex-col items-center justify-between gap-4 rounded-2xl border border-tuao-dark-700 bg-tuao-dark-900 p-4 shadow-card transition-all hover:border-tuao-primary/40 md:flex-row">
      <div className="flex flex-1 flex-col items-center gap-4 md:flex-row">
        <div className="flex flex-col items-center text-xs font-medium text-tuao-text-secondary">
          <span>{match.date}</span>
          <span className="font-bold text-white">{match.time}</span>
        </div>
        <div className="mx-2 hidden h-10 w-px bg-tuao-dark-700 md:block" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-tuao-text-secondary md:justify-start">
            <CircleDashed size={14} />
            <span>{match.league}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <div className="flex items-center gap-2">
              <img src={match.homeTeam.logo} alt="" className="h-6 w-6 object-contain" />
              <span className="font-medium text-white">{match.homeTeam.name}</span>
            </div>
            <span className="text-tuao-text-secondary">vs</span>
            <div className="flex items-center gap-2">
              <img src={match.awayTeam.logo} alt="" className="h-6 w-6 object-contain" />
              <span className="font-medium text-white">{match.awayTeam.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full gap-2 md:w-auto">
        <button
          type="button"
          className="flex min-w-[76px] flex-1 flex-col items-center justify-center rounded-xl border border-tuao-dark-700 bg-tuao-dark-950 px-4 py-2 transition-colors hover:border-tuao-primary/30 hover:bg-tuao-dark-800 md:flex-none"
        >
          <span className="mb-0.5 text-xs text-tuao-text-secondary">1</span>
          <span className="font-bold text-white">{match.odds.home.toFixed(2)}</span>
        </button>
        <button
          type="button"
          className="flex min-w-[76px] flex-1 flex-col items-center justify-center rounded-xl border border-tuao-dark-700 bg-tuao-dark-950 px-4 py-2 transition-colors hover:border-tuao-primary/30 hover:bg-tuao-dark-800 md:flex-none"
        >
          <span className="mb-0.5 text-xs text-tuao-text-secondary">X</span>
          <span className="font-bold text-white">{match.odds.draw.toFixed(2)}</span>
        </button>
        <button
          type="button"
          className="flex min-w-[76px] flex-1 flex-col items-center justify-center rounded-xl border border-tuao-dark-700 bg-tuao-dark-950 px-4 py-2 transition-colors hover:border-tuao-primary/30 hover:bg-tuao-dark-800 md:flex-none"
        >
          <span className="mb-0.5 text-xs text-tuao-text-secondary">2</span>
          <span className="font-bold text-white">{match.odds.away.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
};

const featuredMatches: FeaturedMatch[] = [
  {
    id: 1,
    league: 'Champions League',
    date: 'Hoje',
    time: '16:00',
    homeTeam: {
      name: 'Bayern',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg',
    },
    awayTeam: {
      name: 'PSG',
      logo: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
    },
    odds: { home: 1.95, draw: 3.8, away: 3.4 },
  },
  {
    id: 2,
    league: 'Premier League',
    date: 'Amanhã',
    time: '13:30',
    homeTeam: {
      name: 'Liverpool',
      logo: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg',
    },
    awayTeam: {
      name: 'Man Utd',
      logo: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg',
    },
    odds: { home: 2.1, draw: 3.5, away: 3.1 },
  },
  {
    id: 3,
    league: 'La Liga',
    date: 'Amanhã',
    time: '17:00',
    homeTeam: {
      name: 'Atl. Madrid',
      logo: 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg',
    },
    awayTeam: {
      name: 'Sevilla',
      logo: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg',
    },
    odds: { home: 1.8, draw: 3.4, away: 4.5 },
  },
];

export const FeaturedMatches: React.FC = () => {
  return (
    <section className="mb-6">
      <div className="mb-4 flex items-center gap-2 px-0.5">
        <Star className="text-tuao-primary" size={22} strokeWidth={2.5} />
        <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">Em destaque</h2>
      </div>
      <div className="flex flex-col gap-3">
        {featuredMatches.map((match) => (
          <FeaturedMatchRow key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
};
