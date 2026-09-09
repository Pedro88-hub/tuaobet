import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/utils';
import { usePlinkoGame, PLINKO_ROWS_MIN, PLINKO_ROWS_MAX } from '../hooks/usePlinkoGame';
import { BarChart2, History, Info, Maximize2, Wifi } from 'lucide-react';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PIN_RADIUS = 4;
const BALL_RADIUS = 6;

/** Geometria partilhada entre canvas, overlay de multiplicadores e OVNI. */
function computePlinkoLayout(rows: number) {
  const paddingTop = 50;
  const availableHeight = CANVAS_HEIGHT - 100;
  const rowSpacing = availableHeight / rows;

  const rowStartX = (r: number) => {
    const pinsInRow = r + 3;
    const rowWidth = pinsInRow * rowSpacing;
    return (CANVAS_WIDTH - rowWidth) / 2 + rowSpacing / 2;
  };

  const bottomR = rows - 1;
  const startBottom = rowStartX(bottomR);
  const pinsInBottom = bottomR + 3;
  const slotCenters: number[] = [];
  for (let i = 0; i < pinsInBottom - 1; i++) {
    const x1 = startBottom + i * rowSpacing;
    const x2 = startBottom + (i + 1) * rowSpacing;
    slotCenters.push((x1 + x2) / 2);
  }

  const startTop = rowStartX(0);
  const topDropX = startTop + rowSpacing;
  const lastPinY = paddingTop + (rows - 1) * rowSpacing;
  const gapBelowPins = 10;
  const multiplierBoxHalfH = 15;
  const multiplierCenterY = lastPinY + gapBelowPins + multiplierBoxHalfH;
  const multiplierBottomEdgeY = multiplierCenterY + multiplierBoxHalfH;
  const multiplierBottomPx = CANVAS_HEIGHT - multiplierBottomEdgeY;

  return {
    paddingTop,
    rowSpacing,
    rowStartX,
    slotCenters,
    slotWidth: Math.max(16, rowSpacing - 4),
    topDropX,
    /** Saída sob o feixe do OVNI, alinhada ao pin central do topo. */
    ballSpawnY: paddingTop - 2,
    ufoCenterY: paddingTop - 34,
    /** Posiciona a base das caixas de multiplicador (CSS % do contentor 800×600). */
    multiplierBottomPercent: (multiplierBottomPx / CANVAS_HEIGHT) * 100,
  };
}

/** Cores alinhadas ao tema TuãoBET (canvas 2D). */
const PIN_FILL = 'rgba(0, 240, 255, 0.45)';
const PIN_GLOW = 'rgba(0, 240, 255, 0.35)';
const BALL_FILL = '#00F0FF';
const BALL_GLOW = 'rgba(0, 240, 255, 0.85)';
const CANVAS_BG = '#0F1923';

