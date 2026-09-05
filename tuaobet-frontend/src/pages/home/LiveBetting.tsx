import React from 'react';
import { Radio, Timer } from 'lucide-react';

// Componente auxiliar para um cartão de partida ao vivo
const LiveMatchCard = ({ match }: { match: any }) => {
  return (
    <div className="bg-tuao-dark-800 rounded-xl p-4 border border-tuao-dark-700 hover:border-tuao-primary/50 transition-all cursor-pointer shadow-card">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-tuao-text-secondary text-xs font-medium">
          <CircleDashed size={14} />
          <span>{match.league}</span>
        </div>
        <div className="flex items-center gap-1 text-red-500 text-xs font-bold animate-pulse">
          <Timer size={14} />
          <span>{match.time}'</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-center w-1/3 gap-2">
          <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="w-12 h-12" />
          <span className="text-sm font-medium text-center">{match.homeTeam.name}</span>
        </div>
        <div className="text-2xl font-bold text-white w-1/3 text-center">
          {match.score.home} - {match.score.away}
        </div>
        <div className="flex flex-col items-center w-1/3 gap-2">
          <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="w-12 h-12" />
          <span className="text-sm font-medium text-center">{match.awayTeam.name}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button className="bg-tuao-dark-900 hover:bg-tuao-dark-700 text-tuao-text-primary py-2 rounded-md font-semibold text-sm transition-colors">
          {match.odds.home}
        </button>
        <button className="bg-tuao-dark-900 hover:bg-tuao-dark-700 text-tuao-text-primary py-2 rounded-md font-semibold text-sm transition-colors">
          {match.odds.draw}
        </button>
        <button className="bg-tuao-dark-900 hover:bg-tuao-dark-700 text-tuao-text-primary py-2 rounded-md font-semibold text-sm transition-colors">
          {match.odds.away}
        </button>
      </div>
    </div>
  );
};

import { CircleDashed } from 'lucide-react'; // Importar o ícone correto

const LiveBetting: React.FC = () => {
  // Dados mockados
  const liveMatches = [
    {
      id: 1,
      league: 'Premier League',
      time: '34',
      homeTeam: { name: 'Arsenal', logo: 'https://resources.premierleague.com/premierleague/badges/t3.svg' },
      awayTeam: { name: 'Man City', logo: 'https://resources.premierleague.com/premierleague/badges/t43.svg' },
      score: { home: 1, away: 1 },
      odds: { home: 2.45, draw: 3.10, away: 2.80 },
    },
    {
      id: 2,
      league: 'La Liga',
      time: '67',
      homeTeam: { name: 'Real Madrid', logo: 'https://assets.laliga.com/assets/public/club/s/real-madrid/32x32.png' },
      awayTeam: { name: 'Barcelona', logo: 'https://assets.laliga.com/assets/public/club/s/fc-barcelona/32x32.png' },
      score: { home: 2, away: 0 },
      odds: { home: 1.15, draw: 5.50, away: 12.00 },
    },
    {
      id: 3,
      league: 'Série A Brasil',
      time: '12',
      homeTeam: { name: 'Flamengo', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg' },
      awayTeam: { name: 'Palmeiras', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg' },
      score: { home: 0, away: 0 },
      odds: { home: 2.10, draw: 3.20, away: 3.40 },
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4 px-2">
        <Radio className="text-red-500 animate-pulse" size={20} />
        <h2 className="text-xl font-bold text-white">Apostas Ao Vivo</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {liveMatches.map((match) => (
          <LiveMatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
};

export { LiveBetting };