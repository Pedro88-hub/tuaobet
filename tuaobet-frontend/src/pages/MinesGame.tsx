import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useMinesGame } from '../hooks/useMinesGame';
import { cn } from '../lib/utils';
import { Bomb, Crown, Gem, Info, Maximize2, Repeat, Settings2, Square, Wifi } from 'lucide-react';
import { useMinesLiveBets } from '../hooks/useMinesLiveBets';

const formatMult = (val: number) => (val === 0 ? '0.00×' : `${val.toFixed(2)}×`);

const MAX_VISIBLE_LIVE_BETS = 14;

const formatBrlAmount = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function crownToneClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const r = Math.abs(h) % 3;
  if (r === 0) return 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]';
  if (r === 1) return 'text-tuao-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.35)]';
  return 'text-amber-400/95 drop-shadow-[0_0_6px_rgba(251,191,36,0.25)]';
}

export function MinesGame() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const [amount, setAmount] = useState('');
  const {
    gameState,
    minesCount,
    setMinesCount,
    grid,
    revealed,
    multiplier,
    history,
    startGameWithBet,
    revealCell,
    cashout,
    error: lastError,
  } = useMinesGame();

  const { liveBets } = useMinesLiveBets();

  const beginRound = useCallback(() => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    const amt = parseFloat(amount || '0');
    if (!Number.isFinite(amt) || amt <= 0) return;
    void startGameWithBet(amt);
  }, [isAuthenticated, openLoginModal, amount, startGameWithBet]);

  const [betMode, setBetMode] = useState<'normal' | 'auto'>('normal');
  const [lowerTab, setLowerTab] = useState<'apostas' | 'historico' | 'descricao'>('apostas');

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoBetCount, setAutoBetCount] = useState('');
  const [autoTilesCount, setAutoTilesCount] = useState('');
  const [roundsPlayed, setRoundsPlayed] = useState(0);

  const autoPlayRef = useRef(false);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    autoPlayRef.current = isAutoPlaying;
  }, [isAutoPlaying]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const handleHalve = () =>
    setAmount((prev) => {
      const v = parseFloat(prev);
      if (!Number.isFinite(v) || v <= 0) return '';
      return (v / 2).toFixed(2);
    });
  const handleDouble = () =>
    setAmount((prev) => {
      const v = parseFloat(prev);
      if (!Number.isFinite(v)) return '';
      return (v * 2).toFixed(2);
    });

  const totalWin = (Number.isFinite(parseFloat(amount)) ? parseFloat(amount) : 0) * multiplier;

  const toggleAutoPlay = () => {
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      setRoundsPlayed(0);
    } else {
      setIsAutoPlaying(true);
      setRoundsPlayed(0);
      if (gameState === 'IDLE' || gameState === 'GAME_OVER' || gameState === 'CASHOUT') {
        beginRound();
      }
    }
  };

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (isAutoPlaying && (gameState === 'GAME_OVER' || gameState === 'CASHOUT')) {
      const maxRounds = parseInt(autoBetCount.trim(), 10);
      const currentRounds = roundsPlayed + 1;

      if (Number.isFinite(maxRounds) && maxRounds > 0 && currentRounds >= maxRounds) {
        setIsAutoPlaying(false);
        setRoundsPlayed(0);
        return;
      }

      setRoundsPlayed(currentRounds);

      timeout = setTimeout(() => {
        if (autoPlayRef.current) {
          beginRound();
        }
      }, 1500);
    }

    return () => clearTimeout(timeout);
  }, [gameState, isAutoPlaying, autoBetCount, roundsPlayed, beginRound]);

  useEffect(() => {
    if (isAutoPlaying && gameState === 'PLAYING') {
      const revealedCount = revealed.filter((r) => r).length;
      const targetTiles = parseInt(autoTilesCount.trim(), 10);
      if (!Number.isFinite(targetTiles) || targetTiles < 1) return;

      if (revealedCount < targetTiles) {
        const unrevealedIndices = revealed
          .map((r, i) => (!r ? i : -1))
          .filter((i) => i !== -1);

        if (unrevealedIndices.length > 0) {
          const randomIndex = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];

          const timer = setTimeout(() => {
            if (autoPlayRef.current && gameStateRef.current === 'PLAYING') {
              revealCell(randomIndex);
            }
          }, 400);
          return () => clearTimeout(timer);
        }
      } else {
        const timer = setTimeout(() => {
          if (autoPlayRef.current && gameStateRef.current === 'PLAYING') {
            cashout();
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState, isAutoPlaying, revealed, autoTilesCount, revealCell, cashout]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const diamondsCount = 25 - minesCount;
      const revealedDiamonds = revealed.reduce((acc, r, i) => acc + (r && !grid[i] ? 1 : 0), 0);

      if (revealedDiamonds === diamondsCount) {
        cashout();
      }
    }
  }, [revealed, gameState, minesCount, grid, cashout]);

  const toggleFullscreen = useCallback(() => {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      void root.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  const primaryCta =
    betMode === 'auto' ? (
      <Button
        type="button"
        size="lg"
        className={cn(
          'h-12 w-full px-2 text-[11px] font-black uppercase tracking-wider sm:text-sm',
          isAutoPlaying
            ? 'border border-red-500/40 bg-red-500/90 text-white hover:bg-red-600'
            : 'border border-tuao-primary/30 bg-tuao-primary text-tuao-dark-950 shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:bg-tuao-primary-hover'
        )}
        onClick={toggleAutoPlay}
      >
        {isAutoPlaying ? 'Parar auto' : 'Iniciar auto'}
      </Button>
    ) : gameState === 'PLAYING' ? (
      <Button
        type="button"
        size="lg"
        className="h-12 w-full border border-emerald-500/35 bg-emerald-600 px-2 text-[11px] font-black uppercase tracking-wider text-white hover:bg-emerald-500 sm:text-sm"
        onClick={cashout}
      >
        <span className="flex flex-col items-center leading-tight">
          <span>Sacar</span>
          <span className="text-[10px] font-bold tabular-nums opacity-90 sm:text-[11px]">
            R$ {totalWin.toFixed(2)}
          </span>
        </span>
      </Button>
    ) : (
      <Button
        type="button"
        size="lg"
        className="h-12 w-full border border-tuao-primary/30 bg-tuao-primary px-2 text-[11px] font-black uppercase tracking-wider text-tuao-dark-950 shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:bg-tuao-primary-hover sm:text-sm"
        onClick={beginRound}
      >
        Começar o jogo
      </Button>
    );

  return (
    <Layout>
      {/* Mobile: grid em cima, apostas embaixo — mesmo padrão Blaze/Double */}
      <div className="mx-auto flex max-w-6xl flex-col gap-0 p-2 pb-8 text-white sm:p-4">
        <div className="flex flex-col-reverse gap-0 overflow-hidden rounded-xl border border-tuao-dark-800 bg-blaze-panel shadow-card lg:flex-row lg:bg-tuao-dark-900">
          {/* Painel de apostas */}
          <div className="flex min-h-0 w-full shrink-0 flex-col border-t border-tuao-dark-800 bg-blaze-panel lg:w-[300px] lg:border-b-0 lg:border-r lg:border-t-0 lg:bg-tuao-dark-900">
            <div className="shrink-0 px-3 pb-2 pt-3 sm:px-4">
              <div className="flex rounded-lg border border-tuao-dark-800 bg-[#1a242d] p-1 lg:bg-tuao-dark-950">
                <button
                  type="button"
                  onClick={() => {
                    setBetMode('normal');
                    setIsAutoPlaying(false);
                  }}
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
                  onClick={() => setBetMode('auto')}
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
                {/* Mobile Blaze: Quantia + ½/2x + CTA na mesma linha; desktop: CTA abaixo */}
                <div className="flex flex-row gap-2 lg:flex-col">
                  <div className="flex min-w-0 flex-1 gap-2 lg:w-full">
                    <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border border-tuao-dark-700 bg-[#1a242d] px-3 transition-colors focus-within:border-tuao-primary focus-within:ring-1 focus-within:ring-tuao-primary lg:bg-tuao-dark-950">
                      <span className="shrink-0 text-sm font-semibold text-white">Quantia</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={gameState === 'PLAYING' && !isAutoPlaying}
                        className="min-w-0 flex-1 bg-transparent text-right text-base font-bold text-white outline-none placeholder:text-tuao-text-secondary/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="shrink-0 text-sm font-semibold text-white">R$</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleHalve}
                      disabled={gameState === 'PLAYING'}
                      className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700 disabled:opacity-50 sm:w-12 lg:bg-tuao-dark-800"
                      aria-label="Metade do valor"
                    >
                      ½
                    </button>
                    <button
                      type="button"
                      onClick={handleDouble}
                      disabled={gameState === 'PLAYING'}
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
                      onChange={(e) => setMinesCount(Number(e.target.value))}
                      disabled={gameState === 'PLAYING'}
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
                      <div className="text-sm font-semibold capitalize text-white">Apostas (0 = infinito)</div>
                      <div className="relative">
                        <Input
                          type="number"
                          value={autoBetCount}
                          onChange={(e) => setAutoBetCount(e.target.value)}
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
                          onChange={(e) => setAutoTilesCount(e.target.value)}
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
                    onClick={toggleFullscreen}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white lg:bg-tuao-dark-950"
                    aria-label="Ecrã inteiro"
                  >
                    <Maximize2 className="h-4 w-4" strokeWidth={2.2} />
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

          {/* Visualizador */}
          <div className="relative flex min-h-0 flex-1 flex-col bg-blaze-panel lg:min-h-[520px] lg:bg-tuao-dark-900">
            <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-8 pt-4 sm:px-6 sm:pb-6">
              <div className="grid aspect-square w-full max-w-[min(100%,560px)] grid-cols-5 gap-2.5 sm:max-w-[600px] sm:gap-4">
                {Array.from({ length: 25 }).map((_, index) => {
                  const isRevealed = revealed[index];
                  const isMine = grid[index];
                  const isGameOver = gameState === 'GAME_OVER';
                  const isCashout = gameState === 'CASHOUT';
                  const showContent = isRevealed || isGameOver || isCashout;

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => revealCell(index)}
                      disabled={gameState !== 'PLAYING' || isRevealed || isAutoPlaying}
                      className={cn(
                        'group relative aspect-square w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-tuao-primary/60',
                        isAutoPlaying && gameState === 'PLAYING' && 'cursor-wait'
                      )}
                      style={{ perspective: '1000px' }}
                    >
                      <div
                        className={cn(
                          'relative h-full w-full transition-all duration-500',
                          showContent ? '[transform:rotateY(180deg)]' : 'hover:-translate-y-0.5'
                        )}
                        style={{ transformStyle: 'preserve-3d' }}
                      >
                        <div
                          className="absolute inset-0 flex h-full w-full items-center justify-center rounded-lg border-b-4 border-tuao-dark-950 bg-tuao-dark-800"
                          style={{ backfaceVisibility: 'hidden' }}
                        >
                          <div className="h-full w-full rounded-lg bg-gradient-to-br from-tuao-dark-700 to-tuao-dark-800 opacity-50" />
                        </div>

                        <div
                          className={cn(
                            'absolute inset-0 flex h-full w-full items-center justify-center rounded-lg border bg-tuao-dark-950 border-tuao-dark-800',
                            isGameOver && isMine && 'border-red-500/40 bg-red-500/15',
                            (isRevealed || isCashout) && !isMine && 'border-tuao-primary/35 bg-tuao-primary/[0.08] shadow-[0_0_14px_rgba(0,240,255,0.12)]'
                          )}
                          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                          {isMine ? (
                            <Bomb
                              className={cn(
                                'h-[46%] w-[46%] sm:h-[52%] sm:w-[52%]',
                                isRevealed || isGameOver ? 'fill-red-500 text-red-500' : 'text-white/30'
                              )}
                              aria-hidden
                            />
                          ) : (
                            <Gem
                              className={cn(
                                'h-[46%] w-[46%] sm:h-[52%] sm:w-[52%]',
                                isRevealed || isCashout
                                  ? 'fill-tuao-primary text-tuao-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.45)]'
                                  : 'text-tuao-primary/30'
                              )}
                              aria-hidden
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {(gameState === 'GAME_OVER' || gameState === 'CASHOUT') && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <div className="animate-in fade-in zoom-in flex flex-col items-center rounded-2xl border border-tuao-dark-700 bg-tuao-dark-950/92 px-8 py-6 shadow-2xl backdrop-blur-sm duration-300">
                    {gameState === 'CASHOUT' ? (
                      <>
                        <Gem className="mb-2 h-12 w-12 text-tuao-primary drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]" />
                        <h2 className="text-xl font-black uppercase tracking-wider text-tuao-primary">Vitória</h2>
                        <div className="mt-2 font-mono text-3xl font-bold text-white">{multiplier.toFixed(2)}×</div>
                        <div className="mt-1 font-mono text-sm text-tuao-text-secondary">
                          R$ {totalWin.toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <>
                        <Bomb className="mb-2 h-12 w-12 text-red-500" />
                        <h2 className="text-xl font-black uppercase tracking-wider text-red-500">Explodiu</h2>
                        <div className="mt-2 text-sm text-tuao-text-secondary">Tenta outra ronda</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-tuao-text-secondary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                </span>
                <Wifi className="h-3 w-3 text-emerald-500/90" strokeWidth={2.5} />
                <span className="text-emerald-500/90">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secção inferior: abas (mesmo padrão Double) */}
        <div className="mt-3 flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-tuao-dark-800 bg-blaze-panel shadow-card sm:mt-4 lg:bg-tuao-dark-900">
          <div className="flex flex-wrap border-b border-tuao-dark-800 bg-[#1a242d]/60 lg:bg-tuao-dark-950/40">
            <button
              type="button"
              onClick={() => setLowerTab('apostas')}
              className={cn(
                'relative flex-1 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors sm:flex-none sm:px-6',
                lowerTab === 'apostas' ? 'text-white' : 'text-tuao-text-secondary hover:text-white'
              )}
            >
              Apostas
              {lowerTab === 'apostas' && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-tuao-primary shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setLowerTab('historico')}
              className={cn(
                'relative flex-1 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors sm:flex-none sm:px-6',
                lowerTab === 'historico' ? 'text-white' : 'text-tuao-text-secondary hover:text-white'
              )}
            >
              Últimos resultados
              {lowerTab === 'historico' && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-tuao-primary shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setLowerTab('descricao')}
              className={cn(
                'relative flex-1 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors sm:flex-none sm:px-6',
                lowerTab === 'descricao' ? 'text-white' : 'text-tuao-text-secondary hover:text-white'
              )}
            >
              Descrição do jogo
              {lowerTab === 'descricao' && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-tuao-primary shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
              )}
            </button>
          </div>

          {lowerTab === 'apostas' ? (
            <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden bg-blaze-panel lg:bg-tuao-dark-900">
              <div className="shrink-0 border-b border-tuao-dark-800 bg-[#1a242d]/55 px-3 py-3 lg:bg-tuao-dark-950/55">
                <p className="text-[13px] font-black uppercase leading-tight tracking-tight text-white">
                  Apostas ao vivo
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-tuao-text-secondary/90">
                  Jogadores a jogar neste momento
                </p>
              </div>
              <div className="shrink-0 flex items-center justify-between gap-2 bg-tuao-dark-800/95 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-tuao-text-secondary">
                  Usuário
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-tuao-text-secondary">
                  Minas
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-tuao-text-secondary">
                  Quantia
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
                {liveBets.length === 0 ? (
                  <div className="flex min-h-[180px] items-center justify-center px-4 py-8">
                    <p className="text-center text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary/80">
                      Aguardando apostas
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-tuao-dark-800/80">
                    {[...liveBets]
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, MAX_VISIBLE_LIVE_BETS)
                      .map((bet) => {
                        const label = bet.username || bet.name || '—';
                        const seed = bet.id || label;
                        return (
                          <li
                            key={bet.id}
                            className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-tuao-dark-950/40"
                          >
                            <Crown
                              className={cn('h-3.5 w-3.5 shrink-0', crownToneClass(seed))}
                              strokeWidth={2.4}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold text-white">
                              {label}
                            </span>
                            <span className="w-10 shrink-0 text-center text-[12px] font-bold tabular-nums text-tuao-text-secondary">
                              {bet.minesCount}
                            </span>
                            <span className="w-[4.5rem] shrink-0 text-right text-[12px] font-semibold tabular-nums text-white/95">
                              {formatBrlAmount(bet.amount)}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </div>
              {liveBets.length > MAX_VISIBLE_LIVE_BETS && (
                <div className="shrink-0 border-t border-tuao-dark-800 bg-tuao-dark-950/60 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-tuao-text-secondary">
                  +{liveBets.length - MAX_VISIBLE_LIVE_BETS} na fila
                </div>
              )}
            </div>
          ) : lowerTab === 'historico' ? (
            <div className="min-h-[240px] flex-1 p-4 sm:p-6">
              {history.length === 0 ? (
                <div className="flex min-h-[180px] items-center justify-center">
                  <p className="text-center text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary/80">
                    Ainda sem resultados nesta sessão
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-tuao-dark-800/80 rounded-lg border border-tuao-dark-800 bg-tuao-dark-950/40">
                  {history.map((val, idx) => (
                    <li
                      key={`${val}-${idx}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-tuao-dark-950/40"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary">
                        Ronda {history.length - idx}
                      </span>
                      <span
                        className={cn(
                          'text-sm font-bold tabular-nums',
                          val === 0 ? 'text-tuao-text-secondary' : 'text-tuao-primary'
                        )}
                      >
                        {formatMult(val)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="max-w-2xl space-y-4 p-6 text-sm leading-relaxed text-tuao-text-secondary">
              <p>
                No <span className="font-semibold text-white">Mines</span> escolhes quantas minas existem no tabuleiro
                5×5. Cada casa segura revelada aumenta o multiplicador; se clicares numa mina, perdes a aposta desta
                ronda.
              </p>
              <p>
                Podes retirar em qualquer momento durante o jogo para garantir o valor atual. O resultado é
                verificável: consulta a página de{' '}
                <Link to="/fairness" className="font-semibold text-tuao-primary hover:text-tuao-primary-hover">
                  justiça comprovável
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
