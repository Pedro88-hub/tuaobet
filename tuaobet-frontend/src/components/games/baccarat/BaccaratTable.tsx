import { useRef, type MutableRefObject, type ReactNode } from 'react';
import shoeDeck from '../../../assets/baccarat/shoe-deck.png';
import { canAddChip, dealSequence, money, visibleTotal } from '../../../games/baccarat/betting';
import type { AreaTotals, LivePlacement } from '../../../games/baccarat/live';
import { SIDE_LABELS, type Outcome, type Side, type Status } from '../../../games/baccarat/types';
import { BaccaratCard } from './BaccaratCard';
import { BaccaratChipStack } from './BaccaratChipStack';
import { BaccaratPhaseHud } from './BaccaratPhaseHud';

type Props = {
  outcome: Outcome | null;
  status: Status;
  shown: number;
  arrived: number;
  bets: Record<Side, number>;
  totals: AreaTotals;
  placements: LivePlacement[];
  chip: number;
  remaining: number;
  editable: boolean;
  authenticated: boolean;
  countdown: number;
  place: (side: Side) => void;
  areaRefs: MutableRefObject<Partial<Record<Side, HTMLButtonElement | null>>>;
  chipTray?: ReactNode;
  walletBar?: ReactNode;
};

/** Casino-style net odds labels (payouts unchanged: 2× / 9× / 1,95×). */
const ODDS: Record<Side, string> = { player: '1:1', tie: '8:1', banker: '0,95:1' };

function volumeShare(amount: number, tableTotal: number): number {
  if (tableTotal <= 0) return 0;
  return Math.round((amount / tableTotal) * 100);
}

export function BaccaratTable({
  outcome,
  status,
  shown,
  arrived,
  bets,
  totals,
  placements,
  chip,
  remaining,
  editable,
  authenticated,
  countdown,
  place,
  areaRefs,
  chipTray,
  walletBar,
}: Props) {
  const shoeRef = useRef<HTMLDivElement>(null);
  const sequence = outcome ? dealSequence(outcome) : [];
  const complete = status === 'result';
  const available = editable && authenticated;
  const tableVolume =
    totals.player.amount + totals.banker.amount + totals.tie.amount;

  return (
    <section className="bc-table" aria-label="Mesa de baccarat">
      <div className="bc-table-inner">
        <div className="bc-table-top">
          <span>✦ PUNTO BANCO</span>
          <span>8 BARALHOS</span>
        </div>
        <div
          ref={shoeRef}
          className={`bc-shoe ${status === 'dealing' ? 'is-dealing' : ''}`}
          role="img"
          aria-label="Shoe de oito baralhos"
        >
          <img src={shoeDeck} alt="" draggable={false} />
        </div>
        <div className="bc-table-brand" aria-hidden="true">
          <span>TUÃOBET ORIGINAL</span>
          <strong>BACCARAT</strong>
        </div>
        <div className="bc-hands">
          {(['player', 'banker'] as const).map((side) => {
            const visible = sequence.filter((item, index) => item.side === side && index < shown).map((item) => item.card);
            const cards = sequence
              .map((item, index) => ({ ...item, order: index }))
              .filter((item) => item.side === side && item.order < arrived);
            const winning = complete && outcome?.winner === side;
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
                                key={`${side}-${index}-${item.card.rank}-${item.card.suit}`}
                                card={item.card}
                                revealed={item.order < shown}
                                position={index}
                                shoeRef={shoeRef}
                                instant={complete}
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
        <BaccaratPhaseHud status={status} countdown={countdown} outcome={outcome} />
        {chipTray}
        <div className="bc-bet-areas">
          {(['player', 'tie', 'banker'] as const).map((side) => {
            const mine = placements.filter((item) => item.side === side);
            const table = totals[side];
            const percent = volumeShare(table.amount, tableVolume);
            return (
              <button
                type="button"
                key={side}
                ref={(node) => {
                  areaRefs.current[side] = node;
                }}
                className={`bc-bet-area bc-${side} ${mine.length ? 'has-bet' : ''}`}
                disabled={!available || !canAddChip(chip, remaining)}
                onClick={() => place(side)}
                aria-label={`Adicionar ${money(chip)} em ${SIDE_LABELS[side]}. Mesa ${money(Math.round(table.amount * 100))}. Apostado ${money(bets[side])}`}
              >
                <span className="bc-area-label">
                  {SIDE_LABELS[side]}
                  <small>{ODDS[side]}</small>
                </span>
                <span className="bc-area-meta">
                  <span className="bc-area-pct">{percent}%</span>
                  <span className="bc-area-total">
                    {money(Math.round(table.amount * 100))}
                    <small>{table.count}</small>
                  </span>
                </span>
                <span className="bc-area-stake">
                  {mine.length > 0 ? (
                    <BaccaratChipStack placements={mine} />
                  ) : (
                    <i className="bc-plus" aria-hidden="true">
                      +
                    </i>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {walletBar}
      </div>
    </section>
  );
}
