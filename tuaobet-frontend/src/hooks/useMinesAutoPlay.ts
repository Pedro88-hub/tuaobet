import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from './useMinesGame';

type UseMinesAutoPlayArgs = {
  enabled: boolean;
  gameState: GameState;
  revealed: boolean[];
  autoBetCount: string;
  autoTilesCount: string;
  beginRound: () => void;
  revealCell: (index: number) => void;
  cashout: () => void;
};

/**
 * Loop de auto-play: reinicia após fim de rodada, revela tiles aleatórios
 * até o alvo e faz cashout. O servidor já liquida vitória no último safe.
 */
export function useMinesAutoPlay({
  enabled,
  gameState,
  revealed,
  autoBetCount,
  autoTilesCount,
  beginRound,
  revealCell,
  cashout,
}: UseMinesAutoPlayArgs) {
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [roundsPlayed, setRoundsPlayed] = useState(0);

  const autoPlayRef = useRef(false);
  const gameStateRef = useRef(gameState);
  const beginRoundRef = useRef(beginRound);
  const revealCellRef = useRef(revealCell);
  const cashoutRef = useRef(cashout);

  useEffect(() => {
    autoPlayRef.current = isAutoPlaying;
  }, [isAutoPlaying]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    beginRoundRef.current = beginRound;
  }, [beginRound]);

  useEffect(() => {
    revealCellRef.current = revealCell;
  }, [revealCell]);

  useEffect(() => {
    cashoutRef.current = cashout;
  }, [cashout]);

  useEffect(() => {
    if (!enabled && isAutoPlaying) {
      setIsAutoPlaying(false);
      setRoundsPlayed(0);
    }
  }, [enabled, isAutoPlaying]);

  const stopAuto = useCallback(() => {
    setIsAutoPlaying(false);
    setRoundsPlayed(0);
  }, []);

  const toggleAutoPlay = useCallback(() => {
    if (isAutoPlaying) {
      stopAuto();
      return;
    }
    setIsAutoPlaying(true);
    setRoundsPlayed(0);
    if (gameState === 'IDLE' || gameState === 'GAME_OVER' || gameState === 'CASHOUT') {
      beginRoundRef.current();
    }
  }, [isAutoPlaying, stopAuto, gameState]);

  // Próxima rodada após fim
  useEffect(() => {
    if (!isAutoPlaying) return;
    if (gameState !== 'GAME_OVER' && gameState !== 'CASHOUT') return;

    const maxRounds = parseInt(autoBetCount.trim(), 10);
    const currentRounds = roundsPlayed + 1;

    if (Number.isFinite(maxRounds) && maxRounds > 0 && currentRounds >= maxRounds) {
      stopAuto();
      return;
    }

    setRoundsPlayed(currentRounds);
    const timeout = setTimeout(() => {
      if (autoPlayRef.current) beginRoundRef.current();
    }, 1500);
    return () => clearTimeout(timeout);
  }, [gameState, isAutoPlaying, autoBetCount, roundsPlayed, stopAuto]);

  // Revelar tiles / cashout durante PLAYING
  useEffect(() => {
    if (!isAutoPlaying || gameState !== 'PLAYING') return;

    const revealedCount = revealed.filter((r) => r).length;
    const targetTiles = parseInt(autoTilesCount.trim(), 10);
    if (!Number.isFinite(targetTiles) || targetTiles < 1) return;

    if (revealedCount < targetTiles) {
      const unrevealedIndices = revealed
        .map((r, i) => (!r ? i : -1))
        .filter((i) => i !== -1);
      if (unrevealedIndices.length === 0) return;

      const randomIndex =
        unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)]!;
      const timer = setTimeout(() => {
        if (autoPlayRef.current && gameStateRef.current === 'PLAYING') {
          revealCellRef.current(randomIndex);
        }
      }, 400);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      if (autoPlayRef.current && gameStateRef.current === 'PLAYING') {
        cashoutRef.current();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [gameState, isAutoPlaying, revealed, autoTilesCount]);

  return {
    isAutoPlaying,
    roundsPlayed,
    toggleAutoPlay,
    stopAuto,
  };
}
