import { RotateCcw, Trash2, ArrowRight } from 'lucide-react';
import { useState, type MutableRefObject } from 'react';
import { canAddChip, money, parseChipCents } from '../../../games/baccarat/betting';

const chips = [50, 100, 500, 1000, 2500, 10000, 50000];

type Props = {
  chip: number;
  setChip: (chip: number) => void;
  remaining: number;
  total: number;
  balance: number;
  editable: boolean;
  authenticated: boolean;
  canSubmit: boolean;
  undo: () => void;
  clear: () => void;
  submit: () => void;
  login: () => void;
  chipRefs: MutableRefObject<Partial<Record<number, HTMLButtonElement | null>>>;
};

export function BaccaratBetPanel(props: Props) {
  const [custom, setCustom] = useState('');
  const customCents = parseChipCents(custom);
  const available = props.editable && props.authenticated;

  return (
    <section className="bc-betting" aria-label="Suas apostas">
      <div className="bc-controls">
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
        <div className="bc-custom">
          <label htmlFor="baccarat-custom-chip">
            Outro valor <span>R$</span>
          </label>
          <input
            id="baccarat-custom-chip"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,50"
            value={custom}
            disabled={!available}
            onChange={(event) => setCustom(event.target.value)}
            aria-invalid={Boolean(custom) && customCents === null}
            aria-describedby="baccarat-chip-help"
          />
          <button
            type="button"
            disabled={!available || customCents === null || !canAddChip(customCents, props.remaining)}
            onClick={() => customCents !== null && props.setChip(customCents)}
          >
            Usar ficha
          </button>
        </div>
        <p id="baccarat-chip-help" className="bc-chip-help">
          {custom && customCents === null
            ? 'Use no máximo 2 casas decimais. Mínimo R$ 0,50.'
            : `Ficha selecionada: ${money(props.chip)} · mínimo R$ 0,50 por área`}
        </p>
        <div className="bc-wallet">
          <div>
            <span>Saldo</span>
            <strong>{money(props.balance)}</strong>
          </div>
          <div>
            <span>Apostado</span>
            <strong>{money(props.total)}</strong>
          </div>
          <div>
            <span>Disponível</span>
            <strong>{money(props.remaining)}</strong>
          </div>
        </div>
        {props.total > props.balance && (
          <p className="bc-inline-warning" role="status">
            Seu saldo mudou. Desfaça ou limpe as fichas para ajustar a aposta.
          </p>
        )}
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
          <button
            type="button"
            className="bc-deal"
            disabled={props.authenticated && !props.canSubmit}
            onClick={props.authenticated ? props.submit : props.login}
          >
            {props.authenticated ? 'Distribuir cartas' : 'Entrar para jogar'}
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
