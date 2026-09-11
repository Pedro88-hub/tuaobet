import { canAddChip, dealSequence, money, visibleTotal } from '../../../games/baccarat/betting';
import { SIDE_LABELS, type Bets, type Round, type Side, type Status } from '../../../games/baccarat/types';
import { BaccaratCard } from './BaccaratCard';
import type { MutableRefObject } from 'react';

type Props = {
  round: Round | null;
  status: Status;
  shown: number;
  arrived: number;
  bets: Bets;
  chip: number;
  remaining: number;
  editable: boolean;
  authenticated: boolean;
  place: (side: Side) => void;
  areaRefs: MutableRefObject<Partial<Record<Side, HTMLButtonElement | null>>>;
};

const ODDS: Record<Side, string> = { player: '2×', tie: '9×', banker: '1,95×' };

export function BaccaratTable({
  round,
  status,
  shown,
  arrived,
  bets,
  chip,
  remaining,
  editable,
  authenticated,
  place,
  areaRefs,
}: Props) {
  const sequence = round ? dealSequence(round) : [];
  const complete = status === 'result';
  const available = editable && authenticated;

  return (
    <section className="bc-table" aria-label="Mesa de baccarat">
      <div className="bc-table-inner">
        <div className="bc-table-top">
          <span>✦ PUNTO BANCO</span>
          <span>8 BARALHOS</span>
        </div>
        <div className={`bc-shoe ${status === 'dealing' ? 'is-dealing' : ''}`} aria-label="Shoe de oito baralhos">
          <div className="bc-shoe-stack" />
          <div className="bc-shoe-lid">♠</div>
        </div>
        <div className="bc-table-brand" aria-hidden="true">
          <span>TUÃOBET ORIGINAL</span>
          <strong>BACCARAT</strong>
          <i>◆</i>
        </div>
        <div className="bc-hands">
          {(['player', 'banker'] as const).map((side) => {
            const visible = sequence.filter((item, index) => item.side === side && index < shown).map((item) => item.card);
            const cards = sequence
              .map((item, index) => ({ ...item, order: index }))
              .filter((item) => item.side === side && item.order < arrived);
            const winning = complete && round?.winner === side;
            return (
              <div className={`bc-hand ${winning ? 'is-winner' : ''}`} key={side}>
                <div className="bc-hand-heading">
                  <span>{SIDE_LABELS[side]}</span>
                  <b aria-label={`Pontos da ${SIDE_LABELS[side]}: ${visible.length ? visibleTotal(visible) : 'sem cartas'}`}>
                    {visible.length ? visibleTotal(visible) : '—'}
                  </b>
                </div>
                <div className="bc-card-slots">
                  {[0, 1, 2].map((index) => (
                    <div className="bc-card-slot" key={index}>
                      {cards.find((item) => item.index === index)
                        ? (() => {
                            const item = cards.find((item) => item.index === index)!;
                            return (
                              <BaccaratCard
                                key={`${round?.roundId}-${index}`}
                                card={item.card}
                                revealed={item.order < shown}
                                position={index}
                              />
                            );
                          })()
                        : (
                          <span aria-hidden="true">{index === 2 ? 'Ⅲ' : '♠'}</span>
                        )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className={`bc-result ${complete ? 'is-complete' : ''}`} aria-live="polite" aria-atomic="true">
          {complete && round ? (
            <>
              <strong>{round.winner === 'tie' ? 'Empate' : `${SIDE_LABELS[round.winner]} vence`}</strong>
              <span>
                Retorno total {money(Math.round(round.totalPayout * 100))} <i>·</i> Aposta{' '}
                {money(Math.round(round.totalStake * 100))}
              </span>
            </>
          ) : (
            <>
              <strong>
                {status === 'submitting'
                  ? 'Confirmando sua aposta…'
                  : status === 'recovering'
                    ? 'Recuperando sua rodada…'
                    : status === 'dealing'
                      ? 'Distribuindo as cartas…'
                      : 'A mesa é sua.'}
              </strong>
              <span>
                {status === 'betting'
                  ? 'Escolha uma ficha e clique na área da mesa.'
                  : 'Aguarde a conclusão desta rodada.'}
              </span>
            </>
          )}
        </div>
        <div className="bc-bet-areas">
          {(['player', 'tie', 'banker'] as const).map((side) => (
            <button
              type="button"
              key={side}
              ref={(node) => {
                areaRefs.current[side] = node;
              }}
              className={`bc-bet-area bc-${side} ${bets[side] ? 'has-bet' : ''}`}
              disabled={!available || !canAddChip(chip, remaining)}
              onClick={() => place(side)}
              aria-label={`Adicionar ${money(chip)} em ${SIDE_LABELS[side]}. Apostado ${money(bets[side])}`}
            >
              <span className="bc-area-label">
                {SIDE_LABELS[side]} <small>{ODDS[side]}</small>
              </span>
              <span className="bc-area-stake">
                {bets[side] > 0 ? (
                  <>
                    <i className="bc-mini-chip" aria-hidden="true">
                      ♠
                    </i>
                    {money(bets[side])}
                  </>
                ) : (
                  <i className="bc-plus" aria-hidden="true">
                    +
                  </i>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
