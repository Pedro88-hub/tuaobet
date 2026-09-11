import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useBaccaratGame } from '../hooks/useBaccaratGame';
import { BaccaratTable } from '../components/games/baccarat/BaccaratTable';
import { BaccaratChipTray, BaccaratWalletBar } from '../components/games/baccarat/BaccaratBetPanel';
import { flyChip } from '../components/games/baccarat/flyChip';
import type { Side } from '../games/baccarat/types';
import '../components/games/baccarat/baccarat.css';

export function BaccaratGame() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const game = useBaccaratGame();
  const areaRefs = useRef<Partial<Record<Side, HTMLButtonElement | null>>>({});
  const chipRefs = useRef<Partial<Record<number, HTMLButtonElement | null>>>({});
  const [timeLeft, setTimeLeft] = useState(game.countdown);

  useEffect(() => {
    if (game.phase !== 'BETTING') {
      setTimeLeft(0);
      return;
    }
    setTimeLeft((prev) => {
      if (game.countdown <= 0) return 0;
      if (Math.abs(prev - game.countdown) > 1.2) return game.countdown;
      if (prev > game.countdown + 0.35) return game.countdown;
      return prev;
    });
  }, [game.countdown, game.phase]);

  useEffect(() => {
    if (game.phase !== 'BETTING') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 0.02));
    }, 20);
    return () => clearInterval(interval);
  }, [game.phase, game.roundId]);

  function place(side: Side) {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    const from = chipRefs.current[game.chip] ?? document.querySelector<HTMLElement>('.bc-chip.is-selected');
    const to = areaRefs.current[side];
    if (from && to) flyChip(from, to);
    game.place(side);
  }

  return (
    <Layout>
      <main className="bc-page">
        <header className="bc-page-heading">
          <div>
            <Link to="/" className="bc-back">
              <ChevronLeft size={14} /> Originais TuãoBet
            </Link>
            <h1>
              Baccarat <span>AO VIVO</span>
            </h1>
          </div>
          <span className="bc-header-detail">
            <ShieldCheck size={15} /> Rodadas globais
          </span>
        </header>
        <div className="bc-game-shell">
          <BaccaratTable
            outcome={game.outcome}
            status={game.status}
            shown={game.shown}
            arrived={game.arrived}
            bets={game.bets}
            totals={game.totals}
            placements={game.placements}
            history={game.history}
            chip={game.chip}
            remaining={game.remaining}
            editable={game.editable}
            authenticated={isAuthenticated}
            countdown={timeLeft}
            place={place}
            areaRefs={areaRefs}
            chipTray={
              <BaccaratChipTray
                chip={game.chip}
                setChip={game.setChip}
                remaining={game.remaining}
                total={game.total}
                editable={game.editable}
                authenticated={isAuthenticated}
                canRebet={game.canRebet}
                undo={game.undo}
                clear={game.clear}
                rebet={game.rebet}
                login={openLoginModal}
                chipRefs={chipRefs}
              />
            }
            walletBar={<BaccaratWalletBar balance={game.balance} total={game.total} />}
          />
          {game.error && (
            <div className="bc-error" role="alert">
              <span>{game.error}</span>
            </div>
          )}
        </div>
        <details className="bc-rules">
          <summary>
            Como jogar e regras da mesa <span>+</span>
          </summary>
          <div>
            <p>
              Escolha uma ficha e clique em Jogador, Banca ou Empate. Cada clique aposta imediatamente. Você pode
              apostar nas três áreas e empilhar várias fichas enquanto a contagem estiver aberta. Desfazer remove a
              última ficha; Limpar reembolsa todas; Reapostar repete as apostas da rodada anterior. Ações de
              reembolso e reaposta só na janela de apostas. As cartas saem automaticamente a cada rodada.
            </p>
            <p>
              <strong>Cartas e pontuação.</strong> Cada rodada usa oito baralhos completos (416 cartas), embaralhados
              novamente pelo servidor, sem reposição dentro da rodada. Ás vale 1; 2 a 9 têm seu valor; 10, J, Q e K
              valem zero. A soma usa apenas o último algarismo. A mão mais próxima de 9 vence.
            </p>
            <p>
              <strong>Distribuição.</strong> A ordem é Jogador, Banca, Jogador, Banca. Um total inicial de 8 ou 9
              (natural) encerra a compra para ambos. Sem natural, Jogador compra com 0–5 e para com 6–7. Se Jogador
              parou, Banca compra com 0–5. Se Jogador comprou, Banca compra com 0–2; com 3, exceto contra terceira carta
              8; com 4, contra 2–7; com 5, contra 4–7; com 6, contra 6–7; com 7, para.
            </p>
            <p>
              <strong>Retornos, incluindo a aposta inicial.</strong> Jogador paga 2× (1:1); Banca, 1,95× (0,95:1, 5%
              de comissão sobre o lucro); Empate, 9× (8:1). No empate, as apostas em Jogador e Banca são devolvidas
              integralmente (1×, sem lucro ou perda). Cada ficha é liquidada em centavos; o retorno da Banca é
              arredondado ao centavo mais próximo, com meio centavo para cima. Exemplo: R$ 0,50 na Banca retorna R$
              0,98 quando vence.
            </p>
            <p>
              Os totais nas áreas incluem o volume da mesa. Somente as suas fichas reais entram na carteira. Os
              roadmaps abaixo mostram o histórico da mesa ao vivo.
            </p>
            <p>
              Referências:{' '}
              <a href="https://www.pokerstars.com/casino/how-to-play/baccarat/" target="_blank" rel="noreferrer">
                Regras de baccarat — PokerStars
              </a>{' '}
              ·{' '}
              <a
                href="https://www.venetianlasvegas.com/content/dam/vlvweb/casino/table-games/VP-Gaming-Guide.pdf"
                target="_blank"
                rel="noreferrer"
              >
                Guia de jogos — The Venetian
              </a>
              .
            </p>
          </div>
        </details>
      </main>
    </Layout>
  );
}
