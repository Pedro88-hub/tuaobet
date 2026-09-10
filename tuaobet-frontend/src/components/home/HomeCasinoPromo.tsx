import React from 'react';
import { Gamepad2, ArrowRight } from 'lucide-react';

export const HomeCasinoPromo: React.FC = () => {
  return (
    <section className="mb-8 overflow-hidden rounded-xl border border-tuao-dark-700/90 bg-tuao-dark-900 shadow-panel">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-tuao-dark-700 bg-tuao-dark-950 text-tuao-cta">
            <Gamepad2 size={24} strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">Cassino</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-tuao-text-secondary">
              Aproveite nossa seleção exclusiva de jogos originais — Crash, Double, Mines e mais.
            </p>
          </div>
        </div>
        <a
          href="#jogos-originais"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-tuao-cta px-6 text-xs font-bold uppercase tracking-wide text-white shadow-panel transition hover:bg-tuao-cta-hover"
        >
          Ver jogos
          <ArrowRight size={16} />
        </a>
      </div>
    </section>
  );
};
