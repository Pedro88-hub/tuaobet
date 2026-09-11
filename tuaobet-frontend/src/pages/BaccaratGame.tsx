import { ChevronLeft, ShieldCheck, History } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useBaccaratGame } from '../hooks/useBaccaratGame';
import { BaccaratTable } from '../components/games/baccarat/BaccaratTable';
import { BaccaratBetPanel } from '../components/games/baccarat/BaccaratBetPanel';
import { flyChip } from '../components/games/baccarat/flyChip';
import { GameCountdownBar, BACCARAT_COUNTDOWN_SECONDS } from '../components/games/GameCountdownBar';
import { SIDE_LABELS, type Side } from '../games/baccarat/types';
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
          <div className="bc-countdown">
            {game.phase === 'BETTING' && timeLeft > 0 ? (
              <GameCountdownBar
                progress={
                  BACCARAT_COUNTDOWN_SECONDS > 0
                    ? Math.min(1, Math.max(0, timeLeft) / BACCARAT_COUNTDOWN_SECONDS)
                    : 0
                }
              >
                Cartas em {timeLeft.toFixed(2)}s
              </GameCountdownBar>
            ) : (
              <div className="bc-countdown-idle">
                {game.phase === 'DEALING' ? 'Distribuindo cartas' : game.phase === 'RESULT' ? 'Resultado da mesa' : 'Preparando rodada'}
              </div>
            )}
          </div>
          <BaccaratTable
            outcome={game.outcome}
            status={game.status}
            shown={game.shown}
            arrived={game.arrived}
            bets={game.bets}
            totals={game.totals}
            placements={game.placements}
            chip={game.chip}
            remaining={game.remaining}
            editable={game.editable}
            authenticated={isAuthenticated}
            countdown={timeLeft}
            place={place}
            areaRefs={areaRefs}
          />
          <BaccaratBetPanel
            chip={game.chip}
            setChip={game.setChip}
            remaining={game.remaining}
            total={game.total}
            balance={game.balance}
            editable={game.editable}
            authenticated={isAuthenticated}
            undo={game.undo}
            clear={game.clear}
            login={openLoginModal}
            chipRefs={chipRefs}
          />
          {game.error && (
            <div className="bc-error" role="alert">
              <span>{game.error}</span>
            </div>
          )}
        </div>
        <section className="bc-history" aria-label="Histórico da mesa">
          <div className="bc-section-heading">
            <h2>
              <History size={16} /> Últimas rodadas
            </h2>
            <span>Resultados da mesa ao vivo</span>
          </div>
          {game.history.length > 0 ? (
            <ol>
              {game.history.map((item) => (
                <li key={`${item.roundId}-${item.createdAt}`}>
                  <span className={`bc-history-dot bc-${item.winner}`}>{SIDE_LABELS[item.winner][0]}</span>
                  <div>
                    <strong>
                      {SIDE_LABELS[item.winner]}
                      {item.winner !== 'tie' ? ' vence' : ''}
                    </strong>
                    <small>
                      {new Date(item.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {item.playerTotal} : {item.bankerTotal}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p>As rodadas concluídas da mesa aparecerão aqui.</p>
          )}
        </section>
        <details className="bc-rules">
          <summary>
            Como jogar e regras da mesa <span>+</span>
          </summary>
          <div>
            <p>
              Escolha uma ficha e clique em Jogador, Banca ou Empate. Cada clique aposta imediatamente. Você pode
              apostar nas três áreas e empilhar várias fichas enquanto a contagem estiver aberta. Desfazer e limpar
              reembolsam somente antes do fechamento. As cartas saem automaticamente a cada rodada.
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
              <strong>Retornos, incluindo a aposta inicial.</strong> Jogador paga 2×; Banca, 1,95× (5% de comissão sobre
              o lucro); Empate, 9×. No empate, as apostas em Jogador e Banca são devolvidas integralmente (1×, sem lucro
              ou perda). Cada ficha é liquidada em centavos; o retorno da Banca é arredondado ao centavo
              mais próximo, com meio centavo para cima. Exemplo: R$ 0,50 na Banca retorna R$ 0,98 quando vence.
            </p>
            <p>
              Os totais nas áreas incluem o volume da mesa. Somente as suas fichas reais entram na carteira.
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
