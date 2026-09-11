import type { Card } from '../../../games/baccarat/types';
const symbols={hearts:'♥',diamonds:'♦',clubs:'♣',spades:'♠'};
const suits={hearts:'copas',diamonds:'ouros',clubs:'paus',spades:'espadas'};
export function BaccaratCard({card,revealed,position}:{card:Card;revealed:boolean;position:number}) {
  return <div className={`bc-card ${revealed?'is-revealed':''}`} role="img" aria-label={revealed?`${card.rank} de ${suits[card.suit]}`:`Carta ${position+1} fechada`}>
    <div className="bc-card-turn">
      <div className="bc-card-back" aria-hidden="true"><span>♠</span><small>TUÃOBET</small></div>
      <div className={`bc-card-front ${card.suit==='hearts'||card.suit==='diamonds'?'is-red':''}`} aria-hidden="true">
        {revealed && <><span className="bc-card-corner">{card.rank}<i>{symbols[card.suit]}</i></span><b>{symbols[card.suit]}</b><span className="bc-card-corner bottom">{card.rank}<i>{symbols[card.suit]}</i></span></>}
      </div>
    </div>
  </div>;
}
