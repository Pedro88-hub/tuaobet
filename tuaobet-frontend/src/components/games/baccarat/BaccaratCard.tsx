import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { Card } from '../../../games/baccarat/types';
import cardBack from '../../../assets/baccarat/card-back.jpg';
import { dealOffset } from './dealOffset';

const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const suits = { hearts: 'copas', diamonds: 'ouros', clubs: 'paus', spades: 'espadas' };

type Props = {
  card: Card;
  revealed: boolean;
  position: number;
  shoeRef: RefObject<HTMLElement | null>;
  instant?: boolean;
};

export function BaccaratCard({ card, revealed, position, shoeRef, instant = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dealReady, setDealReady] = useState(false);
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const skipMotion =
    instant ||
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useLayoutEffect(() => {
    if (skipMotion || dealReady) return;
    const node = rootRef.current;
    const shoe = shoeRef.current;
    const slot = node?.parentElement;
    if (!node || !shoe || !slot) return;

    // Measure the untransformed slot — not the card (animation fill would skew rects).
    const { x, y } = dealOffset(shoe, slot);
    node.style.setProperty('--bc-deal-x', `${x}px`);
    node.style.setProperty('--bc-deal-y', `${y}px`);
    setDealReady(true);
  }, [shoeRef, skipMotion, dealReady]);

  return (
    <div
      ref={rootRef}
      className={`bc-card ${revealed ? 'is-revealed' : ''} ${skipMotion ? 'is-instant' : ''} ${dealReady ? 'is-dealing-in' : ''}`}
      role="img"
      aria-label={revealed ? `${card.rank} de ${suits[card.suit]}` : `Carta ${position + 1} fechada`}
    >
      <div className="bc-card-turn">
        <div className="bc-card-back" aria-hidden="true">
          <img className="bc-card-back-art" src={cardBack} alt="" draggable={false} />
        </div>
        <div className={`bc-card-front ${isRed ? 'is-red' : ''}`} aria-hidden="true">
          {revealed && (
            <>
              <span className="bc-card-corner">
                {card.rank}
                <i>{symbols[card.suit]}</i>
              </span>
              <b>{symbols[card.suit]}</b>
              <span className="bc-card-corner bottom">
                {card.rank}
                <i>{symbols[card.suit]}</i>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
