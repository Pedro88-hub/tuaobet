import React from 'react';

export const Banner: React.FC = () => {
  return (
    <div className="w-full h-64 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl mb-8 flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Bem-vindo ao TUAO BET</h1>
        <p>A melhor plataforma de apostas.</p>
      </div>
    </div>
  );
};
