import { ChevronLeft, ShieldCheck, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useBaccaratGame } from '../hooks/useBaccaratGame';
import { BaccaratTable } from '../components/games/baccarat/BaccaratTable';
import { BaccaratBetPanel } from '../components/games/baccarat/BaccaratBetPanel';
import { money } from '../games/baccarat/betting';
import { SIDE_LABELS } from '../games/baccarat/types';
import '../components/games/baccarat/baccarat.css';

export function BaccaratGame() {
  const {isAuthenticated,openLoginModal}=useAuth();
  const game=useBaccaratGame();
  return <Layout><main className="bc-page">
    <header className="bc-page-heading"><div><Link to="/" className="bc-back"><ChevronLeft size={14}/> Originais TuãoBet</Link><h1>Baccarat <span>CLÁSSICO</span></h1></div><span className="bc-header-detail"><ShieldCheck size={15}/> Rodadas individuais</span></header>
    <div className="bc-game-shell">
      <BaccaratTable round={game.round} status={game.status} shown={game.shown} arrived={game.arrived}/>
      <BaccaratBetPanel {...game} authenticated={isAuthenticated} login={openLoginModal}/>
      {game.error && <div className="bc-error" role="alert"><span>{game.error}{game.retryable && ' Sua aposta está preservada. Recupere a rodada antes de jogar novamente.'}</span>{game.retryable && <button type="button" onClick={()=>void game.retry()}>Tentar recuperar</button>}</div>}
    </div>
    <section className="bc-history" aria-label="Histórico pessoal"><div className="bc-section-heading"><h2><History size={16}/> Suas últimas rodadas</h2><span>Até 20 resultados</span></div>
      {game.history.length>0 ? <ol>{game.history.map(item=><li key={item.roundId}><span className={`bc-history-dot bc-${item.winner}`}>{SIDE_LABELS[item.winner][0]}</span><div><strong>{SIDE_LABELS[item.winner]}{item.winner!=='tie'?' vence':''}</strong><small>{new Date(item.createdAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · {item.playerTotal} : {item.bankerTotal}</small></div><div className="bc-history-money"><strong>{money(Math.round(item.totalPayout*100))}</strong><small>Retorno · aposta {money(Math.round(item.totalStake*100))}</small></div></li>)}</ol>:<p>{game.historyError || (isAuthenticated?'Suas rodadas concluídas aparecerão aqui.':'Entre na sua conta para ver seu histórico pessoal.')}</p>}
    </section>
    <details className="bc-rules"><summary>Como jogar e regras da mesa <span>+</span></summary><div>
      <p>Escolha uma ficha, clique em Jogador, Banca ou Empate e distribua as cartas. Você pode apostar nas três áreas. Cada aposta deve ter ao menos R$ 0,50; o total respeita seu saldo e os limites do servidor.</p>
      <p><strong>Cartas e pontuação.</strong> Cada rodada usa oito baralhos completos (416 cartas), embaralhados novamente pelo servidor, sem reposição dentro da rodada. Ás vale 1; 2 a 9 têm seu valor; 10, J, Q e K valem zero. A soma usa apenas o último algarismo. A mão mais próxima de 9 vence.</p>
      <p><strong>Distribuição.</strong> A ordem é Jogador, Banca, Jogador, Banca. Um total inicial de 8 ou 9 (natural) encerra a compra para ambos. Sem natural, Jogador compra com 0–5 e para com 6–7. Se Jogador parou, Banca compra com 0–5. Se Jogador comprou, Banca compra com 0–2; com 3, exceto contra terceira carta 8; com 4, contra 2–7; com 5, contra 4–7; com 6, contra 6–7; com 7, para.</p>
      <p><strong>Retornos, incluindo a aposta inicial.</strong> Jogador paga 2×; Banca, 1,95× (5% de comissão sobre o lucro); Empate, 9×. No empate, as apostas em Jogador e Banca são devolvidas integralmente (1×, sem lucro ou perda). Cada área é liquidada separadamente em centavos; o retorno da Banca é arredondado ao centavo mais próximo, com meio centavo para cima. Exemplo: R$ 0,50 na Banca retorna R$ 0,98 quando vence.</p>
      <p>Referências: <a href="https://www.pokerstars.com/casino/how-to-play/baccarat/" target="_blank" rel="noreferrer">Regras de baccarat — PokerStars</a> · <a href="https://www.venetianlasvegas.com/content/dam/vlvweb/casino/table-games/VP-Gaming-Guide.pdf" target="_blank" rel="noreferrer">Guia de jogos — The Venetian</a>.</p>
    </div></details>
  </main></Layout>;
}
