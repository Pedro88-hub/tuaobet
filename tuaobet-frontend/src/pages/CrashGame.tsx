import { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal } from '../components/ui/Modal';
import { Link } from 'react-router-dom';
import { useCrashGame } from '../hooks/useCrashGame';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/layout/Layout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { GameCountdownBar, CRASH_COUNTDOWN_SECONDS } from '../components/games/GameCountdownBar';
import { BarChart2, ChevronLeft, ChevronRight, Crown, Info, Maximize2, Wifi } from 'lucide-react';
import { ProvablyFairCrashStrip } from '../components/games/ProvablyFairStrip';
import { CrashFlightChart } from '../components/games/crash/CrashFlightChart';
import { useCrashDisplayMultiplier } from '../components/games/crash/useCrashDisplayMultiplier';
import { levelFromXp, tierForLevel } from '../lib/xpDisplay';

const formatBrlAmount = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatMultiplierPt = (m: number) =>
  `${m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;

const CRASH_HISTORY_MODAL_PAGE_SIZE = 20;

/** Estilo do chip de histórico por faixa de multiplicador (<2 / 2–10 / ≥10). */
function crashHistoryChipClass(val: number): string {
  if (val >= 10) {
    return 'border-amber-400/40 bg-amber-400/15 font-extrabold text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.18)]';
  }
  if (val >= 2) {
    return 'border-transparent bg-blaze-green font-extrabold text-[#0a1620]';
  }
  return 'border-tuao-dark-700 bg-[#1a242d] text-tuao-text-secondary';
}

/** Coroa para outros jogadores (sem XP no payload): tons estáveis por id/nome. */
function crownToneClass(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const r = Math.abs(h) % 3;
  if (r === 0) return 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.25)]';
  if (r === 1) return 'text-tuao-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.35)]';
  return 'text-amber-400/95 drop-shadow-[0_0_6px_rgba(251,191,36,0.25)]';
}

export function CrashGame() {
  const { isAuthenticated, openLoginModal, user } = useAuth();
  const {
    gameState,
    multiplier,
    countdown,
    history,
    players,
    hasServerBet,
    serverCashedOut,
    serverPayout,
    serverBetAmount,
    lastError,
    fairnessCommit,
    fairnessReveal,
    joinGame,
    cancelBet,
    cashout,
  } = useCrashGame();

  const [betAmount, setBetAmount] = useState('');
  const [autoCashout, setAutoCashout] = useState<string>('');
  const [betMode, setBetMode] = useState<'normal' | 'auto'>('normal');
  const [lowerTab, setLowerTab] = useState<'jogadores' | 'descricao'>('jogadores');
  const [roundsHistoryOpen, setRoundsHistoryOpen] = useState(false);
  const [historyModalPage, setHistoryModalPage] = useState(0);

  // Contagem local suave (segundos fracionários) — realinhada ao servidor em cada tick
  const [timeLeft, setTimeLeft] = useState(countdown);

  useEffect(() => {
    setTimeLeft(countdown);
  }, [countdown]);

  useEffect(() => {
    if (gameState !== 'COUNTDOWN') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 0.02));
    }, 20);
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (roundsHistoryOpen) setHistoryModalPage(0);
  }, [roundsHistoryOpen]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(history.length / CRASH_HISTORY_MODAL_PAGE_SIZE) - 1);
    setHistoryModalPage((p) => Math.min(p, maxPage));
  }, [history.length]);

  const totalBets = useMemo(() => {
    return players.reduce((acc, p) => acc + p.bet, 0);
  }, [players]);

  const displayMultiplier = useCrashDisplayMultiplier(multiplier, gameState);

  const handleBetAction = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    const amount = parseFloat(betAmount.trim() || '');
    if (gameState === 'COUNTDOWN' && hasServerBet) {
      cancelBet();
      return;
    }
    if (gameState === 'COUNTDOWN' && !hasServerBet) {
      if (!Number.isFinite(amount) || amount <= 0) return;
      joinGame(amount);
      return;
    }
    if (gameState === 'RUNNING' && hasServerBet && !serverCashedOut) {
      cashout();
    }
  };

  useEffect(() => {
    if (
      gameState === 'RUNNING' &&
      hasServerBet &&
      !serverCashedOut &&
      autoCashout &&
      multiplier >= parseFloat(autoCashout)
    ) {
      cashout();
    }
  }, [gameState, hasServerBet, serverCashedOut, autoCashout, multiplier, cashout]);

  const handleHalve = () =>
    setBetAmount((prev) => {
      const v = parseFloat(prev);
      if (!Number.isFinite(v) || v <= 0) return '';
      return (v / 2).toFixed(2);
    });
  const handleDoubleAmt = () =>
    setBetAmount((prev) => {
      const v = parseFloat(prev);
      if (!Number.isFinite(v)) return '';
      return (v * 2).toFixed(2);
    });

  const toggleFullscreen = useCallback(() => {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      void root.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  const amountDisabled =
    hasServerBet && !serverCashedOut && gameState !== 'CRASHED';

  return (
    <Layout>
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-0 p-0 text-white lg:p-4 lg:pb-8">
        <div className="flex min-w-0 max-lg:h-[calc(100dvh-11rem)] max-lg:min-h-0 flex-col-reverse gap-0 overflow-hidden rounded-xl border border-tuao-dark-800 bg-blaze-panel shadow-card lg:h-auto lg:flex-row lg:bg-tuao-dark-900">
          {/* Painel de apostas — em mobile fica abaixo do gráfico (estilo app) */}
          <div className="flex min-h-0 w-full shrink-0 flex-col border-t border-tuao-dark-800 bg-blaze-panel lg:w-[300px] lg:border-b-0 lg:border-r lg:border-t-0 lg:bg-tuao-dark-900">
            <div className="shrink-0 px-3 pb-1.5 pt-2 sm:px-4 sm:pb-2 sm:pt-3">
              <div className="flex rounded-lg border border-tuao-dark-800 bg-[#1a242d] p-1 lg:bg-tuao-dark-950">
                <button
                  type="button"
                  onClick={() => setBetMode('normal')}
                  className={cn(
                    'flex-1 rounded-md py-2 text-sm font-bold transition-colors sm:py-2.5',
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
                    'flex-1 rounded-md py-2 text-sm font-bold transition-colors sm:py-2.5',
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
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-2 sm:space-y-4 sm:px-4 sm:pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
                <div className="flex gap-2">
                  <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-tuao-dark-700 bg-tuao-dark-950 px-3 transition-colors focus-within:border-tuao-primary focus-within:ring-1 focus-within:ring-tuao-primary sm:h-12">
                    <span className="shrink-0 text-sm font-semibold text-white">Quantia</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      disabled={amountDisabled}
                      className="min-w-0 flex-1 bg-transparent text-right text-base font-bold text-white outline-none placeholder:text-tuao-text-secondary/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50"
                    />
                    <span className="shrink-0 text-sm font-semibold text-white">R$</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleHalve}
                    disabled={amountDisabled}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-800 text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700 disabled:opacity-50 sm:h-12 sm:w-12"
                    aria-label="Metade do valor"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    onClick={handleDoubleAmt}
                    disabled={amountDisabled}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-800 text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700 disabled:opacity-50 sm:h-12 sm:w-12"
                    aria-label="Dobrar o valor"
                  >
                    2x
                  </button>
                </div>

                <div className="flex w-full items-stretch gap-2">
                    <div className="min-w-0 flex-1">
                      <Input
                        value={autoCashout}
                        onChange={(e) => setAutoCashout(e.target.value)}
                        placeholder="Auto retirar (multiplicador)"
                        aria-label="Auto retirar (multiplicador)"
                        className="h-11 w-full border-tuao-dark-700 bg-[#1a242d] text-base font-bold placeholder:text-xs placeholder:font-semibold focus:border-tuao-primary sm:h-12 sm:placeholder:text-sm lg:bg-tuao-dark-950"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoCashout('')}
                      className="shrink-0 rounded-lg border border-tuao-dark-700 bg-[#1a242d] px-3 text-xs font-bold uppercase tracking-wide text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white lg:bg-tuao-dark-950"
                      aria-label="Limpar auto retirar"
                    >
                      Limpar
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    size="lg"
                    className={cn(
                      'h-11 w-full text-sm font-black uppercase tracking-wider sm:h-12',
                      gameState === 'RUNNING' && hasServerBet && !serverCashedOut
                        ? 'border border-emerald-500/35 bg-emerald-600 text-white hover:bg-emerald-500'
                        : hasServerBet && gameState === 'COUNTDOWN'
                          ? 'border border-red-500/40 bg-red-500/90 text-white hover:bg-red-600'
                          : 'border border-tuao-primary/30 bg-tuao-primary text-tuao-dark-950 shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:bg-tuao-primary-hover'
                    )}
                    onClick={handleBetAction}
                    disabled={
                      gameState === 'CRASHED' ||
                      gameState === 'IDLE' ||
                      (hasServerBet && serverCashedOut)
                    }
                  >
                    {gameState === 'COUNTDOWN' ? (
                      hasServerBet ? (
                        <span className="flex flex-col items-center leading-tight">
                          <span>Cancelar</span>
                          <span className="text-[11px] font-bold tabular-nums opacity-90">
                            R${' '}
                            {(
                              serverBetAmount > 0
                                ? serverBetAmount
                                : Number.isFinite(parseFloat(betAmount))
                                  ? parseFloat(betAmount)
                                  : 0
                            ).toFixed(2)}
                          </span>
                        </span>
                      ) : (
                        'Apostar'
                      )
                    ) : gameState === 'RUNNING' && hasServerBet && !serverCashedOut ? (
                      <span className="flex flex-col items-center leading-tight">
                        <span>Sacar</span>
                        <span className="text-[11px] font-bold tabular-nums opacity-90">
                          R${' '}
                          {(
                            (Number.isFinite(parseFloat(betAmount)) ? parseFloat(betAmount) : 0) * multiplier
                          ).toFixed(2)}
                        </span>
                      </span>
                    ) : gameState === 'RUNNING' ? (
                      'Esperando…'
                    ) : gameState === 'IDLE' ? (
                      'Esperando…'
                    ) : (
                      'Rodada encerrada'
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-0.5 sm:px-4 sm:pb-3 sm:pt-1">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-950 text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white"
                  aria-label="Ecrã inteiro"
                >
                  <Maximize2 className="h-4 w-4" strokeWidth={2.2} />
                </button>
                <Link
                  to="/fairness"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-950 text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white"
                  aria-label="Informação e justiça"
                >
                  <Info className="h-4 w-4" strokeWidth={2.2} />
                </Link>
              </div>
            </div>

            {lastError && (
              <div className="mt-auto border-t border-tuao-dark-800 bg-tuao-dark-950/30 p-3">
                <p className="text-center text-xs text-red-400">{lastError}</p>
              </div>
            )}
          </div>

          {/* Visualizador — histórico no topo no mobile (referência Blaze) */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-blaze-panel lg:min-h-[640px] lg:bg-tuao-dark-900">
            <div className="min-w-0 shrink-0 border-b border-tuao-dark-800 bg-blaze-panel px-3 py-2 lg:bg-tuao-dark-950/50 lg:py-2.5">
              <div className="flex min-h-8 min-w-0 items-center gap-1.5">
                <div
                  dir="rtl"
                  className="min-h-8 min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {history.length === 0 ? (
                    <span dir="ltr" className="inline-flex h-8 items-center text-xs text-tuao-dark-700">
                      Ainda sem histórico nesta sessão.
                    </span>
                  ) : (
                    /* RTL: começa à direita (junto ao botão); mais recente → esquerda com os mais antigos */
                    <div className="inline-flex h-8 w-max max-w-none items-center gap-2">
                      {history.map((val, i) => (
                        <div
                          key={i}
                          dir="ltr"
                          className={cn(
                            'flex h-8 min-w-[52px] shrink-0 items-center justify-center rounded-md border px-2.5 text-center font-mono text-xs font-bold tabular-nums transition-opacity hover:opacity-80',
                            crashHistoryChipClass(val)
                          )}
                        >
                          {formatMultiplierPt(val)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setRoundsHistoryOpen(true)}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 text-tuao-text-secondary transition-colors',
                    'bg-blaze-panel hover:border-tuao-primary/40 hover:text-tuao-primary lg:bg-[#0c1218]'
                  )}
                  title="Ver histórico de rondas"
                  aria-label="Ver histórico de rondas"
                >
                  <BarChart2 className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-2 pt-2 max-lg:min-h-[140px] lg:min-h-[420px]">
              <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 transition-opacity duration-1000',
                  'bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.12),transparent_65%)] opacity-10'
                )}
              />

              {gameState === 'COUNTDOWN' && (
                <div className="pointer-events-none absolute inset-0 z-[30] flex items-center justify-center px-4">
                  <div className="w-full max-w-xs shadow-[0_0_20px_rgba(0,240,255,0.08)] sm:max-w-sm">
                    <GameCountdownBar
                      progress={
                        CRASH_COUNTDOWN_SECONDS > 0
                          ? Math.min(1, Math.max(0, timeLeft) / CRASH_COUNTDOWN_SECONDS)
                          : 0
                      }
                      className="h-6 min-h-6 w-full rounded-md"
                      labelClassName="text-xs"
                    >
                      {timeLeft > 0 ? `Começando em ${timeLeft.toFixed(2)}s` : 'A iniciar…'}
                    </GameCountdownBar>
                  </div>
                </div>
              )}

              <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex w-full max-w-[11rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center px-2 text-center sm:max-w-[13rem]">
                {gameState !== 'COUNTDOWN' && gameState === 'CRASHED' && (
                  <div className="rounded-md bg-gradient-to-br from-red-600 to-rose-800 px-4 py-2 shadow-[0_8px_24px_rgba(220,38,38,0.4)] ring-1 ring-red-500/30 sm:px-5 sm:py-2.5">
                    <div className="text-2xl font-black tabular-nums tracking-tight text-white sm:text-3xl">
                      {multiplier.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}X
                    </div>
                    <div className="mt-0.5 text-center text-[9px] font-black uppercase tracking-[0.22em] text-white/90">
                      CRASHED
                    </div>
                    {serverCashedOut && (
                      <div className="mt-2 border-t border-white/25 pt-2 text-center animate-in fade-in duration-300">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-200">
                          Ganhaste
                        </span>
                        <span className="mt-0.5 block text-sm font-bold tabular-nums text-white sm:text-base">
                          R$ {serverPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {gameState !== 'COUNTDOWN' && gameState !== 'CRASHED' && (
                  <div className="flex flex-col items-center rounded-md border border-tuao-dark-700 bg-tuao-dark-800/90 px-3 py-1.5 shadow-inner transition-all duration-75 sm:px-4 sm:py-2">
                    <div
                      className={cn(
                        'font-mono text-3xl font-black tabular-nums tracking-tighter sm:text-4xl',
                        gameState === 'RUNNING' ? 'text-white' : 'text-tuao-text-secondary'
                      )}
                    >
                      {`${(gameState === 'RUNNING' ? displayMultiplier : multiplier).toFixed(2)}x`}
                    </div>
                    {serverCashedOut && (
                      <div className="mt-1.5 w-full border-t border-white/10 pt-1.5 text-center animate-in fade-in duration-300">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                          Ganhaste
                        </span>
                        <span className="mt-0.5 block text-sm font-bold tabular-nums text-emerald-300 sm:text-base">
                          R$ {serverPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {(gameState === 'RUNNING' || gameState === 'CRASHED') && (
                <CrashFlightChart
                  multiplier={gameState === 'RUNNING' ? displayMultiplier : multiplier}
                />
              )}

              <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-tuao-text-secondary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blaze-green opacity-50" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-blaze-green shadow-[0_0_8px_rgba(0,230,118,0.75)]" />
                </span>
                <Wifi className="h-3 w-3 text-blaze-green" strokeWidth={2.5} />
                <span className="text-blaze-green">Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secção inferior — mesmo padrão Double / Mines */}
        <div className="mt-3 flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-tuao-dark-800 bg-blaze-panel shadow-card sm:mt-4 lg:bg-tuao-dark-900">
          <div className="flex border-b border-tuao-dark-800 bg-[#121920] lg:bg-tuao-dark-950/40">
            <button
              type="button"
              onClick={() => setLowerTab('jogadores')}
              className={cn(
                'relative flex-1 px-2 py-3 text-[10px] font-bold uppercase leading-tight tracking-[0.1em] transition-colors sm:flex-none sm:px-6 sm:text-xs sm:tracking-[0.14em]',
                lowerTab === 'jogadores' ? 'text-white' : 'text-tuao-text-secondary hover:text-white'
              )}
            >
              Apostas
              {lowerTab === 'jogadores' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-tuao-primary shadow-[0_0_10px_rgba(0,240,255,0.5)] sm:left-4 sm:right-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setLowerTab('descricao')}
              className={cn(
                'relative flex-1 px-2 py-3 text-[10px] font-bold uppercase leading-tight tracking-[0.1em] transition-colors sm:flex-none sm:px-6 sm:text-xs sm:tracking-[0.14em]',
                lowerTab === 'descricao' ? 'text-white' : 'text-tuao-text-secondary hover:text-white'
              )}
            >
              <span className="hidden min-[400px]:inline">Descrição do jogo</span>
              <span className="min-[400px]:hidden">Descrição</span>
              {lowerTab === 'descricao' && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-tuao-primary shadow-[0_0_10px_rgba(0,240,255,0.5)] sm:left-4 sm:right-4" />
              )}
            </button>
          </div>

          {lowerTab === 'jogadores' ? (
            <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden bg-tuao-dark-900">
              <div className="shrink-0 border-b border-tuao-dark-800 bg-tuao-dark-800/80 px-3 py-2.5 sm:px-4">
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <p className="text-[11px] font-medium leading-snug text-tuao-text-secondary sm:text-xs">
                    {players.length === 0
                      ? 'Ainda sem apostas nesta ronda'
                      : players.length === 1
                        ? '1 jogador fez a sua aposta'
                        : `${players.length} jogadores fizeram as suas apostas`}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-white sm:shrink-0">
                    R$ {formatBrlAmount(totalBets)}
                  </p>
                </div>
              </div>
              <div className="shrink-0 grid grid-cols-[minmax(0,1fr)_5.25rem_4rem_4.5rem] items-center gap-1.5 border-b border-tuao-dark-800 bg-tuao-dark-800/95 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_6rem_4.5rem_5.25rem] sm:gap-2 sm:px-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-tuao-text-secondary sm:text-[10px]">
                  Usuário
                </span>
                <span className="text-center text-[9px] font-bold uppercase tracking-[0.14em] text-tuao-text-secondary sm:text-[10px]">
                  Aposta
                </span>
                <span className="text-center text-[9px] font-bold uppercase tracking-[0.14em] text-tuao-text-secondary sm:text-[10px]">
                  Alvo
                </span>
                <span className="text-right text-[9px] font-bold uppercase tracking-[0.14em] text-tuao-text-secondary sm:text-[10px]">
                  Lucro
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
                {players.length === 0 ? (
                  <div className="flex min-h-[140px] items-center justify-center px-4 py-8">
                    <p className="text-center text-[11px] font-semibold text-tuao-text-secondary/80">
                      Aguardando apostas…
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-tuao-dark-800/90">
                    {players.map((player) => {
                      const won = player.cashout != null && !player.busted;
                      const retornoBrl =
                        player.payout ??
                        (player.cashout != null ? player.bet * player.cashout : 0);
                      const lucroLiquido =
                        won && retornoBrl > 0
                          ? Math.round((retornoBrl - player.bet) * 100) / 100
                          : 0;
                      const isViewerRow = user?.id === player.id;
                      const crownClass = isViewerRow
                        ? `${tierForLevel(levelFromXp(user?.xp ?? 0)).crownClass} drop-shadow-[0_0_8px_rgba(255,255,255,0.12)]`
                        : crownToneClass(player.id || player.name);
                      return (
                        <li
                          key={player.id}
                          className={cn(
                            'grid grid-cols-[minmax(0,1fr)_5.25rem_4rem_4.5rem] items-center gap-1.5 px-3 py-2 text-[11px] transition-colors sm:grid-cols-[minmax(0,1fr)_6rem_4.5rem_5.25rem] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs',
                            'hover:bg-tuao-dark-950/35',
                            isViewerRow &&
                              !won &&
                              !player.busted &&
                              'bg-tuao-dark-800/50 ring-1 ring-inset ring-tuao-primary/25'
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Crown className={cn('h-3.5 w-3.5 shrink-0', crownClass)} strokeWidth={2.4} aria-hidden />
                            <span className="truncate font-semibold text-white/95">
                              {user?.id === player.id ? 'Tu' : player.name}
                            </span>
                          </span>
                          <span className="text-center font-semibold tabular-nums text-white/90">
                            R$ {formatBrlAmount(player.bet)}
                          </span>
                          <span
                            className={cn(
                              'text-center font-semibold tabular-nums',
                              won ? 'text-white' : 'text-tuao-text-secondary/70'
                            )}
                          >
                            {won ? formatMultiplierPt(player.cashout!) : '–'}
                          </span>
                          <span
                            className={cn(
                              'text-right font-semibold tabular-nums',
                              won ? 'text-green-400' : 'text-red-500'
                            )}
                          >
                            {won ? `R$ ${formatBrlAmount(lucroLiquido)}` : '–'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl space-y-4 p-6 text-sm leading-relaxed text-tuao-text-secondary">
              <p>
                No <span className="font-semibold text-white">Crash</span> apostas antes do avião subir. Retira antes
                do multiplicador estourar para ganhares; se cair antes, perdes a aposta desta ronda.
              </p>
              <p>
                Podes definir <span className="font-semibold text-white">auto retirar</span> para sair ao atingir um
                multiplicador. O resultado é verificável: consulta a página de{' '}
                <Link to="/fairness" className="font-semibold text-tuao-primary hover:text-tuao-primary-hover">
                  justiça comprovável
                </Link>
                .
              </p>
              <ProvablyFairCrashStrip commit={fairnessCommit} reveal={fairnessReveal} />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={roundsHistoryOpen}
        onClose={() => setRoundsHistoryOpen(false)}
        title="Histórico de rondas"
        subtitle="Multiplicadores das últimas rondas (mais recentes primeiro). 20 por página."
        size="wide"
        headerIcon={<BarChart2 className="h-5 w-5" strokeWidth={2.2} />}
      >
        {history.length === 0 ? (
          <p className="text-center text-sm text-tuao-text-secondary">Ainda sem rondas registadas.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-tuao-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-tuao-dark-700 bg-[#1a242d]" aria-hidden />
                &lt; 2×
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-blaze-green" aria-hidden />
                2× – 10×
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-amber-400/40 bg-amber-400/15" aria-hidden />
                ≥ 10×
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 [scrollbar-width:thin]">
              {history
                .slice(
                  historyModalPage * CRASH_HISTORY_MODAL_PAGE_SIZE,
                  historyModalPage * CRASH_HISTORY_MODAL_PAGE_SIZE + CRASH_HISTORY_MODAL_PAGE_SIZE
                )
                .map((val, i) => (
                  <div
                    key={`round-${historyModalPage}-${i}`}
                    className={cn(
                      'flex h-10 items-center justify-center rounded-lg border px-1.5 text-center font-mono text-sm tabular-nums',
                      crashHistoryChipClass(val)
                    )}
                    title={`Ronda ${historyModalPage * CRASH_HISTORY_MODAL_PAGE_SIZE + i + 1}`}
                  >
                    {formatMultiplierPt(val)}
                  </div>
                ))}
            </div>
            {history.length > CRASH_HISTORY_MODAL_PAGE_SIZE && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-tuao-dark-800 pt-4">
                <button
                  type="button"
                  disabled={historyModalPage <= 0}
                  onClick={() => setHistoryModalPage((p) => Math.max(0, p - 1))}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border border-tuao-dark-700 bg-tuao-dark-800 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors',
                    'hover:border-tuao-primary/40 hover:text-tuao-primary disabled:pointer-events-none disabled:opacity-40'
                  )}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
                  Anterior
                </button>
                <span className="text-center text-xs font-semibold text-tuao-text-secondary">
                  Página {historyModalPage + 1} de {Math.ceil(history.length / CRASH_HISTORY_MODAL_PAGE_SIZE)}
                </span>
                <button
                  type="button"
                  disabled={
                    historyModalPage >= Math.ceil(history.length / CRASH_HISTORY_MODAL_PAGE_SIZE) - 1
                  }
                  onClick={() =>
                    setHistoryModalPage((p) =>
                      Math.min(Math.ceil(history.length / CRASH_HISTORY_MODAL_PAGE_SIZE) - 1, p + 1)
                    )
                  }
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border border-tuao-dark-700 bg-tuao-dark-800 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors',
                    'hover:border-tuao-primary/40 hover:text-tuao-primary disabled:pointer-events-none disabled:opacity-40'
                  )}
                >
                  Seguinte
                  <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
            )}
          </>
        )}
      </Modal>
    </Layout>
  );
}
