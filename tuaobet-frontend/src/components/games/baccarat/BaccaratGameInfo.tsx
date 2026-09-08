import { BACCARAT_ODDS } from '../../../hooks/useBaccaratGame';

export function BaccaratGameInfo() {
  return (
    <div className="max-w-2xl space-y-4 p-6 text-sm leading-relaxed text-tuao-text-secondary">
      <p>
        No <span className="font-semibold text-white">Baccarat</span> (Punto Banco) apostas em{' '}
        <span className="font-semibold text-blue-200">Jogador</span>,{' '}
        <span className="font-semibold text-red-200">Banca</span> ou{' '}
        <span className="font-semibold text-emerald-200">Empate</span> antes das cartas serem
        distribuídas. Ganha a mão com total mais próximo de 9 (só o dígito das unidades conta).
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Jogador paga <span className="font-semibold text-white">{BACCARAT_ODDS.player}</span>
        </li>
        <li>
          Banca paga <span className="font-semibold text-white">{BACCARAT_ODDS.banker}</span>{' '}
          (comissão de 5%)
        </li>
        <li>
          Empate paga <span className="font-semibold text-white">{BACCARAT_ODDS.tie}</span>
        </li>
        <li>
          Se sair empate, apostas em Jogador/Banca são{' '}
          <span className="font-semibold text-white">devolvidas (push)</span>
        </li>
      </ul>
      <p>
        Seleciona uma ficha, toca nas zonas para montar a aposta e confirma com{' '}
        <span className="font-semibold text-white">Apostar</span>. Só é permitida uma aposta por
        ronda.
      </p>
    </div>
  );
}