/** OVNI + feixe sobre o pin central da primeira fila (coordenadas do canvas). */
function drawPlinkoUfo(ctx: CanvasRenderingContext2D, centerX: number, centerY: number) {
  ctx.save();
  ctx.translate(centerX, centerY);

  const beamGrad = ctx.createLinearGradient(0, 22, 0, 54);
  beamGrad.addColorStop(0, 'rgba(0, 240, 255, 0.28)');
  beamGrad.addColorStop(0.45, 'rgba(0, 240, 255, 0.1)');
  beamGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(-9, 22);
  ctx.lineTo(9, 22);
  ctx.lineTo(20, 52);
  ctx.lineTo(-20, 52);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#243a44';
  ctx.beginPath();
  ctx.ellipse(0, 8, 46, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
  for (const dx of [-18, 0, 18]) {
    ctx.beginPath();
    ctx.arc(dx, 8, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(0, 210, 230, 0.32)';
  ctx.beginPath();
  ctx.arc(0, 2, 20, Math.PI, 0, true);
  ctx.lineTo(-20, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

const formatBrlAmount = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Animação determinística: a bola segue o `finalSlot` devolvido pelo servidor até
 * `slotCenters[finalSlot]`, alinhando o resultado ao pagamento e aos rótulos das ranhuras.
 */
class VisualBall {
  id: string;
  x: number;
  y: number;
  progress: number;
  finished: boolean;
  finishDispatched: boolean;
  private readonly dropX: number;
  private readonly spawnY: number;
  private readonly targetX: number;
  private readonly bottomY: number;
  finalSlot: number;

  constructor(
    id: string,
    dropX: number,
    spawnY: number,
    targetX: number,
    finalSlot: number,
    bottomY: number
  ) {
    this.id = id;
    this.dropX = dropX + (Math.random() - 0.5) * 6;
    this.spawnY = spawnY;
    this.targetX = targetX;
    this.bottomY = bottomY;
    this.finalSlot = finalSlot;
    this.x = this.dropX;
    this.y = spawnY;
    this.progress = 0;
    this.finished = false;
    this.finishDispatched = false;
  }

  update(dt: number) {
    if (this.finished) return;

    this.progress += dt * 0.024;
    if (this.progress >= 1) {
      this.progress = 1;
      this.finished = true;
    }
    const t = this.progress;
    const e = t * t * (3 - 2 * t);
    this.y = this.spawnY + t * (this.bottomY - this.spawnY);
    this.x = this.dropX + (this.targetX - this.dropX) * e;
  }
}

export function PlinkoGame() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const {
    activeBalls,
    history,
    rows,
    setRows,
    risk,
    setRisk,
    multipliers,
    dropBall,
    handleBallFinish,
    error: plinkoError,
  } = usePlinkoGame();

  const [betAmount, setBetAmount] = useState('');
  const [lowerTab, setLowerTab] = useState<'resultados' | 'descricao'>('resultados');
  const [dropsHistoryOpen, setDropsHistoryOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualBallsRef = useRef<VisualBall[]>([]);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const layout = useMemo(() => computePlinkoLayout(rows), [rows]);

  useEffect(() => {
    const bottomY = CANVAS_HEIGHT - 52;
    activeBalls.forEach((logicBall) => {
      if (!visualBallsRef.current.find((vb) => vb.id === logicBall.id)) {
        const tx = layout.slotCenters[logicBall.finalSlot] ?? layout.topDropX;
        visualBallsRef.current.push(
          new VisualBall(logicBall.id, layout.topDropX, layout.ballSpawnY, tx, logicBall.finalSlot, bottomY)
        );
      }
    });
  }, [activeBalls, layout.topDropX, layout.ballSpawnY, layout.slotCenters]);

  const animate = (time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const dt = (time - lastTimeRef.current) / 16;
    lastTimeRef.current = time;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const L = computePlinkoLayout(rows);

    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawPlinkoUfo(ctx, L.topDropX, L.ufoCenterY);

    const pins: { x: number; y: number; row: number }[] = [];

    ctx.fillStyle = PIN_FILL;
    for (let r = 0; r < rows; r++) {
      const startX = L.rowStartX(r);
      const pinsInRow = r + 3;
      for (let c = 0; c < pinsInRow; c++) {
        const x = startX + c * L.rowSpacing;
        const y = L.paddingTop + r * L.rowSpacing;
        ctx.shadowBlur = 6;
        ctx.shadowColor = PIN_GLOW;
        ctx.beginPath();
        ctx.arc(x, y, PIN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        pins.push({ x, y, row: r });
      }
    }
    ctx.shadowBlur = 0;

    visualBallsRef.current.forEach((ball) => {
      if (!ball.finished) {
        ball.update(dt);
      }

      if (ball.finished && !ball.finishDispatched) {
        ball.finishDispatched = true;
        handleBallFinish(ball.id, ball.finalSlot);
        setTimeout(() => {
          visualBallsRef.current = visualBallsRef.current.filter((b) => b.id !== ball.id);
        }, 500);
      }

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = BALL_FILL;
      ctx.fill();
      ctx.shadowBlur = 12;
      ctx.shadowColor = BALL_GLOW;
    });
    ctx.shadowBlur = 0;

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [rows, handleBallFinish]);

  const handleHalve = () =>
    setBetAmount((prev) => {
      const v = parseFloat(prev);
      if (!Number.isFinite(v) || v <= 0) return '';
      return (v / 2).toFixed(2);
    });
  const handleDouble = () =>
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

  const onDrop = () => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    const v = parseFloat(betAmount);
    if (!Number.isFinite(v) || v <= 0) return;
    void dropBall(v);
  };

  const getMultiplierColor = (val: number) => {
    if (val >= 10) return 'border-red-500/35 bg-red-500/15 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.2)]';
    if (val >= 2) return 'border-orange-500/35 bg-orange-500/12 text-orange-200';
    if (val >= 1) return 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300';
    return 'border-tuao-dark-600 bg-tuao-dark-800 text-tuao-text-secondary';
  };

  return (
    <Layout>
      <div className="mx-auto flex max-w-6xl flex-col gap-0 p-4 pb-8 text-white">
        <div className="flex flex-col gap-0 overflow-hidden rounded-xl border border-tuao-dark-800 bg-tuao-dark-900 shadow-card lg:flex-row">
          {/* Painel esquerdo — alinhado a Mines / Double */}
          <div className="flex min-h-0 w-full shrink-0 flex-col border-b border-tuao-dark-800 bg-tuao-dark-900 lg:w-[300px] lg:border-b-0 lg:border-r">
            <div className="shrink-0 px-4 pb-2 pt-3">
              <div className="flex rounded-lg border border-tuao-dark-800 bg-tuao-dark-950 p-1">
                <button
                  type="button"
                  className="flex-1 rounded-md bg-tuao-dark-800 py-2.5 text-sm font-bold text-white shadow-sm"
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
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
                <div className="flex gap-2">
                  <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-lg border border-tuao-dark-700 bg-tuao-dark-950 px-3 transition-colors focus-within:border-tuao-primary focus-within:ring-1 focus-within:ring-tuao-primary">
                    <span className="shrink-0 text-sm font-semibold text-white">Valor</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-right text-base font-bold text-white outline-none placeholder:text-tuao-text-secondary/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="shrink-0 text-sm font-semibold text-white">R$</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleHalve}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-800 text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700"
                    aria-label="Metade do valor"
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    onClick={handleDouble}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-800 text-sm font-bold text-white transition-colors hover:border-tuao-dark-600 hover:bg-tuao-dark-700"
                    aria-label="Dobrar o valor"
                  >
                    2x
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold capitalize text-white">Risco</div>
                  <div className="flex rounded-lg border border-tuao-dark-800 bg-tuao-dark-950 p-1">
                    {(['low', 'medium', 'high'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRisk(r)}
                        className={cn(
                          'flex-1 rounded-md py-2.5 text-xs font-bold capitalize transition-colors',
                          risk === r
                            ? 'bg-tuao-dark-800 text-white shadow-sm'
                            : 'text-tuao-text-secondary hover:text-white'
                        )}
                      >
                        {r === 'low' ? 'Baixo' : r === 'medium' ? 'Médio' : 'Alto'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-semibold capitalize text-white">Linhas ({rows})</div>
                  <input
                    type="range"
                    min={PLINKO_ROWS_MIN}
                    max={PLINKO_ROWS_MAX}
                    value={rows}
                    onChange={(e) => setRows(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-tuao-dark-950 accent-tuao-primary"
                  />
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-tuao-text-secondary">
                    <span>{PLINKO_ROWS_MIN}</span>
                    <span>{PLINKO_ROWS_MAX}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full border border-tuao-primary/30 bg-tuao-primary text-sm font-black uppercase tracking-wider text-tuao-dark-950 shadow-[0_0_20px_rgba(0,240,255,0.25)] hover:bg-tuao-primary-hover"
                  onClick={onDrop}
                >
                  Largar bola
                </Button>
              </div>

              <div className="flex shrink-0 flex-col gap-2 px-4 pb-3 pt-1">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-950 text-tuao-text-secondary transition-colors hover:border-tuao-dark-600 hover:text-white"
                    aria-label="Tela cheia"
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
            </div>

            {plinkoError && (
              <div className="mt-auto border-t border-tuao-dark-800 bg-tuao-dark-950/30 p-3">
                <p className="text-center text-xs text-red-400">{plinkoError}</p>
              </div>
            )}
          </div>

          {/* Área do jogo */}
          <div className="relative flex min-h-[440px] flex-1 flex-col bg-tuao-dark-900 lg:min-h-[520px]">
            <div className="relative flex min-h-[280px] flex-1 flex-col items-center justify-center bg-tuao-dark-950/40 px-2 py-4 sm:px-4">
              <div className="relative w-full max-w-[800px] shrink-0 aspect-[800/600]">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="absolute inset-0 block h-full w-full rounded-sm"
                />
                {multipliers.map((mult, idx) => {
                  const cx = layout.slotCenters[idx];
                  if (cx === undefined) return null;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'pointer-events-none absolute flex h-[30px] min-w-0 cursor-default items-center justify-center rounded-md border text-[10px] font-bold shadow-lg',
                        getMultiplierColor(mult)
                      )}
                      style={{
                        left: `${(cx / CANVAS_WIDTH) * 100}%`,
                        bottom: `${layout.multiplierBottomPercent}%`,
                        transform: 'translateX(-50%)',
                        width: `${(layout.slotWidth / CANVAS_WIDTH) * 100}%`,
                      }}
                    >
                      <span className="truncate px-0.5">{mult}x</span>
                    </div>
                  );
                })}
              </div>

              <div className="absolute bottom-3 right-4 z-20 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-tuao-text-secondary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                </span>
                <Wifi className="h-3 w-3 text-emerald-500/90" strokeWidth={2.5} />
                <span className="text-emerald-500/90">Online</span>
              </div>
            </div>

            <div className="shrink-0 border-t border-tuao-dark-800 bg-tuao-dark-950/50 px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary">
                  <History className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Últimas quedas
                </span>
                <button
                  type="button"
                  onClick={() => setDropsHistoryOpen(true)}
                  className="shrink-0 rounded-lg border border-tuao-dark-700 bg-tuao-dark-900 p-2 text-tuao-text-secondary transition-colors hover:border-tuao-primary/40 hover:text-tuao-primary"
                  title="Ver histórico de quedas"
                  aria-label="Ver histórico de quedas"
                >
                  <BarChart2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
                {history.length === 0 ? (
                  <span className="py-2 text-xs text-tuao-dark-600">Ainda sem quedas neste dispositivo.</span>
                ) : (
                  history.slice(0, 16).map((item, idx) => (
                    <div
                      key={`${item.at}-${idx}`}
                      className={cn(
                        'min-w-[44px] animate-in fade-in slide-in-from-right-4 rounded border px-2 py-1 text-center font-mono text-xs font-bold',
                        item.multiplier >= 1
                          ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                          : 'border-tuao-dark-700 bg-tuao-dark-800 text-tuao-text-secondary'
                      )}
                    >
                      {item.multiplier}x
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-tuao-dark-800 bg-tuao-dark-900 shadow-card">
          <div className="flex flex-wrap border-b border-tuao-dark-800 bg-tuao-dark-950/40">
            <button
              type="button"
              onClick={() => setLowerTab('resultados')}
              className={cn(
                'relative flex-1 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] transition-colors sm:flex-none sm:px-6',
                lowerTab === 'resultados' ? 'text-white' : 'text-tuao-text-secondary hover:text-white'
              )}
            >
              Últimos resultados
              {lowerTab === 'resultados' && (
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

          {lowerTab === 'resultados' ? (
            <div className="min-h-[240px] flex-1 p-4 sm:p-6">
              {history.length === 0 ? (
                <div className="flex min-h-[180px] items-center justify-center">
                  <p className="text-center text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary/80">
                    Ainda sem quedas registradas neste dispositivo
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-tuao-dark-800/80 rounded-lg border border-tuao-dark-800 bg-tuao-dark-950/40">
                  {history.map((item, idx) => (
                    <li
                      key={`${item.at}-${idx}`}
                      className="grid grid-cols-2 items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-tuao-dark-950/40 sm:grid-cols-4"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary">
                        Queda {history.length - idx}
                      </span>
                      <span
                        className={cn(
                          'text-right text-sm font-bold tabular-nums sm:text-left',
                          item.multiplier >= 1 ? 'text-tuao-primary' : 'text-tuao-text-secondary'
                        )}
                      >
                        {item.multiplier.toFixed(2)}×
                      </span>
                      <span className="text-[11px] text-tuao-text-secondary sm:text-xs">
                        Aposta{' '}
                        <span className="font-semibold tabular-nums text-white/90">{formatBrlAmount(item.bet)}</span>
                      </span>
                      <span
                        className={cn(
                          'text-right text-[11px] font-semibold tabular-nums sm:text-left sm:text-xs',
                          item.profit >= 0 ? 'text-emerald-400' : 'text-red-400/90'
                        )}
                      >
                        {item.profit >= 0 ? '+' : ''}
                        {formatBrlAmount(item.profit)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="max-w-2xl space-y-4 p-6 text-sm leading-relaxed text-tuao-text-secondary">
              <p>
                No <span className="font-semibold text-white">Plinko</span> a bola desce pelo tabuleiro de pinos e cai
                numa ranhura com um multiplicador. O risco e o número de linhas alteram a distribuição dos prêmios.
              </p>
              <p>
                Cada queda é registrada no histórico. Para transparência e verificação, consulte a página de{' '}
                <Link to="/fairness" className="font-semibold text-tuao-primary hover:text-tuao-primary-hover">
                  justiça comprovável
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={dropsHistoryOpen}
        onClose={() => setDropsHistoryOpen(false)}
        title="Histórico de quedas"
        subtitle="Salvo neste navegador (últimas quedas primeiro)."
        size="wide"
        headerIcon={<BarChart2 className="h-5 w-5" strokeWidth={2} />}
      >
        {history.length === 0 ? (
          <p className="text-center text-sm text-tuao-text-secondary">Ainda sem quedas registradas.</p>
        ) : (
          <ul className="max-h-[min(60vh,480px)] divide-y divide-tuao-dark-800/80 overflow-y-auto rounded-lg border border-tuao-dark-800 bg-tuao-dark-950/40 pr-1 [scrollbar-width:thin]">
            {history.map((item, idx) => (
              <li
                key={`modal-${item.at}-${idx}`}
                className="grid grid-cols-2 items-center gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-4"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary">
                  Queda {history.length - idx}
                </span>
                <span
                  className={cn(
                    'text-right text-sm font-bold tabular-nums sm:text-left',
                    item.multiplier >= 1 ? 'text-tuao-primary' : 'text-tuao-text-secondary'
                  )}
                >
                  {item.multiplier.toFixed(2)}×
                </span>
                <span className="text-[11px] text-tuao-text-secondary sm:text-xs">
                  Aposta <span className="font-semibold tabular-nums text-white/90">{formatBrlAmount(item.bet)}</span>
                </span>
                <span
                  className={cn(
                    'text-right text-[11px] font-semibold tabular-nums sm:text-left sm:text-xs',
                    item.profit >= 0 ? 'text-emerald-400' : 'text-red-400/90'
                  )}
                >
                  {item.profit >= 0 ? '+' : ''}
                  {formatBrlAmount(item.profit)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </Layout>
  );
}
