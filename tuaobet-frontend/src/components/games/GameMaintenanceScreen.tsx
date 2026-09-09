import { Settings2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

type Props = {
  gameName: string;
};

export function GameMaintenanceScreen({ gameName }: Props) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
        <Settings2 className="text-amber-400" size={28} aria-hidden />
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-wider text-amber-400">Em manutenção</p>
      <h1 className="mt-2 text-3xl font-black text-white">{gameName}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-tuao-text-secondary">
        Este jogo está temporariamente indisponível. Estamos a fazer melhorias — volta em breve.
      </p>
      <Link
        to="/#jogos-originais"
        className="mt-8 inline-flex items-center gap-1 rounded-lg bg-tuao-primary px-5 py-2.5 text-sm font-bold text-tuao-dark-950 transition hover:bg-tuao-primary-hover"
      >
        Ver outros jogos
        <ChevronRight size={18} />
      </Link>
    </div>
  );
}
