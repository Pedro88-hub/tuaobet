import React from 'react';
import { Button } from '../../components/ui/Button';

const Banner: React.FC = () => {
  return (
    <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6 group">
      {/* Imagem de Fundo (Substitua pela sua imagem real) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
        }}
      />
      {/* Gradiente de Sobreposição */}
      <div className="absolute inset-0 bg-gradient-to-r from-tuao-dark-950 via-tuao-dark-900/70 to-transparent" />

      {/* Conteúdo do Banner */}
      <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-12">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 max-w-md leading-tight">
          A Emoção do Esporte em Tempo Real
        </h2>
        <p className="text-tuao-text-secondary text-lg mb-6 max-w-sm">
          Aposte nas melhores ligas do mundo com as odds mais competitivas do mercado.
        </p>
        <Button size="lg" className="self-start">
          Apostar Agora
        </Button>
      </div>
    </div>
  );
};

export { Banner };