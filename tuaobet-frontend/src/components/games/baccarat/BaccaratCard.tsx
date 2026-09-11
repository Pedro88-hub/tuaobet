import type { Card } from '../../../games/baccarat/types';
import tuaoLogo from '../../../assets/tuao-logo.png';

const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const suits = { hearts: 'copas', diamonds: 'ouros', clubs: 'paus', spades: 'espadas' };

export function BaccaratCard({ card, revealed, position }: { card: Card; revealed: boolean; position: number }) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';

  return (
    <div
      className={`bc-card ${revealed ? 'is-revealed' : ''}`}
      role="img"
      aria-label={revealed ? `${card.rank} de ${suits[card.suit]}` : `Carta ${position + 1} fechada`}
    >
      <div className="bc-card-turn">
        <div className="bc-card-back" aria-hidden="true">
          <span className="bc-card-back-frame">
            <img className="bc-card-back-logo" src={tuaoLogo} alt="" draggable={false} />
          </span>
          <small>TUÃOBET</small>
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
