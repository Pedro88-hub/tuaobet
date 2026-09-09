import React from 'react';
import { ShieldCheck, Zap, Headphones } from 'lucide-react';

const items = [
  {
    icon: ShieldCheck,
    title: 'Transparência',
    text: 'Verificação de fairness disponível para cada rodada.',
  },
  {
    icon: Zap,
    title: 'Instantâneo',
    text: 'Apostas e resultados em tempo real, sem espera.',
  },
  {
    icon: Headphones,
    title: 'Suporte',
    text: 'Equipe disponível quando você precisar de ajuda.',
  },
];

export const HomeTrustStrip: React.FC = () => {
  return (
    <section className="mb-12 grid gap-4 rounded-2xl border border-tuao-dark-800 bg-tuao-dark-900/50 p-6 md:grid-cols-3 md:p-8">
      {items.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-tuao-dark-700 bg-tuao-dark-800 text-tuao-primary">
            <Icon size={22} strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold text-white">{title}</p>
            <p className="mt-1 text-sm leading-snug text-tuao-text-secondary">{text}</p>
          </div>
        </div>
      ))}
    </section>
  );
};
