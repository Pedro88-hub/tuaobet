# Baccarat clássico — design
Data: 2026-09-11

## Objetivo e decisões
Adicionar /baccarat ao cassino existente com mesa, cartas, shoe e fichas feitos em React/CSS/SVG, sem imagens externas nem engine de jogos. Rodadas **globais ao vivo** sincronizadas pelo servidor (`BETTING` 12s → `DEALING` 5s → `RESULT` 5s), sem dealer de vídeo nem apostas laterais. Cada clique em Jogador, Banca ou Empate debita uma ficha imediatamente; desfazer/limpar reembolsam somente enquanto a janela de apostas estiver aberta. Usuário confirmou os nomes Jogador, Banca e Empate. Mesa retangular de feltro, com as três zonas coloridas contidas no painel (Jogador azul, Empate verde, Banca vermelho). Totais por área somam apostas reais e volume simulado; o volume simulado **não** afeta carteira, `Bet` nem estatísticas. A pilha visual de fichas mostra somente as fichas do usuário autenticado.

## Regras e pagamentos
Baccarat punto banco com oito baralhos completos (416 cartas); shoe novo embaralhado a cada rodada independente. Servidor usa crypto.randomInt em Fisher–Yates, sem reposição durante a rodada. A=1; 2–9 nominal; 10/J/Q/K=0; total é soma módulo 10.
Distribuir Jogador, Banca, Jogador, Banca. Natural 8/9 em qualquer mão encerra a compra. Sem natural, Jogador compra com 0–5, para com 6–7. Se Jogador parou, Banca compra com 0–5. Se Jogador comprou: Banca 0–2 sempre compra; 3 compra exceto contra terceira carta 8; 4 contra 2–7; 5 contra 4–7; 6 contra 6–7; 7 para. Maior total vence.
Retorno total: Jogador 2x; Banca 1,95x; Empate 9x. Banca desconta 5% do lucro; arredondar retorno para o centavo mais próximo (meio centavo para cima), explicitado nas regras. Empate devolve 1x das apostas Jogador/Banca. Pagamentos são calculados por área em centavos inteiros; nunca confiar em cartas/multiplicadores do cliente.
Fontes consultadas:
- https://www.pokerstars.com/casino/how-to-play/baccarat/ (regras, terceira carta, pagamentos, devolução)
- https://www.gra.gov.sg/docs/default-source/game-rules/rws/baccarat-games/rws-game-rules---commission-baccarat-with-insurance-v5.pdf (comissão e tabela)
- https://www.venetianlasvegas.com/content/dam/vlvweb/casino/table-games/VP-Gaming-Guide.pdf (tabela de terceira carta)

## Experiência
Mesa retangular de feltro verde, borda discreta e identidade TuaoBet. Mãos Jogador/Banca no feltro, shoe no canto, três áreas clicáveis contidas: Jogador, Empate, Banca. Cartas legíveis com naipes, versos e distribuição/revelação sequencial; placares somente das cartas já reveladas. Histórico compartilhado das últimas rodadas globais (vencedor e totais). Volume simulado aparece só como total/contagem nas áreas.
Selecionar ficha e clicar nas áreas debita imediatamente; pode apostar nas três na mesma rodada e empilhar várias fichas. Fichas R$0,50/1/5/10/25/100/500, indisponíveis quando excedem saldo restante. Campo de ficha personalizada com centavos permite usar qualquer saldo residual >= R$0,50. Desfazer remove a última ficha confirmada e reembolsa; limpar reembolsa todas as fichas abertas. Ambos só na fase `BETTING`. Mostrar saldo, total apostado (pessoal) e disponível. Mínimo R$0,50 por ficha, máximo agregado igual ao saldo sujeito ao teto configurado no servidor. Controles congelam em `DEALING`/`RESULT`; não há fila para a próxima rodada. Visitante vê mesa e botão de entrar. Responsivo a 360 px e desktop; botões acessíveis, foco visível e prefers-reduced-motion.

## Arquitetura e contrato
Motor puro em games/baccarat/baccaratMath.ts. Motor ao vivo em games/baccarat/baccaratEngine.ts (Socket.IO), simulador em baccaratSimulator.ts, helpers de ciclo em baccaratLive.ts. Serviço REST legado games/baccarat/baccaratService.ts e rotas `/deal`, `/history`, `/round/:id` permanecem para compatibilidade, mas a tela `/baccarat` usa somente o ciclo global.
Eventos cliente → servidor:
- `baccarat:sync`
- `baccarat:bet` `{ side: 'player'|'banker'|'tie', amount: number }` em reais
- `baccarat:undo`
- `baccarat:clear`
Eventos servidor → cliente:
- `baccarat:state` `{ phase, countdown, roundId, serverSeedHash?, outcome? }`
- `baccarat:commit` `{ roundId, serverSeedHash }`
- `baccarat:countdown` `number`
- `baccarat:history` últimas N rodadas globais
- `baccarat:totals` `{ roundId, player:{amount,count}, banker:{amount,count}, tie:{amount,count} }`
- `baccarat:deal` `BaccaratOutcome`
- `baccarat:result` `{ roundId, outcome, history, serverSeed?, serverSeedHash? }`
- `baccarat:chip-accepted` `{ roundId, placementId, side, amount, bets, placements }`
- `baccarat:bet-cancelled` `{ roundId, refunded, bets, placements }`
- `baccarat:error` `{ code: 'AUTH'|'CLOSED'|'INVALID'|'MIN_BET'|'MAX_BET'|'INSUFFICIENT_BALANCE'|'ACCOUNT_BLOCKED'|'NO_BET' }`
Card = `{ rank: 'A'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'J'|'Q'|'K', suit: 'clubs'|'diamonds'|'hearts'|'spades' }`.
Settlement interno = `{ side: 'player'|'banker'|'tie', amount, payout, multiplier, result: 'win'|'loss'|'push' }` em centavos, convertido a reais na persistência `Bet`.

## Persistência e recuperação
Modelo legado `BaccaratRound` (por usuário + requestId) permanece. Novo modelo `BaccaratRoundResult` para histórico global: UUID id, roundId, winner, playerTotal, bankerTotal, outcome JSON, createdAt; index(createdAt).
Cada ficha real cria uma `Bet` com `game=baccarat` e `result=pending`. Desfazer/limpar marcam `cancelled` e reembolsam stake. Liquidação no `RESULT` atualiza win/loss/push por ficha; push preserva wager/XP e não aplica lucro/perda. Volume simulado nunca cria `Bet`.
O servidor é a autoridade do relógio: fecha apostas de forma síncrona ao zerar o countdown e revalida a fase após débitos assíncronos, reembolsando fichas que cruzaram o fechamento. Reconexão recebe snapshot (`sync`) com fase, countdown, totais, resultado parcial e fichas pessoais. Efeitos monetários nunca em background não rastreável: emit UI primeiro, persistir payouts em seguida, `pushWalletBalance` após commit.

## Verificação e entrega
TDD do motor com todas as linhas de terceira carta, natural, pontuação, ordem, 416 cartas e liquidação com arredondamento/devolução. Testes do ciclo ao vivo para fase, totais reais+simulados, undo/clear, fechamento, isolamento dos simulados e snapshot de reconexão. Testes de serviço REST legado preservados. Testes de frontend para soma/limite, pilhas por denominação, totais agregados e bloqueio por fase. Build de ambos e inspeção desktop/mobile no navegador. Migração aditiva; não alterar dados reais em testes.
