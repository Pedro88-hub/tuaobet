import { RotateCcw, Trash2 } from 'lucide-react';
import type { MutableRefObject } from 'react';
import { canAddChip, money } from '../../../games/baccarat/betting';

const chips = [50, 100, 500, 1000, 2500, 10000, 50000];

type Props = {
  chip: number;
  setChip: (chip: number) => void;
  remaining: number;
  total: number;
  balance: number;
  editable: boolean;
  authenticated: boolean;
  undo: () => void;
  clear: () => void;
  login: () => void;
  chipRefs: MutableRefObject<Partial<Record<number, HTMLButtonElement | null>>>;
};

export function BaccaratBetPanel(props: Props) {
  const available = props.editable && props.authenticated;

  return (
    <section className="bc-betting" aria-label="Suas apostas">
      <div className="bc-controls">
        <div className="bc-wallet" aria-label="Resumo da carteira">
          <span>
            Saldo <strong>{money(props.balance)}</strong>
          </span>
          <span>
            Apostado <strong>{money(props.total)}</strong>
          </span>
        </div>
        <div className="bc-chip-heading">
          <span>
            01 <b>Escolha sua ficha</b>
          </span>
          <small>Valores em reais</small>
        </div>
        <div className="bc-chips" role="group" aria-label="Valor da ficha">
          {chips.map((chip, index) => (
            <button
              type="button"
              key={chip}
              ref={(node) => {
                props.chipRefs.current[chip] = node;
              }}
              className={`bc-chip bc-chip-${index} ${props.chip === chip ? 'is-selected' : ''}`}
              aria-label={`Ficha de ${money(chip)}`}
              aria-pressed={props.chip === chip}
              disabled={!available || !canAddChip(chip, props.remaining)}
              onClick={() => props.setChip(chip)}
            >
              <span>{chip === 50 ? '0,50' : chip / 100}</span>
            </button>
          ))}
        </div>
        {props.authenticated && props.balance < 50 && (
          <p className="bc-inline-warning">Saldo abaixo do mínimo de R$ 0,50.</p>
        )}
        <div className="bc-actions">
          <button
            type="button"
            className="bc-icon-action"
            disabled={!available || props.total === 0}
            onClick={props.undo}
            aria-label="Desfazer última ficha"
          >
            <RotateCcw size={17} />
            <span>Desfazer</span>
          </button>
          <button
            type="button"
            className="bc-icon-action"
            disabled={!available || props.total === 0}
            onClick={props.clear}
            aria-label="Limpar apostas"
          >
            <Trash2 size={17} />
            <span>Limpar</span>
          </button>
          {!props.authenticated && (
            <button type="button" className="bc-deal" onClick={props.login}>
              Entrar para jogar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
