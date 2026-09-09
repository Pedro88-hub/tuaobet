type CoinBurstDirection = 'out' | 'in';

export type CoinBurstDetail = {
  direction: CoinBurstDirection;
  count?: number;
};

type GameFxListener = (detail: CoinBurstDetail) => void;

const listeners = new Set<GameFxListener>();

export function onCoinBurst(listener: GameFxListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitCoinBurst(detail: CoinBurstDetail) {
  for (const listener of listeners) {
    listener(detail);
  }
}

export function rectCenter(el: Element | null): { x: number; y: number } | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function getWalletBalanceEl(): Element | null {
  return document.querySelector('[data-wallet-balance]');
}

export function getCrashBetAnchorEl(): Element | null {
  return document.querySelector('[data-crash-bet-anchor]');
}
