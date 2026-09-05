import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDoubleGame, DoubleColor, DoublePlayer } from '../hooks/useDoubleGame';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/layout/Layout';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/utils';
import { BarChart2, Crown, Info, Maximize2, Wifi } from 'lucide-react';
import { GameCountdownBar, DOUBLE_COUNTDOWN_SECONDS } from '../components/games/GameCountdownBar';
import { DoubleRouletteTile } from '../components/games/DoubleRouletteTile';
import { DoubleColorBetCard } from '../components/games/DoubleColorBetCard';

// Configuração da ordem da roleta (padrão Double)
// 0 = Branco, 1-7 = Vermelho, 8-14 = Preto
const ROULETTE_ORDER = [1, 14, 2, 13, 3, 12, 4, 0, 11, 5, 10, 6, 9, 7, 8];
const TILE_SIZE = 80; // Largura de cada quadrado em px

const MAX_VISIBLE_BETS_PER_COLUMN = 7;

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
    placeBet,
    lastError,
  } = useDoubleGame();

  const [amount, setAmount] = useState('');
  const [lowerTab, setLowerTab] = useState<'apostas' | 'descricao'>('apostas');
  const [roundsHistoryOpen, setRoundsHistoryOpen] = useState(false);

  const sumMyBets = (color: DoubleColor) =>
    bets
      .filter((b) => (b.username || b.name) === user?.username && b.color === color)
      .reduce((acc, b) => acc + b.amount, 0);

  // Contagem local suave (segundos fracionários) — realinhada ao servidor em cada tick
  const [timeLeft, setTimeLeft] = useState(countdown);

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

  // Referência para o container da roleta (para animação CSS)
  const rouletteRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  const onPlaceBet = (color: DoubleColor) => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (gameState !== 'WAITING') return;
    const v = parseFloat(amount.trim() || '');
    if (!Number.isFinite(v) || v <= 0) return;
    placeBet(v, color);
  };

  // Calcular posição final da roleta
  useEffect(() => {
    if (!rouletteRef.current) return;

    const whiteIndex = ROULETTE_ORDER.indexOf(0);
    // Posição inicial (Branco no primeiro loop)
    const startPosition = (whiteIndex * TILE_SIZE) + (TILE_SIZE / 2);

    if (gameState === 'SPINNING' && result) {
      // 1. Movimento fluido e desaceleração
      // Calcular offset aleatório para simular parada na borda (ponta)
      // Tile = 80px. Offset entre -35px e +35px para ficar na borda mas ainda dentro do tile
      const newOffset = (Math.random() - 0.5) * 70;
      offsetRef.current = newOffset;

      const targetIndexInPattern = ROULETTE_ORDER.indexOf(result.number);
      
      // Vamos mirar em um bloco lá na frente (ex: volta 4)
      const loops = 4;
      const totalIndex = (ROULETTE_ORDER.length * loops) + targetIndexInPattern;
      
      // Posição final com o offset (parada imperfeita)
      const finalPosition = (totalIndex * TILE_SIZE) + (TILE_SIZE / 2) + newOffset;

      // Easing personalizado para desaceleração progressiva realista
      // Ajustado para 3.8s para garantir que pare antes do estado RESULT (4s)
      rouletteRef.current.style.transition = 'transform 3.8s cubic-bezier(0.1, 0.05, 0.1, 1)'; 
      rouletteRef.current.style.transform = `translateX(-${finalPosition}px)`;

    } else if (gameState === 'RESULT' && result) {
      // 2. Parada e correção de alinhamento
      // Quando entra em RESULT, faz o ajuste fino para o centro
      const targetIndexInPattern = ROULETTE_ORDER.indexOf(result.number);
      const loops = 4;
      const totalIndex = (ROULETTE_ORDER.length * loops) + targetIndexInPattern;
      
      // Posição exata no centro (sem offset)
      const centerPosition = (totalIndex * TILE_SIZE) + (TILE_SIZE / 2);

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

  const toggleFullscreen = useCallback(() => {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      void root.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  return (
    <Layout>
      <div className="mx-auto flex max-w-6xl flex-col gap-0 p-2 pb-8 text-white sm:p-4">
        {/* Mobile: roleta/histórico em cima, apostas em baixo — mesmo padrão do Crash */}
        <div className="flex flex-col-reverse gap-0 overflow-hidden rounded-xl border border-tuao-dark-800 bg-blaze-panel shadow-card lg:flex-row lg:bg-tuao-dark-900">
          {/* Painel de apostas */}
          <div className="flex min-h-0 w-full shrink-0 flex-col border-t border-tuao-dark-800 bg-blaze-panel lg:w-[300px] lg:border-b-0 lg:border-r lg:border-t-0 lg:bg-tuao-dark-900">
            <div className="shrink-0 px-3 pb-2 pt-3 sm:px-4">
              <div className="flex rounded-lg border border-tuao-dark-800 bg-[#1a242d] p-1 lg:bg-tuao-dark-950">
                <button
                  type="button"
                  className="flex-1 rounded-md bg-[#2a3540] py-2.5 text-sm font-bold text-white shadow-sm lg:bg-tuao-dark-800"
                >
                  Normal
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-md py-2.5 text-sm font-bold text-tuao-text-secondary transition-colors hover:text-white"
                >
                  Auto
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-3 sm:px-4">
                <div className="flex gap-2">
                  <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border border-tuao-dark-700 bg-[#1a242d] px-3 transition-colors focus-within:border-tuao-primary focus-within:ring-1 focus-within:ring-tuao-primary lg:bg-tuao-dark-950">
                    <span className="shrink-0 text-sm font-semibold text-white">Quantia</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-right text-base font-bold text-white outline-none placeholder:text-tuao-text-secondary/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="shrink-0 text-sm font-semibold text-white">R$</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleHalve}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700 lg:bg-tuao-dark-800"
                    aria-label="Metade do valor"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    onClick={handleDouble}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700 lg:bg-tuao-dark-800"
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
                        disabled={gameState !== 'WAITING'}
                        highlighted={sumMyBets('red') > 0}
                        onClick={() => onPlaceBet('red')}
                      />
                      <DoubleColorBetCard
                        color="white"
                        multiplier="x14"
                        disabled={gameState !== 'WAITING'}
                        highlighted={sumMyBets('white') > 0}
                        onClick={() => onPlaceBet('white')}
                      />
                      <DoubleColorBetCard
                        color="black"
                        multiplier="x2"
                        disabled={gameState !== 'WAITING'}
                        highlighted={sumMyBets('black') > 0}
                        onClick={() => onPlaceBet('black')}
                      />
                    </div>
                    <div
                      role="status"
                      aria-live="polite"
                      className={cn(
                        'w-full rounded-lg border py-3.5 text-center text-sm font-bold',
                        gameState === 'WAITING'
                          ? 'border-tuao-dark-700 bg-tuao-dark-800 text-tuao-text-secondary'
                          : 'border-tuao-primary/25 bg-tuao-dark-950 text-tuao-primary/85 shadow-[0_0_18px_rgba(0,240,255,0.08)]'
                      )}
                    >
                      {gameState === 'WAITING' ? 'Aposta ao tocar na cor' : 'Esperando'}
                    </div>
                  </div>
                  <p className="text-center text-[10px] leading-snug text-tuao-text-secondary">
                    Toque na cor para apostar nesta ronda.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between px-3 pb-3 pt-1 sm:px-4">
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

            {lastError && (
              <div className="p-3 mt-auto border-t border-tuao-dark-800 bg-tuao-dark-950/30">
                <p className="text-center text-xs text-red-400">{lastError}</p>
              </div>
            )}
          </div>

          {/* Visualizador: histórico no topo (mobile, como Crash) → countdown → roleta */}
          <div className="relative flex min-h-0 flex-1 flex-col bg-blaze-panel lg:min-h-[480px] lg:bg-tuao-dark-900">
            {/* Giros anteriores — primeiro no mobile */}
            <div className="shrink-0 border-b border-tuao-dark-800 bg-blaze-panel px-3 py-2.5 lg:bg-tuao-dark-950/50">
              <div className="mb-2 hidden items-center justify-between gap-3 lg:flex">
                <span className="text-[10px] font-bold uppercase leading-none tracking-wider text-tuao-text-secondary sm:text-[11px]">
                  Giros anteriores
                </span>
                <button
                  type="button"
                  onClick={() => setRoundsHistoryOpen(true)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-900 text-tuao-text-secondary transition-colors hover:border-tuao-primary/40 hover:text-tuao-primary"
                  title="Ver histórico de giros"
                  aria-label="Ver histórico de giros"
                >
                  <BarChart2 className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex min-h-8 min-w-0 flex-1 items-center gap-1 overflow-x-auto py-0.5 [scrollbar-width:thin] [scrollbar-color:rgba(42,42,42,1)_transparent]">
                  {history.length === 0 ? (
                    <span className="py-1 text-xs text-tuao-dark-700">Ainda sem histórico nesta sessão.</span>
                  ) : (
                    history.map((item, idx) => (
                      <DoubleRouletteTile
                        key={`${item.number}-${idx}`}
                        number={item.number}
                        variant="compact"
                        className="transition-transform hover:brightness-110"
                      />
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setRoundsHistoryOpen(true)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-[#1a242d] text-tuao-text-secondary transition-colors hover:border-tuao-primary/40 hover:text-tuao-primary lg:hidden"
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
                <div className="mx-auto flex h-10 w-full max-w-xl items-center justify-center rounded-full border border-tuao-dark-800 bg-[#1a242d]/90 lg:bg-tuao-dark-950/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-tuao-text-secondary">
                    {gameState === 'SPINNING'
                      ? 'A girar…'
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

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[min(140px,28vw)] w-0.5 bg-gradient-to-b from-transparent via-white to-transparent z-[15] opacity-90 shadow-[0_0_12px_rgba(255,255,255,0.35)]" />
              <div className="absolute left-1/2 top-[calc(50%-min(58px,14vw))] -translate-x-1/2 z-20 text-tuao-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] text-sm">
                ▼
              </div>
              <div className="absolute left-1/2 bottom-[calc(50%-min(58px,14vw))] -translate-x-1/2 z-20 text-tuao-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] text-sm">
                ▲
              </div>

              <div className="overflow-hidden w-full relative h-[100px] z-[5]">
                <div
                  ref={rouletteRef}
                  className="flex absolute left-1/2 top-0 h-full items-center will-change-transform"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-px md:bg-tuao-dark-800 flex-1 min-h-[300px] md:min-h-[320px]">
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
            <div className="p-6 text-sm text-tuao-text-secondary leading-relaxed space-y-4 max-w-2xl">
              <p>
                No <span className="text-white font-semibold">Double</span> escolhes vermelho (2×), branco (14×) ou
                preto (2×). Se a roleta parar na tua cor, ganhas o valor apostado multiplicado pelo indicador.
              </p>
              <p>
                As rondas são sincronizadas em tempo real. O resultado é verificável: consulta a página de{' '}
                <Link to="/fairness" className="text-tuao-primary hover:text-tuao-primary-hover font-semibold">
                  justiça comprovável
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={roundsHistoryOpen}
        onClose={() => setRoundsHistoryOpen(false)}
        title="Histórico de giros"
        subtitle="Resultados recentes (mais recentes primeiro)."
        size="wide"
        headerIcon={<BarChart2 className="h-5 w-5" strokeWidth={2.2} />}
      >
        {history.length === 0 ? (
          <p className="text-center text-sm text-tuao-text-secondary">Ainda sem giros registados.</p>
        ) : (
          <div className="flex max-h-[min(60vh,420px)] flex-wrap gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {history.map((item, idx) => (
              <DoubleRouletteTile
                key={`${item.number}-${idx}-modal`}
                number={item.number}
                variant="compact"
                className="transition-transform hover:brightness-110"
              />
            ))}
          </div>
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
        className="h-9 w-9 shrink-0 rounded-full bg-tuao-primary shadow-[0_0_14px_rgba(0,240,255,0.35)] ring-2 ring-white/15"
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
        <span className="text-[9px] font-black uppercase leading-none text-tuao-dark-950">Tuao</span>
      </div>
    );
  }
  return (
    <div
      className="h-9 w-9 shrink-0 rounded-full border-2 border-tuao-dark-600 bg-tuao-dark-800 shadow-inner"
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
        <div className="shrink-0 flex items-center justify-between gap-2 border-b border-tuao-dark-800 bg-tuao-primary/[0.07] px-3 py-2">
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-tuao-primary">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
            </span>
            A tua aposta
          </span>
          <span className="text-xs font-bold tabular-nums text-white">{formatBrl(myBet)}</span>
        </div>
      )}

      {/* Barra tipo tabela */}
      <div className="shrink-0 flex items-center justify-between bg-tuao-dark-800/95 px-3 py-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-tuao-text-secondary">
          Usuário
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-tuao-text-secondary">
          Quantia
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
        <div className="shrink-0 flex items-center justify-between gap-2 border-t border-tuao-dark-800 bg-tuao-dark-950/60 px-3 py-2.5">
          <span className="text-[11px] font-bold text-tuao-text-secondary">
            +{hiddenCount} {hiddenCount === 1 ? 'jogador' : 'jogadores'}
          </span>
          <span className="text-xs font-bold tabular-nums text-white">{formatBrl(hiddenTotal)}</span>
        </div>
      )}
    </div>
  );
};
