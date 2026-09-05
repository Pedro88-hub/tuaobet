import React from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';

export const LiveBetting: React.FC = () => {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/60 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">Ao vivo</h2>
        </div>
        <Link
          to="/sports"
          className="text-xs font-semibold uppercase tracking-wide text-tuao-primary hover:text-tuao-primary-hover"
        >
          Ver esportes
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-tuao-dark-700 bg-gradient-to-b from-tuao-dark-800/80 to-tuao-dark-900 px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-tuao-dark-600 bg-tuao-dark-950 text-tuao-text-secondary">
          <Radio size={28} className="animate-pulse-dot" />
        </div>
        <p className="max-w-sm text-sm text-tuao-text-secondary">
          Sem eventos ao vivo neste momento. Explora o{' '}
          <Link to="/crash" className="font-semibold text-tuao-primary hover:underline">
            Crash
          </Link>{' '}
          ou outros jogos originais enquanto isso.
        </p>
      </div>
    </section>
  );
};
