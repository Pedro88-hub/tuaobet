import { cn } from '../../../lib/utils';
import { BACCARAT_CHIP_VALUES } from '../../../hooks/useBaccaratGame';
import { BaccaratChipIcon } from './BaccaratChip';

const formatBrl = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function BaccaratChipRail({
  selectedChip,
  onSelectChip,
  totalWagered,
  acceptedTotal,
  bettingLocked,
  canPlaceBet,
  canClear,
  insufficientBalance,
  onClear,
  onPlaceBet,
}: {
  selectedChip: number;
  onSelectChip: (v: number) => void;
  totalWagered: number;
  acceptedTotal: number;
  bettingLocked: boolean;
  canPlaceBet: boolean;
  canClear: boolean;
  insufficientBalance: boolean;
  onClear: () => void;
  onPlaceBet: () => void;
}) {
  const displayTotal = acceptedTotal > 0 ? acceptedTotal : totalWagered;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-tuao-dark-700 bg-tuao-dark-950 px-3 py-2.5">
        <span className="text-xs font-semibold text-tuao-text-secondary">Aposta total</span>
        <span className="font-mono text-sm font-bold text-white">
          R$ {formatBrl(displayTotal)}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {BACCARAT_CHIP_VALUES.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSelectChip(v)}
            disabled={bettingLocked}
            aria-label={`Selecionar ficha de R$ ${v}`}
            aria-pressed={selectedChip === v}
            className={cn(
              'flex min-h-11 min-w-11 items-center justify-center rounded-full transition hover:scale-105 active:scale-95 disabled:opacity-50',
              selectedChip === v &&
                'ring-2 ring-tuao-primary ring-offset-2 ring-offset-tuao-dark-900'
            )}
          >
            <BaccaratChipIcon value={v} />
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClear}
          disabled={!canClear}
          className="h-12 flex-1 rounded-lg border border-tuao-dark-700 bg-tuao-dark-800 text-xs font-bold uppercase tracking-wide text-tuao-text-secondary transition hover:text-white disabled:pointer-events-none disabled:opacity-40"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={onPlaceBet}
          disabled={!canPlaceBet || insufficientBalance}
          className={cn(
            'h-12 flex-[1.4] rounded-lg text-sm font-bold uppercase tracking-wide transition',
            canPlaceBet && !insufficientBalance
              ? 'bg-tuao-primary text-tuao-dark-950 hover:bg-tuao-primary-hover'
              : 'bg-tuao-dark-700 text-tuao-text-secondary opacity-60'
          )}
        >
          Apostar
        </button>
      </div>

      {insufficientBalance && (
        <p className="text-center text-xs font-semibold text-red-400" role="alert">
          Saldo insuficiente para esta aposta.
        </p>
      )}
    </div>
  );
}
