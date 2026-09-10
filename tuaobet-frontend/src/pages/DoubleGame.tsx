import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDoubleGame, DoubleColor, DoublePlayer } from '../hooks/useDoubleGame';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/layout/Layout';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/utils';
import { BarChart2, ChevronLeft, ChevronRight, Crown, Info, Maximize2, Volume2, VolumeX, Wifi } from 'lucide-react';
import { GameCountdownBar, DOUBLE_COUNTDOWN_SECONDS } from '../components/games/GameCountdownBar';
import { DoubleRouletteTile } from '../components/games/DoubleRouletteTile';
import { DoubleColorBetCard } from '../components/games/DoubleColorBetCard';
import { ProvablyFairDoubleStrip } from '../components/games/ProvablyFairStrip';
import tuaoLogo from '../assets/tuao-logo.png';
import {
  isCrashSoundMuted,
  onCrashSoundMuteChange,
  toggleCrashSoundMuted,
} from '../lib/crashSounds';
import {
  formatCentsMask,
  maskDigitsFromNumber,
  numberFromMaskDigits,
  sanitizeMaskDigits,
} from '../lib/brlMask';

// Configuração da ordem da roleta (padrão Double)
// 0 = Branco, 1-7 = Vermelho, 8-14 = Preto
const ROULETTE_ORDER = [1, 14, 2, 13, 3, 12, 4, 0, 11, 5, 10, 6, 9, 7, 8];
const TILE_SIZE = 80; // Largura de cada quadrado em px

const MAX_VISIBLE_BETS_PER_COLUMN = 7;
const DOUBLE_HISTORY_MODAL_PAGE_SIZE = 20;

const formatBrl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

