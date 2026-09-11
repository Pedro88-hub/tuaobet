import { BarChart2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

const formatMult = (val: number) => (val === 0 ? '0.00×' : `${val.toFixed(2)}×`);

function historyChipClass(val: number): string {
  if (val === 0) return 'border-tuao-dark-700 bg-[#1a242d] text-tuao-text-secondary';
  if (val >= 10) {
    return 'border-amber-400/40 bg-amber-400/15 font-extrabold text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.18)]';
  }
  if (val >= 2) {
    return 'border-transparent bg-blaze-green font-extrabold text-[#0a1620]';
  }
  return 'border-tuao-primary/35 bg-tuao-primary/15 font-extrabold text-tuao-primary';
}

type MinesHistoryChipsProps = {
  history: number[];
  onOpenModal: () => void;
};

export function MinesHistoryChips({ history, onOpenModal }: MinesHistoryChipsProps) {
  return (
    <div className="absolute left-3 right-14 top-3 z-20 flex items-center gap-1.5 sm:left-4 sm:right-16">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {history.slice(0, 12).map((val, i) => (
          <span
            key={`${val}-${i}`}
            className={cn(
              'shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold tabular-nums sm:text-[11px]',
              historyChipClass(val)
            )}
          >
            {formatMult(val)}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenModal}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d]/90 text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white"
        aria-label="Histórico completo"
      >
        <BarChart2 className="h-4 w-4" strokeWidth={2.2} />
      </button>
    </div>
  );
}
