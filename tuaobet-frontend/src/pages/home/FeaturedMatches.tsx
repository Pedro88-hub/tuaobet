import React from 'react';
import { Star } from 'lucide-react';
import { CircleDashed } from 'lucide-react';

// Componente auxiliar para uma linha de partida em destaque
const FeaturedMatchRow = ({ match }: { match: any }) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between bg-tuao-dark-800 rounded-xl p-4 border border-tuao-dark-700 hover:border-tuao-primary/50 transition-all cursor-pointer shadow-card gap-4">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex flex-col items-center text-tuao-text-secondary text-xs font-medium">
          <span>{match.date}</span>
          <span className="text-white font-bold">{match.time}</span>
        </div>
        <div className="w-px h-10 bg-tuao-dark-700 mx-2 hidden md:block"></div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2 text-tuao-text-secondary text-xs font-medium">
            <CircleDashed size={14} />
            <span>{match.league}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-6 h-6" />
              <span className="font-medium">{match.homeTeam.name}</span>
            </div>
            <span className="text-tuao-text-secondary">vs</span>
            <div className="flex items-center gap-2">
              <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-6 h-6" />
              <span className="font-medium">{match.awayTeam.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 w-full md:w-auto">
        <button className="flex-1 md:flex-none flex flex-col items-center justify-center bg-tuao-dark-900 hover:bg-tuao-dark-700 text-tuao-text-primary px-6 py-2 rounded-md transition-colors min-w-[80px]">
          <span className="text-xs text-tuao-text-secondary mb-0.5">1</span>
          <span className="font-bold">{match.odds.home.toFixed(2)}</span>
        </button>
        <button className="flex-1 md:flex-none flex flex-col items-center justify-center bg-tuao-dark-900 hover:bg-tuao-dark-700 text-tuao-text-primary px-6 py-2 rounded-md transition-colors min-w-[80px]">
          <span className="text-xs text-tuao-text-secondary mb-0.5">X</span>
          <span className="font-bold">{match.odds.draw.toFixed(2)}</span>
        </button>
        <button className="flex-1 md:flex-none flex flex-col items-center justify-center bg-tuao-dark-900 hover:bg-tuao-dark-700 text-tuao-text-primary px-6 py-2 rounded-md transition-colors min-w-[80px]">
          <span className="text-xs text-tuao-text-secondary mb-0.5">2</span>
          <span className="font-bold">{match.odds.away.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
};

const FeaturedMatches: React.FC = () => {
  // Dados mockados
  const featuredMatches = [
    {
      id: 1,
      league: 'Champions League',
      date: 'Hoje',
      time: '16:00',
      homeTeam: { name: 'Bayern', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg' },
      awayTeam: { name: 'PSG', logo: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg' },
      odds: { home: 1.95, draw: 3.80, away: 3.40 },
    },
    {
      id: 2,
      league: 'Premier League',
      date: 'Amanhã',
      time: '13:30',
      homeTeam: { name: 'Liverpool', logo: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg' },
      awayTeam: { name: 'Man Utd', logo: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg' },
      odds: { home: 2.10, draw: 3.50, away: 3.10 },
    },
    {
      id: 3,
      league: 'La Liga',
      date: 'Amanhã',
      time: '17:00',
      homeTeam: { name: 'Atl. Madrid', logo: 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg' },
      awayTeam: { name: 'Sevilla', logo: 'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg' },
      odds: { home: 1.80, draw: 3.40, away: 4.50 },
    },
    {
      id: 4,
      league: 'Serie A Itália',
      date: 'Domingo',
      time: '15:45',
      homeTeam: { name: 'Juventus', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_icon_%28black%29.svg' },
      awayTeam: { name: 'Inter', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg' },
      odds: { home: 2.60, draw: 3.10, away: 2.70 },
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 px-2">
        <Star className="text-tuao-primary" size={20} />
        <h2 className="text-xl font-bold text-white">Partidas em Destaque</h2>
      </div>
      <div className="flex flex-col gap-3">
        {featuredMatches.map((match) => (
          <FeaturedMatchRow key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
};

export { FeaturedMatches };