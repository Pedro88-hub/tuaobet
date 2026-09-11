import type { LiveHistoryItem } from '../../../games/baccarat/live';
import {
  BEAD_ROWS,
  BIG_ROWS,
  ROAD_LETTER,
  buildBeadPlate,
  buildBigRoad,
  countWinners,
} from '../../../games/baccarat/roads';
import { SIDE_LABELS } from '../../../games/baccarat/types';

type Props = {
  history: LiveHistoryItem[];
};

export function BaccaratRoads({ history }: Props) {
  const bead = buildBeadPlate(history);
  const big = buildBigRoad(history);
  const counts = countWinners(history);

  return (
    <section className="bc-roads" aria-label="Roadmaps da mesa">
      <div className="bc-road bc-bead" aria-label="Bead plate">
        <header className="bc-road-header">
          <strong>#{history[0]?.roundId ?? '—'}</strong>
          <span>
            <i className="bc-road-tag bc-banker">B</i> {counts.banker}
          </span>
          <span>
            <i className="bc-road-tag bc-player">P</i> {counts.player}
          </span>
          <span>
            <i className="bc-road-tag bc-tie">T</i> {counts.tie}
          </span>
        </header>
        <div
          className="bc-road-grid bc-bead-grid"
          style={{ gridTemplateColumns: `repeat(${Math.max(bead.length, 1)}, 1fr)` }}
          role="list"
        >
          {bead.map((column, colIndex) => (
            <div className="bc-road-col" key={`bead-col-${colIndex}`} role="presentation">
              {Array.from({ length: BEAD_ROWS }, (_, rowIndex) => {
                const cell = column[rowIndex];
                if (!cell) {
                  return <span className="bc-road-cell is-empty" key={`bead-${colIndex}-${rowIndex}`} />;
                }
                return (
                  <span
                    className={`bc-road-cell bc-bead-cell bc-${cell.winner}`}
                    key={cell.key}
                    role="listitem"
                    title={SIDE_LABELS[cell.winner]}
                  >
                    {ROAD_LETTER[cell.winner]}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="bc-road bc-big-road" aria-label="Big road">
        <header className="bc-road-header">
          <span className="bc-dragon bc-player">Dragão azul</span>
          <span className="bc-dragon bc-banker">Dragão vermelho</span>
        </header>
        <div
          className="bc-road-grid bc-big-grid"
          style={{ gridTemplateColumns: `repeat(${Math.max(big.length, 1)}, 1fr)` }}
          role="list"
        >
          {big.map((column, colIndex) => (
            <div className="bc-road-col" key={`big-col-${colIndex}`} role="presentation">
              {Array.from({ length: BIG_ROWS }, (_, rowIndex) => {
                const cell = column[rowIndex];
                if (!cell) {
                  return <span className="bc-road-cell is-empty" key={`big-${colIndex}-${rowIndex}`} />;
                }
                return (
                  <span
                    className={`bc-road-cell bc-big-cell bc-${cell.winner}`}
                    key={cell.key}
                    role="listitem"
                    title={SIDE_LABELS[cell.winner]}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
