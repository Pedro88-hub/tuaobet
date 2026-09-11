# Baccarat clássico — design
Data: 2026-09-11

## Objetivo e decisões
Adicionar /baccarat ao cassino existente com mesa, cartas, shoe e fichas feitos em React/CSS/SVG, sem imagens externas nem engine de jogos. Rodadas individuais iniciadas pelo usuário, sem dealer de vídeo, multiplayer, autoplay ou apostas laterais. Usuário confirmou os nomes Jogador, Banca e Empate. Solicitou planejamento e execução por subagentes.

## Regras e pagamentos
Baccarat punto banco com oito baralhos completos (416 cartas); shoe novo embaralhado a cada rodada independente. Servidor usa crypto.randomInt em Fisher–Yates, sem reposição durante a rodada. A=1; 2–9 nominal; 10/J/Q/K=0; total é soma módulo 10.
Distribuir Jogador, Banca, Jogador, Banca. Natural 8/9 em qualquer mão encerra a compra. Sem natural, Jogador compra com 0–5, para com 6–7. Se Jogador parou, Banca compra com 0–5. Se Jogador comprou: Banca 0–2 sempre compra; 3 compra exceto contra terceira carta 8; 4 contra 2–7; 5 contra 4–7; 6 contra 6–7; 7 para. Maior total vence.
Retorno total: Jogador 2x; Banca 1,95x; Empate 9x. Banca desconta 5% do lucro; arredondar retorno para o centavo mais próximo (meio centavo para cima), explicitado nas regras. Empate devolve 1x das apostas Jogador/Banca. Pagamentos são calculados por área em centavos inteiros; nunca confiar em cartas/multiplicadores do cliente.
Fontes consultadas:
- https://www.pokerstars.com/casino/how-to-play/baccarat/ (regras, terceira carta, pagamentos, devolução)
- https://www.gra.gov.sg/docs/default-source/game-rules/rws/baccarat-games/rws-game-rules---commission-baccarat-with-insurance-v5.pdf (comissão e tabela)
- https://www.venetianlasvegas.com/content/dam/vlvweb/casino/table-games/VP-Gaming-Guide.pdf (tabela de terceira carta)

## Experiência
Mesa de feltro verde escuro com borda, detalhes dourados e identidade TuaoBet. Mãos Jogador/Banca na mesa, shoe ao lado, três áreas clicáveis: Jogador, Empate, Banca. Cartas legíveis com naipes, versos e distribuição/revelação sequencial; placares somente das cartas já reveladas. Resultado e histórico pessoal reais, sem jogadores/ganhos simulados.
Selecionar ficha e clicar nas áreas acumula apostas; pode apostar nas três na mesma rodada. Fichas R$0,50/1/5/10/25/100/500, indisponíveis quando excedem saldo restante. Campo de ficha personalizada com centavos permite usar qualquer saldo residual >= R$0,50. Desfazer e limpar só antes de enviar. Mostrar saldo, total apostado e disponível para adicionar fichas. Mínimo R$0,50 por área não zero, máximo agregado igual ao saldo sujeito ao teto configurado no servidor. Controles congelam ao enviar e distribuir. Visitante vê mesa e botão de entrar. Responsivo a 360 px e desktop; botões acessíveis, foco visível e prefers-reduced-motion.

## Arquitetura e contrato
Motor puro em games/baccarat/baccaratMath.ts; serviço transacional games/baccarat/baccaratService.ts; controlador dedicado e rotas gameRoutes. React hook, mesa/cartas/fichas e CSS específicos, rota, card SVG autoral no lobby e links de navegação relevantes.
POST /api/games/baccarat/deal com autenticação, conta ativa e rate limit:
`{ requestId: UUID, bets: { player: number, banker: number, tie: number } }` em reais, zeros para áreas vazias.
Sucesso:
`{ roundId, requestId, playerCards: Card[], bankerCards: Card[], playerTotal, bankerTotal, winner, settlements: Settlement[], totalStake, totalPayout, balance, createdAt }`.
Card = `{ rank: 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K', suit: 'clubs'|'diamonds'|'hearts'|'spades' }`.
Settlement = `{ side: 'player'|'banker'|'tie', amount, payout, multiplier, result: 'win'|'loss'|'push' }`.
GET /api/games/baccarat/history retorna `{ rounds: RoundResponse[] }`, 20 últimas rodadas do usuário.
GET /api/games/baccarat/round/:requestId recupera rodada do usuário ou 404. Respostas de rodada incluem saldo atual da carteira (não saldo antigo salvo).

## Persistência e recuperação
Novo modelo BaccaratRound: UUID id, userId relação, requestId, bets JSON, outcome JSON, createdAt; unique(userId, requestId), index(userId, createdAt). Uma Bet por área não zero com game=baccarat e result win/loss/push. Resultado push preserva wager/XP, não aplica lucro/perda; histórico geral e filtro admin devem reconhecer push.
Uma transação persiste registro único, débito agregado condicional, crédito agregado, Bets, lucro/perda por área e resultado. Validação estrita de finitos/precisão/limites e limites de inteiros seguros. Recusa de saldo reverte tudo. Mesmo requestId e payload normalizado retornam a mesma rodada sem novos efeitos; mesmo id e bets diferentes =409; concorrência resolvida via restrição única e recuperação depois do rollback. Efeitos monetários nunca em background.
Cliente guarda pedido pendente em sessionStorage por userId antes do POST. Em resposta perdida, bloqueia nova rodada, consulta/reenvia mesmo requestId e mesmos valores. Não restaura saldo antigo no catch. Limpeza de pendência só após resolução definitiva; 4xx definitivos (exceto 429) liberam, rede/5xx/429 preservam para tentar novamente. Recarregar página recupera pendência, troca de usuário isola estado e ignora respostas de sessão anterior. Push de carteira após commit usando mecanismo existente, frontend reconcilia saldo com servidor.

## Verificação e entrega
TDD do motor com todas as linhas de terceira carta, natural, pontuação, ordem, 416 cartas e liquidação com arredondamento/devolução. Testes de serviço com PostgreSQL isolado para rollback, saldo insuficiente, concorrência, idempotência e estatísticas; rota autenticada e isolamento entre usuários. Testes de frontend para soma/limite e pendência, build de ambos e inspeção desktop/mobile no navegador. Testes existentes preservados. Migração aditiva; não alterar dados reais em testes. Finalizar com integração local do código validado ao checkout inicial; não publicar nem fazer push.

