import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, ChevronLeft, ChevronRight, Wifi } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useMinesGame } from '../hooks/useMinesGame';
import { useMinesAutoPlay } from '../hooks/useMinesAutoPlay';
import { useMinesLiveBets } from '../hooks/useMinesLiveBets';
import {
  MinesBetPanel,
  MinesGrid,
  MinesHistoryChips,
  MinesLiveBetsPanel,
  MinesResultOverlay,
} from '../components/games/mines';
import { ProvablyFairMinesStrip } from '../components/games/ProvablyFairStrip';
import { cn } from '../lib/utils';
import {
  isCrashSoundMuted,
  onCrashSoundMuteChange,
  toggleCrashSoundMuted,
} from '../lib/crashSounds';
import { numberFromMaskDigits } from '../lib/brlMask';

const HISTORY_MODAL_PAGE_SIZE = 20;

const formatMult = (val: number) => (val === 0 ? '0.00×' : `${val.toFixed(2)}×`);

export function MinesGame() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const [betAmountDigits, setBetAmountDigits] = useState('');
  const [betMode, setBetMode] = useState<'normal' | 'auto'>('normal');
  const [lowerTab, setLowerTab] = useState<'apostas' | 'descricao'>('apostas');
  const [autoBetCount, setAutoBetCount] = useState('');
  const [autoTilesCount, setAutoTilesCount] = useState('3');
  const [roundsHistoryOpen, setRoundsHistoryOpen] = useState(false);
  const [historyModalPage, setHistoryModalPage] = useState(0);
  const [soundMuted, setSoundMuted] = useState(() => isCrashSoundMuted());

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
    lastPayout,
    fairnessCommit,
    fairnessReveal,
  } = useMinesGame();

  const { liveBets } = useMinesLiveBets();

  const betAmountValue = numberFromMaskDigits(betAmountDigits);
  const cashoutPayout =
    lastPayout > 0 && (gameState === 'CASHOUT' || gameState === 'GAME_OVER')
      ? lastPayout
      : betAmountValue * multiplier;

  const beginRound = useCallback(() => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (!Number.isFinite(betAmountValue) || betAmountValue <= 0) return;
    void startGameWithBet(betAmountValue);
  }, [isAuthenticated, openLoginModal, betAmountValue, startGameWithBet]);

  const { isAutoPlaying, toggleAutoPlay, stopAuto } = useMinesAutoPlay({
    enabled: betMode === 'auto',
    gameState,
    revealed,
    autoBetCount,
    autoTilesCount,
    beginRound,
    revealCell,
    cashout,
  });

  useEffect(() => {
    return onCrashSoundMuteChange(setSoundMuted);
  }, []);

  useEffect(() => {
    if (betMode === 'normal') stopAuto();
  }, [betMode, stopAuto]);

  useEffect(() => {
    if (roundsHistoryOpen) setHistoryModalPage(0);
  }, [roundsHistoryOpen]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(history.length / HISTORY_MODAL_PAGE_SIZE) - 1);
    setHistoryModalPage((p) => Math.min(p, maxPage));
  }, [history.length]);

  const toggleFullscreen = useCallback(() => {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      void root.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  const historyPage = history.slice(
    historyModalPage * HISTORY_MODAL_PAGE_SIZE,
    historyModalPage * HISTORY_MODAL_PAGE_SIZE + HISTORY_MODAL_PAGE_SIZE
  );
  const historyMaxPage = Math.max(0, Math.ceil(history.length / HISTORY_MODAL_PAGE_SIZE) - 1);

  return (
    <Layout>
      <div className="mx-auto flex max-w-6xl flex-col gap-0 p-2 pb-8 text-white max-lg:h-[calc(100dvh-11rem)] max-lg:min-h-0 sm:p-4">
        <div className="flex min-h-0 flex-1 flex-col-reverse gap-0 overflow-hidden rounded-xl border border-tuao-dark-800 bg-blaze-panel shadow-card lg:flex-none lg:flex-row lg:bg-tuao-dark-900">
          <MinesBetPanel
            betMode={betMode}
            onBetModeChange={(mode) => {
              setBetMode(mode);
              if (mode === 'normal') stopAuto();
            }}
            betAmountDigits={betAmountDigits}
            onBetAmountDigitsChange={setBetAmountDigits}
            gameState={gameState}
            isAutoPlaying={isAutoPlaying}
            minesCount={minesCount}
            onMinesCountChange={setMinesCount}
            autoBetCount={autoBetCount}
            onAutoBetCountChange={setAutoBetCount}
            autoTilesCount={autoTilesCount}
            onAutoTilesCountChange={setAutoTilesCount}
            cashoutPayout={cashoutPayout}
            onBeginRound={beginRound}
            onCashout={cashout}
            onToggleAuto={toggleAutoPlay}
            onToggleFullscreen={toggleFullscreen}
            soundMuted={soundMuted}
            onToggleMute={() => toggleCrashSoundMuted()}
            lastError={lastError}
          />

          <div className="relative flex min-h-0 flex-1 flex-col bg-blaze-panel lg:min-h-[520px] lg:bg-tuao-dark-900">
            <MinesHistoryChips
              history={history}
              onOpenModal={() => setRoundsHistoryOpen(true)}
            />
            <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-8 pt-12 sm:px-6 sm:pb-6 sm:pt-14">
              <MinesGrid
                grid={grid}
                revealed={revealed}
                gameState={gameState}
                isAutoPlaying={isAutoPlaying}
                onReveal={revealCell}
              />
              <MinesResultOverlay
                gameState={gameState}
                multiplier={multiplier}
                payout={cashoutPayout}
              />
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
            <MinesLiveBetsPanel liveBets={liveBets} />
          ) : (
            <div className="max-w-2xl space-y-4 p-6 text-sm leading-relaxed text-tuao-text-secondary">
              <p>
                No <span className="font-semibold text-white">Mines</span> você escolhe quantas minas
                existem no tabuleiro 5×5. Cada casa segura revelada aumenta o multiplicador; se
                clicar numa mina, perde a aposta desta rodada.
              </p>
              <p>
                Você pode retirar em qualquer momento durante o jogo para garantir o valor atual.
                Consulte a página de{' '}
                <Link
                  to="/fairness"
                  className="font-semibold text-tuao-primary hover:text-tuao-primary-hover"
                >
                  justiça comprovável
                </Link>
                .
              </p>
              <ProvablyFairMinesStrip commit={fairnessCommit} reveal={fairnessReveal} />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={roundsHistoryOpen}
        onClose={() => setRoundsHistoryOpen(false)}
        title="Histórico da sessão"
        headerIcon={<BarChart2 className="h-5 w-5" strokeWidth={2.2} />}
      >
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-tuao-text-secondary">
            Ainda sem resultados nesta sessão
          </p>
        ) : (
          <div className="space-y-3">
            <ul className="divide-y divide-tuao-dark-800/80 rounded-lg border border-tuao-dark-800">
              {historyPage.map((val, idx) => {
                const absoluteIdx = historyModalPage * HISTORY_MODAL_PAGE_SIZE + idx;
                return (
                  <li
                    key={`${val}-${absoluteIdx}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-tuao-text-secondary">
                      Rodada {history.length - absoluteIdx}
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
                );
              })}
            </ul>
            {historyMaxPage > 0 && (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={historyModalPage <= 0}
                  onClick={() => setHistoryModalPage((p) => Math.max(0, p - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 disabled:opacity-40"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-tuao-text-secondary">
                  {historyModalPage + 1} / {historyMaxPage + 1}
                </span>
                <button
                  type="button"
                  disabled={historyModalPage >= historyMaxPage}
                  onClick={() => setHistoryModalPage((p) => Math.min(historyMaxPage, p + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 disabled:opacity-40"
                  aria-label="Próxima página"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
}
