import { RotateCcw, RotateCw, Eraser } from 'lucide-react';
import type { MutableRefObject } from 'react';
import { canAddChip, money } from '../../../games/baccarat/betting';

const chips = [50, 100, 500, 1000, 2500, 10000, 50000];

type TrayProps = {
  chip: number;
  setChip: (chip: number) => void;
  remaining: number;
  total: number;
  editable: boolean;
  authenticated: boolean;
  canRebet: boolean;
  undo: () => void;
  clear: () => void;
  rebet: () => void;
  login: () => void;
  chipRefs: MutableRefObject<Partial<Record<number, HTMLButtonElement | null>>>;
};

type WalletProps = {
  balance: number;
  total: number;
};

export function BaccaratChipTray(props: TrayProps) {
  const available = props.editable && props.authenticated;

  return (
    <div className="bc-chip-tray" aria-label="Suas apostas">
      <div className="bc-tray-row">
        <button
          type="button"
          className="bc-tray-action"
          disabled={!available || props.total === 0}
          onClick={props.undo}
          aria-label="Desfazer última ficha"
        >
          <RotateCcw size={14} />
          <span>Desfazer</span>
        </button>
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
        <button
          type="button"
          className="bc-tray-action"
          disabled={!available || !props.canRebet}
          onClick={props.rebet}
          aria-label="Reapostar última rodada"
        >
          <RotateCw size={14} />
          <span>Reapostar</span>
        </button>
      </div>
      {props.authenticated && props.remaining < 50 && (
        <p className="bc-inline-warning">Saldo abaixo do mínimo de R$ 0,50.</p>
      )}
      <div className="bc-tray-secondary">
        <button
          type="button"
          className="bc-clear-link"
          disabled={!available || props.total === 0}
          onClick={props.clear}
          aria-label="Limpar apostas"
        >
          <Eraser size={10} />
          Limpar
        </button>
        {!props.authenticated && (
          <button type="button" className="bc-deal" onClick={props.login}>
            Entrar para jogar
          </button>
        )}
      </div>
    </div>
  );
}

export function BaccaratWalletBar({ balance, total }: WalletProps) {
  return (
    <div className="bc-wallet-bar" aria-label="Resumo da carteira">
      <span>
        Saldo <strong>{money(balance)}</strong>
      </span>
      <span>
        Aposta total <strong>{money(total)}</strong>
      </span>
    </div>
  );
}

/** @deprecated Prefer BaccaratChipTray + BaccaratWalletBar */
export function BaccaratBetPanel(props: TrayProps & WalletProps) {
  return (
    <section className="bc-betting" aria-label="Suas apostas">
      <BaccaratChipTray {...props} />
      <BaccaratWalletBar balance={props.balance} total={props.total} />
    </section>
  );
}
