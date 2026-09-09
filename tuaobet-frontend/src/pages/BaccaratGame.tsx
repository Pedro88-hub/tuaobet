import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Info, Maximize2, Wifi } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { GameMaintenanceScreen } from '../components/games/GameMaintenanceScreen';
import { cn } from '../lib/utils';
import { BACCARAT_IN_MAINTENANCE } from '../lib/gameMaintenance';
import {
  useBaccaratGame,
  BACCARAT_BETTING_SECONDS,
  type BetStacks,
} from '../hooks/useBaccaratGame';
import { useAuth } from '../context/AuthContext';
import { GameCountdownBar } from '../components/games/GameCountdownBar';
import {
  BaccaratChipRail,
  BaccaratGameInfo,
  BaccaratHistoryRoad,
  BaccaratLiveBetsPanel,
  BaccaratTableStage,
  useBaccaratDealAnimation,
  type PlacedChip,
} from '../components/games/baccarat';

const EMPTY_CHIPS: Record<keyof BetStacks, PlacedChip[]> = {
  player: [],
  banker: [],
  tie: [],
};

export function BaccaratGame() {
  if (BACCARAT_IN_MAINTENANCE) {
    return (
      <Layout>
        <GameMaintenanceScreen gameName="Baccarat" />
      </Layout>
    );
  }
  return <BaccaratGameLive />;
}

