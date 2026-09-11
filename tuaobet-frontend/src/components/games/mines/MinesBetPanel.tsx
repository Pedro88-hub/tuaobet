import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Info, Maximize2, Repeat, Settings2, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { cn } from '../../../lib/utils';
import type { GameState } from '../../../hooks/useMinesGame';
import {
  formatCentsMask,
  maskDigitsFromNumber,
  numberFromMaskDigits,
  sanitizeMaskDigits,
} from '../../../lib/brlMask';

type MinesBetPanelProps = {
  betMode: 'normal' | 'auto';
  onBetModeChange: (mode: 'normal' | 'auto') => void;
  betAmountDigits: string;
  onBetAmountDigitsChange: (digits: string) => void;
  gameState: GameState;
  isAutoPlaying: boolean;
  minesCount: number;
  onMinesCountChange: (n: number) => void;
  autoBetCount: string;
  onAutoBetCountChange: (v: string) => void;
  autoTilesCount: string;
  onAutoTilesCountChange: (v: string) => void;
  cashoutPayout: number;
  onBeginRound: () => void;
  onCashout: () => void;
  onToggleAuto: () => void;
  onToggleFullscreen: () => void;
  soundMuted: boolean;
  onToggleMute: () => void;
  lastError: string | null;
};

export function MinesBetPanel({
  betMode,
  onBetModeChange,
  betAmountDigits,
  onBetAmountDigitsChange,
  gameState,
  isAutoPlaying,
  minesCount,
  onMinesCountChange,
  autoBetCount,
  onAutoBetCountChange,
  autoTilesCount,
  onAutoTilesCountChange,
  cashoutPayout,
  onBeginRound,
  onCashout,
  onToggleAuto,
  onToggleFullscreen,
  soundMuted,
  onToggleMute,
  lastError,
}: MinesBetPanelProps) {
  const betAmountDisplay = formatCentsMask(betAmountDigits);
  const playing = gameState === 'PLAYING';

  const handleHalve = () => {
    const v = numberFromMaskDigits(betAmountDigits);
    if (!Number.isFinite(v) || v <= 0) {
      onBetAmountDigitsChange('');
      return;
    }
    onBetAmountDigitsChange(maskDigitsFromNumber(v / 2));
  };

  const handleDouble = () => {
    const v = numberFromMaskDigits(betAmountDigits);
    if (!Number.isFinite(v)) {
      onBetAmountDigitsChange('');
      return;
    }
    onBetAmountDigitsChange(maskDigitsFromNumber(v * 2));
  };

  let primaryCta: ReactNode;
  if (betMode === 'auto') {
    primaryCta = (
      <Button
        type="button"
        size="lg"
        className={cn(
          'h-12 w-full px-2 text-[11px] font-black uppercase tracking-wider sm:text-sm',
          isAutoPlaying
            ? 'border border-red-500/40 bg-red-500/90 text-white hover:bg-red-600'
            : 'border border-tuao-primary/30 bg-tuao-primary text-tuao-dark-950 shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:bg-tuao-primary-hover'
        )}
        onClick={onToggleAuto}
      >
        {isAutoPlaying ? 'Parar auto' : 'Iniciar auto'}
      </Button>
    );
  } else if (playing) {
    primaryCta = (
      <Button
        type="button"
        size="lg"
        data-mines-bet-anchor
        className="h-12 w-full border border-emerald-500/35 bg-emerald-600 px-2 text-[11px] font-black uppercase tracking-wider text-white hover:bg-emerald-500 sm:text-sm"
        onClick={onCashout}
      >
        <span className="flex flex-col items-center leading-tight">
          <span>Sacar</span>
          <span className="text-[10px] font-bold tabular-nums opacity-90 sm:text-[11px]">
            R${' '}
            {cashoutPayout.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </span>
      </Button>
    );
  } else {
    primaryCta = (
      <Button
        type="button"
        size="lg"
        data-mines-bet-anchor
        className="h-12 w-full border border-tuao-primary/30 bg-tuao-primary px-2 text-[11px] font-black uppercase tracking-wider text-tuao-dark-950 shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:bg-tuao-primary-hover sm:text-sm"
        onClick={onBeginRound}
      >
        Começar o jogo
      </Button>
    );
  }

  return (
    <div className="flex min-h-0 w-full shrink-0 flex-col border-t border-tuao-dark-800 bg-blaze-panel lg:w-[300px] lg:border-b-0 lg:border-r lg:border-t-0 lg:bg-tuao-dark-900">
      <div className="shrink-0 px-3 pb-2 pt-3 sm:px-4">
        <div className="flex rounded-lg border border-tuao-dark-800 bg-[#1a242d] p-1 lg:bg-tuao-dark-950">
          <button
            type="button"
            onClick={() => onBetModeChange('normal')}
            className={cn(
              'flex-1 rounded-md py-2.5 text-sm font-bold transition-colors',
              betMode === 'normal'
                ? 'bg-[#2a3540] text-white shadow-sm lg:bg-tuao-dark-800'
                : 'text-tuao-text-secondary hover:text-white'
            )}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => onBetModeChange('auto')}
            className={cn(
              'flex-1 rounded-md py-2.5 text-sm font-bold transition-colors',
              betMode === 'auto'
                ? 'bg-[#2a3540] text-white shadow-sm lg:bg-tuao-dark-800'
                : 'text-tuao-text-secondary hover:text-white'
            )}
          >
            Auto
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3 sm:px-4 [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
          <div className="flex flex-row gap-2 lg:flex-col">
            <div className="flex min-w-0 flex-1 gap-2 lg:w-full">
              <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border border-tuao-dark-700 bg-[#1a242d] px-3 transition-colors focus-within:border-tuao-primary focus-within:ring-1 focus-within:ring-tuao-primary lg:bg-tuao-dark-950">
                <span className="shrink-0 text-sm font-semibold text-white">Valor</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={betAmountDisplay}
                  onChange={(e) => onBetAmountDigitsChange(sanitizeMaskDigits(e.target.value))}
                  disabled={playing && !isAutoPlaying}
                  className="min-w-0 flex-1 bg-transparent text-right text-base font-bold text-white outline-none placeholder:text-tuao-text-secondary/60"
                />
                <span className="shrink-0 text-sm font-semibold text-white">R$</span>
              </div>
              <button
                type="button"
                onClick={handleHalve}
                disabled={playing}
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700 disabled:opacity-50 sm:w-12 lg:bg-tuao-dark-800"
                aria-label="Metade do valor"
              >
                ½
              </button>
              <button
                type="button"
                onClick={handleDouble}
                disabled={playing}
                className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700 disabled:opacity-50 sm:w-12 lg:bg-tuao-dark-800"
                aria-label="Dobrar o valor"
              >
                2x
              </button>
            </div>
            <div className="w-[7.75rem] shrink-0 sm:w-40 lg:w-full">{primaryCta}</div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold capitalize text-white">Número de minas</div>
            <div className="relative">
              <select
                value={minesCount}
                onChange={(e) => onMinesCountChange(Number(e.target.value))}
                disabled={playing}
                className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-tuao-dark-700 bg-[#1a242d] px-3 pr-10 text-base font-bold text-white outline-none transition-colors focus:border-tuao-primary focus:ring-1 focus:ring-tuao-primary disabled:opacity-50 lg:bg-tuao-dark-950"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tuao-text-secondary">
                <Settings2 className="h-4 w-4" strokeWidth={2.2} />
              </div>
            </div>
          </div>

          {betMode === 'auto' && (
            <>
              <div className="space-y-2">
                <div className="text-sm font-semibold capitalize text-white">
                  Apostas (0 = infinito)
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={autoBetCount}
                    onChange={(e) => onAutoBetCountChange(e.target.value)}
                    className="h-12 border-tuao-dark-700 bg-[#1a242d] pr-10 text-base font-bold focus:border-tuao-primary lg:bg-tuao-dark-950"
                    disabled={isAutoPlaying}
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tuao-text-secondary">
                    <Repeat className="h-4 w-4" strokeWidth={2.2} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold capitalize text-white">Peças para abrir</div>
                <div className="relative">
                  <Input
                    type="number"
                    value={autoTilesCount}
                    onChange={(e) => onAutoTilesCountChange(e.target.value)}
                    max={25 - minesCount}
                    min={1}
                    className="h-12 border-tuao-dark-700 bg-[#1a242d] pr-10 text-base font-bold focus:border-tuao-primary lg:bg-tuao-dark-950"
                    disabled={isAutoPlaying}
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-tuao-text-secondary">
                    <Square className="h-4 w-4" strokeWidth={2.2} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 px-3 pb-3 pt-1 sm:px-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white lg:bg-tuao-dark-950"
              aria-label="Tela cheia"
            >
              <Maximize2 className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white lg:bg-tuao-dark-950"
              aria-label={soundMuted ? 'Ativar som' : 'Silenciar'}
            >
              {soundMuted ? (
                <VolumeX className="h-4 w-4" strokeWidth={2.2} />
              ) : (
                <Volume2 className="h-4 w-4" strokeWidth={2.2} />
              )}
            </button>
            <Link
              to="/fairness"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white lg:bg-tuao-dark-950"
              aria-label="Informação e justiça"
            >
              <Info className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </div>
        </div>
      </div>

      {lastError && (
        <div className="mt-auto border-t border-tuao-dark-800 bg-[#1a242d]/50 p-3 lg:bg-tuao-dark-950/30">
          <p className="text-center text-xs text-red-400">{lastError}</p>
        </div>
      )}
    </div>
  );
}
