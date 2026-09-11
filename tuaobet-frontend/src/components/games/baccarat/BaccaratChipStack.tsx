import { money } from '../../../games/baccarat/betting';
import { stackFromPlacements, type LivePlacement } from '../../../games/baccarat/live';

type Props = {
  placements: LivePlacement[];
};

export function BaccaratChipStack({ placements }: Props) {
  if (placements.length === 0) return null;
  const { visible, overflow } = stackFromPlacements(placements);
  const personal = placements.reduce((sum, item) => sum + item.cents, 0);

  return (
    <span className="bc-chip-stack" aria-label={`Suas fichas ${money(personal)}`}>
      {overflow > 0 && <i className="bc-chip-overflow">+{overflow}</i>}
      {visible.map((chip, index) => (
        <i
          key={chip.id}
          className={`bc-area-chip bc-chip-${chip.index}`}
          style={{ zIndex: index + 1 }}
          aria-hidden="true"
        >
          {chip.cents === 50 ? '0,50' : chip.cents / 100}
        </i>
      ))}
    </span>
  );
}
