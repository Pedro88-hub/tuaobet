import { BETTING_SECONDS } from '../../../games/baccarat/live';
import { SIDE_LABELS, type Outcome, type Status } from '../../../games/baccarat/types';

const RING_SIZE = 72;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type Props = {
  status: Status;
  countdown: number;
  outcome: Outcome | null;
};

export function BaccaratPhaseHud({ status, countdown, outcome }: Props) {
  const betting = status === 'betting' || status === 'submitting';
  const complete = status === 'result';
  const open = betting && countdown > 0;
  const seconds = Math.max(0, Math.ceil(countdown));
  const progress = Math.min(1, Math.max(0, countdown / BETTING_SECONDS));
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  let title = 'Apostas encerradas';
  let tone: 'open' | 'closed' | 'result' = 'closed';

  if (complete && outcome) {
    tone = 'result';
    title = outcome.winner === 'tie' ? 'Empate' : `${SIDE_LABELS[outcome.winner]} vence`;
  } else if (open) {
    tone = 'open';
    title = 'Apostas abertas';
  }

  return (
    <div className={`bc-phase-hud is-${tone}`} aria-live="polite" aria-atomic="true">
      {open && (
        <div className="bc-phase-timer" role="timer" aria-label={`Tempo restante ${seconds} segundos`}>
          <svg className="bc-phase-ring" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} aria-hidden="true">
            <circle
              className="bc-phase-ring-track"
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
            />
            <circle
              className="bc-phase-ring-progress"
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </svg>
          <strong className="bc-phase-seconds">{seconds}</strong>
        </div>
      )}
      <p className={`bc-phase-status is-${tone}`}>
        <strong>{title}</strong>
      </p>
    </div>
  );
}
