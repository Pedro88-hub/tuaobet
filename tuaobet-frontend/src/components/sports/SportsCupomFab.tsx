import { ReceiptText } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SportsCupomFabProps {
  quickBet: boolean;
  onQuickBetChange: (v: boolean) => void;
  onOpenCupom?: () => void;
}

export function SportsCupomFab({
  quickBet,
  onQuickBetChange,
  onOpenCupom,
}: SportsCupomFabProps) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-30 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-tuao-dark-700 bg-tuao-dark-900/95 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md">
        <span className="text-[10px] font-black uppercase tracking-wide text-tuao-text-secondary">
          Aposta rápida
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={quickBet}
          onClick={() => onQuickBetChange(!quickBet)}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
            quickBet
              ? 'border-tuao-primary/50 bg-tuao-primary/20'
              : 'border-tuao-dark-600 bg-tuao-dark-800'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
              quickBet ? 'left-5 translate-x-0 bg-tuao-primary' : 'left-0.5'
            )}
          />
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenCupom}
        className="pointer-events-auto flex items-center gap-2 rounded-xl bg-tuao-primary px-4 py-3 text-sm font-black uppercase tracking-wide text-tuao-dark-950 shadow-[0_0_24px_rgba(0,240,255,0.35)] transition-colors hover:bg-tuao-primary-hover"
      >
        <ReceiptText size={20} strokeWidth={2} />
        Cupom
      </button>
    </div>
  );
}