function BaccaratGameLive() {
  const { isAuthenticated, openLoginModal, user } = useAuth();
  const {
    gamePhase,
    countdown,
    roundData,
    history,
    liveBets,
    selectedChip,
    setSelectedChip,
    stacks,
    acceptedBets,
    acceptedTotal,
    addChip,
    clearStacks,
    totalWagered,
    betPlaced,
    personalPayout,
    error,
    placeBet,
    canPlaceBet,
  } = useBaccaratGame();

  const [lowerTab, setLowerTab] = useState<'apostas' | 'descricao'>('apostas');
  const [placedChips, setPlacedChips] = useState(EMPTY_CHIPS);
  const chipIdRef = useRef(0);

  const balance = typeof user?.balance === 'number' ? user.balance : 0;

  const pools = useMemo<BetStacks>(
    () => ({
      player: liveBets.reduce((s, x) => s + x.bets.player, 0),
      banker: liveBets.reduce((s, x) => s + x.bets.banker, 0),
      tie: liveBets.reduce((s, x) => s + x.bets.tie, 0),
    }),
    [liveBets]
  );

  const {
    seq,
    dealProgress,
    flipProgress,
    showTotals,
    outcomeDone,
    showShufflingDeck,
  } = useBaccaratDealAnimation(roundData);

  const bettingLocked = gamePhase !== 'BETTING' || betPlaced;
  const insufficientBalance = totalWagered > balance && gamePhase === 'BETTING' && !betPlaced;

  useEffect(() => {
    if (gamePhase === 'BETTING' && !betPlaced) {
      setPlacedChips(EMPTY_CHIPS);
      setLocalWarn(null);
    }
  }, [gamePhase, betPlaced]);

  // Após aceite, limpa fichas visuais locais (acceptedBets mostra o valor)
  useEffect(() => {
    if (betPlaced) {
      setPlacedChips(EMPTY_CHIPS);
    }
  }, [betPlaced]);

  const [localWarn, setLocalWarn] = useState<string | null>(null);

  const tryAddChip = useCallback(
    (zone: keyof BetStacks) => {
      if (!isAuthenticated) {
        openLoginModal();
        return;
      }
      if (bettingLocked) return;
      const nextTotal = Math.round((totalWagered + selectedChip) * 100) / 100;
      if (nextTotal > balance) {
        setLocalWarn('Saldo insuficiente para esta ficha.');
        return;
      }
      setLocalWarn(null);
      addChip(zone);
      const id = ++chipIdRef.current;
      setPlacedChips((p) => ({
        ...p,
        [zone]: [...p[zone], { id, value: selectedChip }],
      }));
    },
    [
      isAuthenticated,
      openLoginModal,
      bettingLocked,
      totalWagered,
      selectedChip,
      balance,
      addChip,
    ]
  );

  const clearAll = useCallback(() => {
    clearStacks();
    setPlacedChips(EMPTY_CHIPS);
  }, [clearStacks]);

  const handlePlaceBet = useCallback(() => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (insufficientBalance) return;
    placeBet();
  }, [isAuthenticated, openLoginModal, insufficientBalance, placeBet]);

  const toggleFullscreen = useCallback(() => {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      void root.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  const countdownProgress =
    gamePhase === 'BETTING'
      ? Math.min(1, Math.max(0, countdown / BACCARAT_BETTING_SECONDS))
      : 0;

  return (
    <Layout>
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-0 p-2 pb-8 text-white sm:p-4">
        <div className="flex min-w-0 flex-col-reverse gap-0 overflow-hidden rounded-xl border border-tuao-dark-800 bg-blaze-panel shadow-card lg:flex-row lg:bg-tuao-dark-900">
          {/* Painel de apostas */}
          <div className="flex min-h-0 w-full shrink-0 flex-col border-t border-tuao-dark-800 bg-blaze-panel lg:w-[300px] lg:border-b-0 lg:border-r lg:border-t-0 lg:bg-tuao-dark-900">
            <div className="shrink-0 px-3 pb-1 pt-3 sm:px-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-tuao-text-secondary">
                Apostas
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(55,55,55,0.9)_transparent]">
                <BaccaratChipRail
                  selectedChip={selectedChip}
                  onSelectChip={setSelectedChip}
                  totalWagered={totalWagered}
                  acceptedTotal={acceptedTotal}
                  bettingLocked={bettingLocked}
                  canPlaceBet={canPlaceBet}
                  canClear={!bettingLocked && totalWagered > 0}
                  insufficientBalance={insufficientBalance}
                  onClear={clearAll}
                  onPlaceBet={handlePlaceBet}
                />

                {betPlaced && (
                  <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-center text-xs font-semibold text-emerald-200">
                    Aposta confirmada — aguardando a rodada
                  </p>
                )}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-tuao-dark-800 px-3 py-2.5 sm:px-4">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-800 text-tuao-text-secondary transition hover:border-tuao-primary/40 hover:text-tuao-primary"
                  aria-label="Tela cheia"
                >
                  <Maximize2 className="h-4 w-4" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => setLowerTab('descricao')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-tuao-dark-700 bg-tuao-dark-800 text-tuao-text-secondary transition hover:border-tuao-primary/40 hover:text-tuao-primary"
                  aria-label="Informações do jogo"
                >
                  <Info className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
            </div>
          </div>

          {/* Stage */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-blaze-panel lg:bg-tuao-dark-900">
            <BaccaratHistoryRoad history={history} />

            {gamePhase === 'BETTING' && (
              <div className="shrink-0 border-b border-tuao-dark-800 px-3 py-2 lg:bg-tuao-dark-950/30">
                <GameCountdownBar progress={countdownProgress}>
                  {betPlaced
                    ? `Aposta confirmada · ${countdown}s`
                    : `Apostas fecham em ${countdown}s`}
                </GameCountdownBar>
              </div>
            )}

            <div className="relative flex min-h-0 flex-1 flex-col">
              <BaccaratTableStage
                gamePhase={gamePhase}
                countdown={countdown}
                roundData={roundData}
                betPlaced={betPlaced}
                personalPayout={personalPayout}
                acceptedBets={acceptedBets}
                stacks={stacks}
                pools={pools}
                placedChips={placedChips}
                bettingLocked={bettingLocked}
                showTotals={!!showTotals}
                outcomeDone={outcomeDone}
                showShufflingDeck={
                  (gamePhase === 'BETTING' || gamePhase === 'DEALING') &&
                  showShufflingDeck
                }
                seq={seq}
                dealProgress={dealProgress}
                flipProgress={flipProgress}
                error={error || localWarn}
                onAddChip={tryAddChip}
              />
            </div>

            <div className="absolute right-3 top-[3.25rem] z-30 flex items-center gap-1.5 rounded-full border border-tuao-dark-700 bg-tuao-dark-950/80 px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm sm:top-[3.5rem]">
              <Wifi className="h-3 w-3 text-blaze-green" strokeWidth={2.5} />
              <span className="text-blaze-green">Online</span>
            </div>
          </div>
        </div>

        {/* Secção inferior */}
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
            <BaccaratLiveBetsPanel
              liveBets={liveBets}
              pools={pools}
              viewerUsername={user?.username}
              viewerXp={user?.xp}
            />
          ) : (
            <BaccaratGameInfo />
          )}
        </div>
      </div>
    </Layout>
  );
}
