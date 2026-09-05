import React from 'react';
import { Trophy } from 'lucide-react';

const TopBettors: React.FC = () => {
  // Dados mockados
  const bettors = [
    { id: 1, username: 'PedroS', profit: 15430, avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: 2, username: 'Ana_Bet', profit: 12250, avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: 3, username: 'Carlos99', profit: 9800, avatar: 'https://i.pravatar.cc/150?u=3' },
    { id: 4, username: 'MarianaF', profit: 8500, avatar: 'https://i.pravatar.cc/150?u=4' },
    { id: 5, username: 'João_Rei', profit: 7200, avatar: 'https://i.pravatar.cc/150?u=5' },
  ];

  return (
    <div className="bg-tuao-dark-800 rounded-xl p-4 border border-tuao-dark-700">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="text-yellow-500" size={20} />
        <h3 className="text-lg font-semibold text-white">Melhores Apostadores</h3>
      </div>

      <div className="space-y-3">
        {bettors.map((bettor, index) => (
          <div
            key={bettor.id}
            className="flex items-center justify-between p-2 rounded-lg bg-tuao-dark-900 hover:bg-tuao-dark-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${index < 3 ? 'text-tuao-primary' : 'text-tuao-text-secondary'}`}>
                #{index + 1}
              </span>
              <img
                src={bettor.avatar}
                alt={bettor.username}
                className="w-8 h-8 rounded-full border-2 border-tuao-dark-700"
              />
              <span className="text-sm font-medium text-tuao-text-primary">
                {bettor.username}
              </span>
            </div>
            <span className="text-sm font-semibold text-green-500">
              R$ {bettor.profit.toLocaleString('pt-BR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export { TopBettors };