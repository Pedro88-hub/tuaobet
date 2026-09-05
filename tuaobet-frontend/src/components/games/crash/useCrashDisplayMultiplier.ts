import { useState, useEffect, useRef } from 'react';
import type { GameState } from '../../../hooks/useCrashGame';

const SMOOTH_LAMBDA = 32;

/**
 * Interpola o multiplicador entre ticks do servidor (~50 ms) para animação fluida (60 fps).
 * A lógica de cashout continua a usar o valor vindo do socket.
 */
export function useCrashDisplayMultiplier(multiplier: number, gameState: GameState): number {
  const [smooth, setSmooth] = useState(multiplier);
  const targetRef = useRef(multiplier);
  targetRef.current = multiplier;

  useEffect(() => {
    if (gameState !== 'RUNNING') {
      setSmooth(multiplier);
    }
  }, [multiplier, gameState]);

  useEffect(() => {
    if (gameState !== 'RUNNING') return;

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = targetRef.current;

      setSmooth((prev) => {
        const delta = target - prev;
        if (Math.abs(delta) < 1e-7) return prev;
        const t = 1 - Math.exp(-SMOOTH_LAMBDA * dt);
        return prev + delta * t;
      });

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameState]);

  return gameState === 'RUNNING' ? smooth : multiplier;
}