export function DoubleGame() {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const {
    gameState,
    countdown,
    result,
    history,
    bets,
    hasServerBet,
    queuedNextBet,
    serverBetAmount,
    serverBetColor,
    placeBet,
    cancelBet,
    lastError,
    fairnessCommit,
    fairnessReveal,
  } = useDoubleGame();

  /** Só dígitos; valor real = digits/100 (máscara RTL pt-BR). */
  const [betAmountDigits, setBetAmountDigits] = useState('');
  const [selectedColor, setSelectedColor] = useState<DoubleColor | null>(null);
  const [lowerTab, setLowerTab] = useState<'apostas' | 'descricao'>('apostas');
  const [roundsHistoryOpen, setRoundsHistoryOpen] = useState(false);
  const [historyModalPage, setHistoryModalPage] = useState(0);
  const [soundMuted, setSoundMuted] = useState(() => isCrashSoundMuted());

  const betAmountDisplay = formatCentsMask(betAmountDigits);
  const betAmountValue = numberFromMaskDigits(betAmountDigits);
  const amountValid = Number.isFinite(betAmountValue) && betAmountValue > 0;

  const sumMyBets = (color: DoubleColor) =>
    bets
      .filter((b) => (b.username || b.name) === user?.username && b.color === color)
      .reduce((acc, b) => acc + b.amount, 0);

  /** Aposta da rodada atual (servidor); não usar lista visual — ela permanece no RESULT. */
  const hasActiveBet = hasServerBet;

  const amountDisabled = hasActiveBet || queuedNextBet;

  const canBetNextRound =
    !hasServerBet &&
    !queuedNextBet &&
    (gameState === 'SPINNING' || gameState === 'RESULT');

  // Contagem local suave (segundos fracionários) — realinhada ao servidor em cada tick
  const [timeLeft, setTimeLeft] = useState(countdown);

  useEffect(() => {
    return onCrashSoundMuteChange(setSoundMuted);
  }, []);

  useEffect(() => {
    setTimeLeft(countdown);
  }, [countdown]);

  useEffect(() => {
    if (gameState !== 'WAITING') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 0.02));
    }, 20);
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (roundsHistoryOpen) setHistoryModalPage(0);
  }, [roundsHistoryOpen]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(history.length / DOUBLE_HISTORY_MODAL_PAGE_SIZE) - 1);
    setHistoryModalPage((p) => Math.min(p, maxPage));
  }, [history.length]);

  // Nova ronda WAITING sem aposta: limpar seleção prévia
  useEffect(() => {
    if (gameState === 'WAITING' && !hasActiveBet && !queuedNextBet) {
      setSelectedColor(null);
    }
  }, [gameState, hasActiveBet, queuedNextBet]);

  // Após aposta confirmada, manter a cor apostada selecionada
  useEffect(() => {
    if (serverBetColor) {
      setSelectedColor(serverBetColor);
      return;
    }
    if (!hasActiveBet || !user?.username) return;
    if (sumMyBets('red') > 0) setSelectedColor('red');
    else if (sumMyBets('white') > 0) setSelectedColor('white');
    else if (sumMyBets('black') > 0) setSelectedColor('black');
    // sumMyBets is stable per render; intentional deps on bets/user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveBet, bets, user?.username, serverBetColor]);

  // Referência para o container da roleta (para animação CSS)
  const rouletteRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  const onSelectColor = (color: DoubleColor) => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (hasActiveBet || queuedNextBet) return;
    if (gameState !== 'WAITING' && !canBetNextRound) return;
    setSelectedColor(color);
  };

  const handleBetAction = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (queuedNextBet) {
      cancelBet();
      return;
    }
    if (gameState === 'WAITING' && hasActiveBet) {
      cancelBet();
      return;
    }
    if (gameState === 'WAITING' && !hasActiveBet) {
      if (!selectedColor || !amountValid) return;
      placeBet(betAmountValue, selectedColor, gameState);
      return;
    }
    if (canBetNextRound) {
      if (!selectedColor || !amountValid) return;
      placeBet(betAmountValue, selectedColor, gameState);
    }
  };

  type CtaMode = 'apostar' | 'cancelar' | 'cancelar_proxima' | 'apostado' | 'esperando' | 'apostar_proxima';
  const ctaMode: CtaMode = queuedNextBet
    ? 'cancelar_proxima'
    : gameState === 'WAITING'
      ? hasActiveBet
        ? 'cancelar'
        : 'apostar'
      : hasActiveBet
        ? 'apostado'
        : canBetNextRound
          ? 'apostar_proxima'
          : 'esperando';

  const ctaDisabled =
    ctaMode === 'apostado' ||
    ctaMode === 'esperando' ||
    ((ctaMode === 'apostar' || ctaMode === 'apostar_proxima') && (!selectedColor || !amountValid));

  const stakeDisplay =
    serverBetAmount > 0
      ? serverBetAmount
      : Number.isFinite(betAmountValue)
        ? betAmountValue
        : 0;

  // Calcular posição final da roleta
  useEffect(() => {
    if (!rouletteRef.current) return;

    const whiteIndex = ROULETTE_ORDER.indexOf(0);
    // Posição inicial (Branco no primeiro loop)
    const startPosition = whiteIndex * TILE_SIZE + TILE_SIZE / 2;

    if (gameState === 'SPINNING' && result) {
      // 1. Movimento fluido e desaceleração
      // Calcular offset aleatório para simular parada na borda (ponta)
      // Tile = 80px. Offset entre -35px e +35px para ficar na borda mas ainda dentro do tile
      const newOffset = (Math.random() - 0.5) * 70;
      offsetRef.current = newOffset;

      const targetIndexInPattern = ROULETTE_ORDER.indexOf(result.number);

      // Vamos mirar em um bloco lá na frente (ex: volta 4)
      const loops = 4;
      const totalIndex = ROULETTE_ORDER.length * loops + targetIndexInPattern;

      // Posição final com o offset (parada imperfeita)
      const finalPosition = totalIndex * TILE_SIZE + TILE_SIZE / 2 + newOffset;

      // Easing personalizado para desaceleração progressiva realista
      // Ajustado para 3.8s para garantir que pare antes do estado RESULT (4s)
      rouletteRef.current.style.transition = 'transform 3.8s cubic-bezier(0.1, 0.05, 0.1, 1)';
      rouletteRef.current.style.transform = `translateX(-${finalPosition}px)`;
    } else if (gameState === 'RESULT' && result) {
      // 2. Parada e correção de alinhamento
      // Quando entra em RESULT, faz o ajuste fino para o centro
      const targetIndexInPattern = ROULETTE_ORDER.indexOf(result.number);
      const loops = 4;
      const totalIndex = ROULETTE_ORDER.length * loops + targetIndexInPattern;

      // Posição exata no centro (sem offset)
      const centerPosition = totalIndex * TILE_SIZE + TILE_SIZE / 2;

      // Delay para garantir percepção de parada
      const timer = setTimeout(() => {
        if (rouletteRef.current) {
          // Movimento técnico e suave para centralizar
          rouletteRef.current.style.transition = 'transform 0.4s ease-out';
          rouletteRef.current.style.transform = `translateX(-${centerPosition}px)`;
        }
      }, 200);

      return () => clearTimeout(timer);
    } else if (gameState === 'WAITING') {
      // 3. Retorno e reinício
      // Retorna suavemente para a posição inicial (Branco)
      rouletteRef.current.style.transition = 'transform 1.5s ease-in-out';
      rouletteRef.current.style.transform = `translateX(-${startPosition}px)`;
    }
  }, [gameState, result]);

  // Faixa da roleta — mesmos quadrados que Giros anteriores / cartões de apostas
  const renderRouletteStrip = () => {
    const strip: number[] = [];
    for (let i = 0; i < 6; i++) {
      strip.push(...ROULETTE_ORDER);
    }
    return strip.map((num, idx) => (
      <DoubleRouletteTile
        key={idx}
        number={num}
        variant="strip"
        style={{
          width: `${TILE_SIZE - 4}px`,
          height: `${TILE_SIZE - 4}px`,
          margin: '0 2px',
        }}
      />
    ));
  };

  const handleHalve = () => {
    if (!Number.isFinite(betAmountValue) || betAmountValue <= 0) {
      setBetAmountDigits('');
      return;
    }
    setBetAmountDigits(maskDigitsFromNumber(betAmountValue / 2));
  };
  const handleDoubleAmt = () => {
    if (!Number.isFinite(betAmountValue) || betAmountValue <= 0) return;
    setBetAmountDigits(maskDigitsFromNumber(betAmountValue * 2));
  };

  const toggleFullscreen = useCallback(() => {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      void root.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  const colorCardsDisabled = hasActiveBet || queuedNextBet;

  return (
    <Layout>
      <div className="mx-auto flex max-w-6xl flex-col gap-0 p-2 pb-8 text-white sm:p-4">
        {/* Mobile: roleta/histórico em cima, apostas em baixo — mesmo padrão do Crash */}
        <div className="flex min-w-0 max-lg:h-[calc(100dvh-11rem)] max-lg:min-h-0 flex-col-reverse gap-0 overflow-hidden rounded-xl border border-tuao-dark-800 bg-blaze-panel shadow-card lg:h-auto lg:flex-row lg:bg-tuao-dark-900">
          {/* Painel de apostas */}
          <div className="flex min-h-0 w-full shrink-0 flex-col border-t border-tuao-dark-800 bg-blaze-panel lg:w-[300px] lg:border-b-0 lg:border-r lg:border-t-0 lg:bg-tuao-dark-900">
            <div className="shrink-0 px-3 pb-1.5 pt-2 sm:px-4 sm:pb-2 sm:pt-3">
              <div className="flex rounded-lg border border-tuao-dark-800 bg-[#1a242d] p-1 lg:bg-tuao-dark-950">
                <button
                  type="button"
                  className="flex-1 rounded-md bg-[#2a3540] py-2 text-sm font-bold text-white shadow-sm sm:py-2.5 lg:bg-tuao-dark-800"
                >
                  Normal
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-md py-2 text-sm font-bold text-tuao-text-secondary transition-colors hover:text-white sm:py-2.5"
                >
                  Auto
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-2 sm:space-y-4 sm:px-4 sm:pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
                <div className="flex gap-2">
                  <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-tuao-dark-700 bg-[#1a242d] px-3 transition-colors focus-within:border-tuao-primary focus-within:ring-1 focus-within:ring-tuao-primary sm:h-12 lg:bg-tuao-dark-950">
                    {!betAmountDigits && (
                      <span className="shrink-0 text-sm font-semibold text-white">Valor</span>
                    )}
                    <input
                      type="text"
                      inputMode="numeric"
                      value={betAmountDisplay}
                      onChange={(e) => setBetAmountDigits(sanitizeMaskDigits(e.target.value))}
                      disabled={amountDisabled}
                      aria-label="Valor"
                      placeholder="0,00"
                      className="min-w-0 flex-1 bg-transparent text-right text-base font-bold tabular-nums text-white outline-none placeholder:text-tuao-text-secondary/60 disabled:opacity-50"
                    />
                    <span className="shrink-0 text-sm font-semibold text-white">R$</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleHalve}
                    disabled={amountDisabled}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700 disabled:opacity-50 sm:h-12 sm:w-12 lg:bg-tuao-dark-800"
                    aria-label="Metade do valor"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    onClick={handleDoubleAmt}
                    disabled={amountDisabled}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700 disabled:opacity-50 sm:h-12 sm:w-12 lg:bg-tuao-dark-800"
                    aria-label="Dobrar o valor"
                  >
                    2x
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="text-sm font-semibold capitalize text-white">Selecionar Cor</div>
                  <div className="flex flex-col gap-[10px]">
                    <div className="flex gap-2">
                      <DoubleColorBetCard
                        color="red"
                        multiplier="x2"
                        disabled={colorCardsDisabled}
                        selected={selectedColor === 'red'}
                        highlighted={sumMyBets('red') > 0 || (serverBetColor === 'red' && (hasActiveBet || queuedNextBet))}
                        onClick={() => onSelectColor('red')}
                      />
                      <DoubleColorBetCard
                        color="white"
                        multiplier="x14"
                        disabled={colorCardsDisabled}
                        selected={selectedColor === 'white'}
                        highlighted={sumMyBets('white') > 0 || (serverBetColor === 'white' && (hasActiveBet || queuedNextBet))}
                        onClick={() => onSelectColor('white')}
                      />
                      <DoubleColorBetCard
                        color="black"
                        multiplier="x2"
                        disabled={colorCardsDisabled}
                        selected={selectedColor === 'black'}
                        highlighted={sumMyBets('black') > 0 || (serverBetColor === 'black' && (hasActiveBet || queuedNextBet))}
                        onClick={() => onSelectColor('black')}
                      />
                    </div>
                    <button
                      type="button"
                      data-double-bet-anchor
                      onClick={handleBetAction}
                      disabled={ctaDisabled}
                      aria-live="polite"
                      className={cn(
                        'w-full rounded-lg border py-3.5 text-center text-sm font-bold transition-colors',
                        (ctaMode === 'apostar' || ctaMode === 'apostar_proxima') &&
                          !ctaDisabled &&
                          'border-tuao-primary/40 bg-tuao-primary text-tuao-dark-950 shadow-[0_0_18px_rgba(0,240,255,0.2)] hover:bg-tuao-primary-hover',
                        (ctaMode === 'apostar' || ctaMode === 'apostar_proxima') &&
                          ctaDisabled &&
                          'cursor-not-allowed border-tuao-dark-700 bg-tuao-dark-800 text-tuao-text-secondary',
                        (ctaMode === 'cancelar' || ctaMode === 'cancelar_proxima') &&
                          'border-red-500/40 bg-red-500/15 text-red-300 hover:bg-red-500/25',
                        ctaMode === 'apostado' &&
                          'cursor-default border-emerald-500/30 bg-emerald-500/10 text-emerald-300/90',
                        ctaMode === 'esperando' &&
                          'cursor-default border-tuao-primary/25 bg-tuao-dark-950 text-tuao-primary/85 shadow-[0_0_18px_rgba(0,240,255,0.08)]'
                      )}
                    >
                      {ctaMode === 'cancelar_proxima' ? (
                        <span className="flex flex-col items-center leading-tight">
                          <span>Cancelar próxima</span>
                          <span className="text-[11px] font-bold tabular-nums opacity-90">
                            R$ {stakeDisplay.toFixed(2)}
                          </span>
                        </span>
                      ) : ctaMode === 'cancelar' ? (
                        <span className="flex flex-col items-center leading-tight">
                          <span>Cancelar</span>
                          <span className="text-[11px] font-bold tabular-nums opacity-90">
                            R$ {stakeDisplay.toFixed(2)}
                          </span>
                        </span>
                      ) : ctaMode === 'apostado' ? (
                        'Apostado'
                      ) : ctaMode === 'esperando' ? (
                        'Esperando'
                      ) : ctaMode === 'apostar_proxima' ? (
                        'Apostar (próxima)'
                      ) : (
                        'Apostar'
                      )}
                    </button>
                  </div>
                  <p className="text-center text-[10px] leading-snug text-tuao-text-secondary">
                    {ctaMode === 'cancelar'
                      ? 'Você pode cancelar e recuperar o saldo enquanto a rodada está aberta.'
                      : ctaMode === 'cancelar_proxima'
                        ? 'Aposta enfileirada para a próxima rodada. Cancele para reaver o saldo.'
                        : ctaMode === 'apostado'
                          ? 'Aposta bloqueada — a rodada já começou.'
                          : ctaMode === 'apostar_proxima'
                            ? 'Aposte agora para a próxima rodada (débito imediato).'
                            : 'Selecione a cor e confirma com Apostar.'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between px-3 pb-2 pt-0.5 sm:px-4 sm:pb-3 sm:pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white lg:bg-tuao-dark-950"
                    aria-label="Tela cheia"
                  >
                    <Maximize2 className="h-4 w-4" strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCrashSoundMuted()}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border bg-[#1a242d] transition-colors lg:bg-tuao-dark-950',
                      soundMuted
                        ? 'border-red-500/40 text-red-400 hover:border-red-500/60 hover:text-red-300'
                        : 'border-tuao-dark-700 text-tuao-text-secondary hover:border-tuao-dark-600 hover:text-white'
                    )}
                    aria-label={soundMuted ? 'Ativar som' : 'Silenciar som'}
                    aria-pressed={soundMuted}
                  >
                    {soundMuted ? (
                      <VolumeX className="h-4 w-4" strokeWidth={2.2} />
                    ) : (
                      <Volume2 className="h-4 w-4" strokeWidth={2.2} />
                    )}
                  </button>
                </div>
                <Link
                  to="/fairness"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white lg:bg-tuao-dark-950"
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

          {/* Visualizador: histórico no topo (mobile, como Crash) → countdown → roleta */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-blaze-panel lg:min-h-[480px] lg:bg-tuao-dark-900">
            {/* Histórico — mesma linha que o Crash */}
            <div className="min-w-0 shrink-0 border-b border-tuao-dark-800 bg-blaze-panel px-3 py-2 lg:bg-tuao-dark-950/50 lg:py-2.5">
              <div className="flex min-h-8 min-w-0 items-center gap-1.5">
                <div
                  dir="rtl"
                  className="min-h-8 min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {history.length === 0 ? (
                    <span dir="ltr" className="inline-flex h-8 items-center text-xs text-tuao-dark-700">
                      Ainda sem giros registrados.
                    </span>
                  ) : (
                    /* RTL: começa à direita (junto ao botão); mais recente → esquerda com os mais antigos */
                    <div className="inline-flex h-8 w-max max-w-none items-center gap-1">
                      {history.map((item, idx) => (
                        <div key={`${item.number}-${idx}`} dir="ltr">
                          <DoubleRouletteTile
                            number={item.number}
                            variant="compact"
                            className="transition-transform hover:brightness-110"
                          />
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
                  title="Ver histórico de giros"
                  aria-label="Ver histórico de giros"
                >
                  <BarChart2 className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {/* Barra de tempo */}
            <div className="z-20 shrink-0 px-3 pb-3 pt-3 sm:px-4">
              {gameState === 'WAITING' ? (
                <GameCountdownBar
                  progress={
                    DOUBLE_COUNTDOWN_SECONDS > 0
                      ? Math.min(1, Math.max(0, timeLeft) / DOUBLE_COUNTDOWN_SECONDS)
                      : 0
                  }
                  className="mx-auto w-full max-w-xl shadow-[0_0_28px_rgba(0,240,255,0.1)]"
                >
                  Girando em {timeLeft.toFixed(2)}s
                </GameCountdownBar>
              ) : (
                <div className="mx-auto flex h-7 w-full max-w-xl items-center justify-center rounded-md border border-tuao-dark-800 bg-[#1a242d]/90 lg:bg-tuao-dark-950/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-tuao-text-secondary">
                    {gameState === 'SPINNING'
                      ? 'Girando…'
                      : gameState === 'RESULT'
                        ? 'Resultado'
                        : '—'}
                  </span>
                </div>
              )}
            </div>

            {/* Área da roleta */}
            <div className="relative flex min-h-[200px] flex-1 flex-col items-center justify-center px-2 sm:min-h-[220px] lg:min-h-[160px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-blaze-panel to-transparent md:w-36 lg:from-tuao-dark-900" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-blaze-panel to-transparent md:w-36 lg:from-tuao-dark-900" />

              <div className="absolute left-1/2 top-1/2 z-[15] h-[min(140px,28vw)] w-0.5 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-white to-transparent opacity-90 shadow-[0_0_12px_rgba(255,255,255,0.35)]" />
              <div className="absolute left-1/2 top-[calc(50%-min(58px,14vw))] z-20 -translate-x-1/2 text-sm text-tuao-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                ▼
              </div>
              <div className="absolute bottom-[calc(50%-min(58px,14vw))] left-1/2 z-20 -translate-x-1/2 text-sm text-tuao-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
                ▲
              </div>

              <div className="relative z-[5] h-[100px] w-full overflow-hidden">
                <div
                  ref={rouletteRef}
                  className="absolute left-1/2 top-0 flex h-full items-center will-change-transform"
                  style={{
                    transform: `translateX(-${ROULETTE_ORDER.indexOf(0) * TILE_SIZE + TILE_SIZE / 2}px)`,
                  }}
                >
                  {renderRouletteStrip()}
                </div>
              </div>

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

        {/* Secção inferior — alinhada ao Crash (mobile) */}
        <div className="mt-3 flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-tuao-dark-800 bg-blaze-panel shadow-card sm:mt-4 lg:bg-tuao-dark-900">
          <div className="flex border-b border-tuao-dark-800 bg-[#121920] lg:bg-tuao-dark-950/40">
            <button
              type="button"
              onClick={() => setLowerTab('apostas')}
              className={cn(
                'relative flex-1 px-2 py-3 text-[10px] font-bold uppercase leading-tight tracking-[0.1em] transition-colors sm:flex-none sm:px-6 sm:text-xs sm:tracking-[0.14em]',
                lowerTab === 'apostas' ? 'text-white' : 'text-tuao-text-secondary hover:text-white'
              )}
            >
              Apostas
              {lowerTab === 'apostas' && (
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

          {lowerTab === 'apostas' ? (
            <div className="grid min-h-[300px] flex-1 grid-cols-1 gap-0 md:min-h-[320px] md:grid-cols-3 md:gap-px md:bg-tuao-dark-800">
              <BetList
                color="red"
                multiplier="2×"
                totalBets={bets.filter((b) => b.color === 'red')}
                myBet={sumMyBets('red') || undefined}
              />
              <BetList
                color="white"
                multiplier="14×"
                totalBets={bets.filter((b) => b.color === 'white')}
                myBet={sumMyBets('white') || undefined}
              />
              <BetList
                color="black"
                multiplier="2×"
                totalBets={bets.filter((b) => b.color === 'black')}
                myBet={sumMyBets('black') || undefined}
              />
            </div>
          ) : (
            <div className="max-w-2xl space-y-4 p-6 text-sm leading-relaxed text-tuao-text-secondary">
              <p>
                No <span className="font-semibold text-white">Double</span> você escolhe vermelho (2×), branco (14×) ou
                preto (2×). Se a roleta parar na sua cor, você ganha o valor apostado multiplicado pelo indicador.
              </p>
              <p>
                Você pode enfileirar uma aposta durante o giro para a próxima rodada. O resultado é verificável:
                consulte a página de{' '}
                <Link to="/fairness" className="font-semibold text-tuao-primary hover:text-tuao-primary-hover">
                  justiça comprovável
                </Link>
                .
              </p>
              <ProvablyFairDoubleStrip commit={fairnessCommit} reveal={fairnessReveal} />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={roundsHistoryOpen}
        onClose={() => setRoundsHistoryOpen(false)}
        title="Histórico de giros"
        subtitle="Resultados recentes (mais recentes primeiro). 20 por página."
        size="wide"
        headerIcon={<BarChart2 className="h-5 w-5" strokeWidth={2.2} />}
      >
        {history.length === 0 ? (
          <p className="text-center text-sm text-tuao-text-secondary">Ainda sem giros registrados.</p>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 [scrollbar-width:thin]">
              {history
                .slice(
                  historyModalPage * DOUBLE_HISTORY_MODAL_PAGE_SIZE,
                  historyModalPage * DOUBLE_HISTORY_MODAL_PAGE_SIZE + DOUBLE_HISTORY_MODAL_PAGE_SIZE
                )
                .map((item, i) => (
                  <DoubleRouletteTile
                    key={`round-${historyModalPage}-${item.number}-${i}`}
                    number={item.number}
                    variant="compact"
                    className="transition-transform hover:brightness-110"
                    title={`Rodada ${historyModalPage * DOUBLE_HISTORY_MODAL_PAGE_SIZE + i + 1}`}
                  />
                ))}
            </div>
            {history.length > DOUBLE_HISTORY_MODAL_PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setHistoryModalPage((p) => Math.max(0, p - 1))}
                  disabled={historyModalPage <= 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-tuao-dark-700 px-3 py-2 text-xs font-bold text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <span className="text-xs font-semibold tabular-nums text-tuao-text-secondary">
                  Página {historyModalPage + 1} de{' '}
                  {Math.ceil(history.length / DOUBLE_HISTORY_MODAL_PAGE_SIZE)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setHistoryModalPage((p) =>
                      Math.min(Math.ceil(history.length / DOUBLE_HISTORY_MODAL_PAGE_SIZE) - 1, p + 1)
                    )
                  }
                  disabled={
                    historyModalPage >= Math.ceil(history.length / DOUBLE_HISTORY_MODAL_PAGE_SIZE) - 1
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-tuao-dark-700 px-3 py-2 text-xs font-bold text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white disabled:opacity-40"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </Modal>
    </Layout>
  );
}

// Componente de Lista de Aposta (Apenas Visualização)
interface BetListProps {
  color: DoubleColor;
  multiplier: string;
  totalBets: DoublePlayer[];
  myBet?: number;
}

function ColumnColorIcon({ color }: { color: DoubleColor }) {
  if (color === 'red') {
    return (
      <div
        className="h-9 w-9 shrink-0 rounded-md bg-tuao-primary shadow-[0_0_14px_rgba(0,240,255,0.35)] ring-2 ring-white/15"
        aria-hidden
      />
    );
  }
  if (color === 'white') {
    return (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white shadow-[0_0_12px_rgba(255,255,255,0.12)] ring-1 ring-black/10"
        aria-hidden
      >
        <img
          src={tuaoLogo}
          alt=""
          draggable={false}
          className="h-7 w-7 select-none object-contain"
        />
      </div>
    );
  }
  return (
    <div
      className="h-9 w-9 shrink-0 rounded-md border-2 border-tuao-dark-600 bg-tuao-dark-800 shadow-inner"
      aria-hidden
    />
  );
}

const BetList = ({ color, multiplier, totalBets, myBet }: BetListProps) => {
  const totalAmount = totalBets.reduce((acc, curr) => acc + curr.amount, 0);
  const sorted = [...totalBets].sort((a, b) => b.amount - a.amount);
  const visible = sorted.slice(0, MAX_VISIBLE_BETS_PER_COLUMN);
  const hidden = sorted.slice(MAX_VISIBLE_BETS_PER_COLUMN);
  const hiddenTotal = hidden.reduce((s, b) => s + b.amount, 0);
  const hiddenCount = hidden.length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-tuao-dark-900 md:rounded-none">
      {/* Cabeçalho: vitória à esquerda, ícone da cor à direita */}
      <div className="shrink-0 border-b border-tuao-dark-800 bg-tuao-dark-950/55 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-black uppercase leading-tight tracking-tight text-white">
              Vitória {multiplier}
            </p>
          </div>
          <ColumnColorIcon color={color} />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-tuao-dark-800/90 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-tuao-text-secondary">
            Total apostas
          </span>
          <span className="text-sm font-bold tabular-nums tracking-tight text-white">{formatBrl(totalAmount)}</span>
        </div>
      </div>

      {myBet != null && myBet > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-tuao-dark-800 bg-tuao-primary/[0.07] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-tuao-primary">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
            </span>
            Sua aposta
          </span>
          <span className="text-xs font-bold tabular-nums text-white">{formatBrl(myBet)}</span>
        </div>
      )}

      {/* Barra tipo tabela */}
      <div className="flex shrink-0 items-center justify-between bg-tuao-dark-800/95 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-tuao-text-secondary">
          Usuário
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-tuao-text-secondary">
          Valor
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
        {visible.length === 0 ? (
          <div className="flex min-h-[140px] items-center justify-center px-4 py-8">
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary/80">
              Aguardando apostas
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-tuao-dark-800/80">
            {visible.map((bet) => {
              const label = bet.username || bet.name || '—';
              const seed = bet.id || label;
              return (
                <li
                  key={bet.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-tuao-dark-950/40"
                >
                  <Crown
                    className={cn('h-3.5 w-3.5 shrink-0', crownToneClass(seed))}
                    strokeWidth={2.4}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold text-white">
                    {label}
                  </span>
                  <span className="shrink-0 text-right text-[12px] font-semibold tabular-nums text-white/95">
                    {formatBrlAmount(bet.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hiddenCount > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-tuao-dark-800 bg-tuao-dark-950/60 px-3 py-2.5">
          <span className="text-[11px] font-bold text-tuao-text-secondary">
            +{hiddenCount} {hiddenCount === 1 ? 'jogador' : 'jogadores'}
          </span>
          <span className="text-xs font-bold tabular-nums text-white">{formatBrl(hiddenTotal)}</span>
        </div>
      )}
    </div>
  );
};
