# Alterações para o Baccarat ficar “1:1” com o estilo Blaze (referência: screenshot)

Este documento lista **todas as mudanças necessárias** (arquivos, tokens e layout) para que a página `tuaobet-frontend/src/pages/BaccaratGame.tsx` siga o **mesmo estilo visual** do Baccarat na Blaze: **frame de player**, **overlays**, **card de informações abaixo**, e **padrões de topbar/sidebar**.

> Observação: “idêntico” aqui significa **disposição, proporções, tipografia, cores e comportamento de UI**. Não inclui conteúdo proprietário (logos/marcas exatas) nem assets protegidos.

---

## 0) Resultado esperado (como deve ficar)

- **Topbar fixa (h-16)** e **sidebar esquerda** já existem (via `Layout`) — manter.
- Dentro da rota **`/baccarat`**, o conteúdo deve ser:
  - **Frame do player** (retângulo grande com cantos arredondados):
    - header no topo esquerdo com nome do jogo e limits;
    - cluster de ícones no topo direito (fullscreen, volume, config etc — pode ser mock).
  - **Overlays dentro do player**, alinhados como na Blaze:
    - **multiplicadores** no canto inferior esquerdo;
    - **cápsula central** (Jogador/Empate/Banca) no fundo, centralizada;
    - **roadmap/histórico** no inferior direito;
    - botão “**Lobby**” no canto inferior direito (próximo ao roadmap).
  - **Card abaixo do player** com:
    - título “Lightning Baccarat” + provedor (ex.: “Evolution Gaming”);
    - ícones de ações à direita (favoritar/expandir etc — pode ser mock).

---

## 1) Assets obrigatórios (hoje estão faltando)

### 1.1. Corrigir imagem do fundo da mesa

Atualmente `BaccaratGame.tsx` usa:

- `url('/images/baccarat-table.png')`

Mas o diretório `tuaobet-frontend/public/` está vazio no workspace atual.

**Criar**:
- `tuaobet-frontend/public/images/baccarat-table.png`

**Fonte sugerida**:
- Use a imagem que você já tem no root (`imagem_baccarat_FUNDO.png`) como base e exporte para `baccarat-table.png` na pasta acima.

### 1.2. (Opcional, recomendado) Placeholder de “vídeo”

Para ficar mais idêntico ao screenshot, o fundo do player pode ser:
- um `<video>`/`<iframe>` (real) **ou**
- uma imagem grande (mock) com blur leve + vinheta.

Se for mock:
- `tuaobet-frontend/public/images/baccarat-video-placeholder.jpg`

---

## 2) Tokens de design (Tailwind): ajustar para “Blaze look”

Arquivo: `tuaobet-frontend/tailwind.config.js`

### 2.1. Paleta base (fundos/painéis/bordas/texto)

O screenshot mostra um tema com:
- fundo principal **quase preto/azul petróleo**,
- painéis um pouco mais claros,
- bordas discretas,
- texto branco e cinzas frios.

**Ações**:
- Ajustar `tuao-dark-*` para ficar mais próximo do “petrol/charcoal” da Blaze.
- Ajustar `tuao-text-secondary` para um cinza um pouco mais frio (menos “A1A1A1” neutro).

Checklist:
- [ ] `tuao-dark-950`: bem escuro, puxando pro azul.
- [ ] `tuao-dark-900`: painel (cards/menus).
- [ ] `tuao-dark-800/700`: bordas e hover.
- [ ] `tuao-text-secondary`: cinza frio (boa legibilidade).

### 2.2. Cor primária

Seu projeto usa `tuao-primary` neon ciano. Na Blaze o CTA principal do screenshot é **vermelho/rosa** (botão “Depositar”).

**Ações (opções)**:
- Opção A (mais fiel): criar um token de CTA separado:
  - `tuao-cta: { DEFAULT: <vermelho>, hover: <vermelho hover> }`
- Opção B: trocar `tuao-primary` para vermelho e mover o ciano para um token secundário.

Checklist:
- [ ] criar `tuao-cta` e aplicar no CTA do Navbar.

### 2.3. Sombras e raios (consistência)

No screenshot:
- cards/frames têm sombra **suave**, não tão “neon”.
- cantos arredondados consistentes (8–12px).

**Ações**:
- criar/ajustar:
  - `shadow-panel` (suave)
  - `shadow-player` (frame do player)
- padronizar uso de `rounded-xl` (player + cards) e `rounded-lg` (botões/controles).

---

## 3) Layout global (já muito próximo): pequenos ajustes

Arquivo: `tuaobet-frontend/src/components/layout/Layout.tsx`

### 3.1. Container do conteúdo (proporções)

Hoje:
- `max-w-[1400px] mx-auto` e `p-4 md:p-6`.

Para ficar igual ao screenshot:
- manter `max-w-[1400px]`;
- garantir “respiro” vertical no topo (o screenshot tem bastante espaço).

Checklist:
- [ ] revisar `p-4/md:p-6` para bater com 24–32px no desktop.

---

## 4) Página `/baccarat`: refatoração estrutural (principal)

Arquivo: `tuaobet-frontend/src/pages/BaccaratGame.tsx`

### 4.1. Criar o “PlayerFrame” (moldura igual Blaze)

Hoje, a página renderiza uma “mesa” com imagem e elementos de HUD. Para ficar idêntico ao screenshot, crie um bloco com:

- container “player frame” com:
  - header interno (top-left) com título e limites;
  - ações no topo direito (ícones em botões circulares);
  - conteúdo principal (video/imagem);
  - overlays (multipliers, cápsula, roadmap, lobby).

**Ações**:
- Extrair a parte visual para um componente:
  - `tuaobet-frontend/src/components/games/baccarat/BlazePlayerFrame.tsx`
- Dentro dele:
  - `BlazePlayerHeader.tsx`
  - `BlazePlayerControls.tsx`
  - `BlazeBaccaratOverlay.tsx`

Checklist:
- [ ] o frame deve usar `rounded-xl`, `overflow-hidden`, borda discreta e sombra suave.
- [ ] header com tipografia pequena (11–12px), peso médio, cor cinza claro.
- [ ] botões de ação “circulares” com fundo escuro translúcido + borda sutil.

### 4.2. Overlays: posicionamento 1:1

No screenshot os overlays ficam **DENTRO** do player.

**Ações**:
- Reposicionar UI atual para:
  - **Multiplicadores**: `absolute bottom-20 left-4` (ajustar fino) e tamanho compacto.
  - **Cápsula central**: `absolute bottom-6 left-1/2 -translate-x-1/2` com largura ~520–600px.
  - **Roadmap**: `absolute bottom-6 right-4` com bloco pequeno (grade).
  - **Lobby**: `absolute bottom-6 right-4` (ou ligeiramente acima/ao lado do roadmap) como botão pequeno.

Checklist:
- [ ] cápsula central com `bg-black/40` + `backdrop-blur`.
- [ ] 3 áreas (Jogador/Empate/Banca) com cores **azul/verde/vermelho** como no screenshot.
- [ ] tipografia: labels pequenas + números legíveis.

### 4.3. Remover/evitar elementos “não Blaze” na base

Hoje existe uma **barra inferior fixa** (Saldo/Aposta/Fichas/Lobby) e um botão grande “Apostar” sobreposto.

No screenshot, a Blaze concentra a aposta **no overlay** (cápsula) e não mostra essa barra fixa do seu jeito.

**Ações**:
- Migrar “saldo/aposta total/fichas/confirmar” para um modelo Blaze-like:
  - ou embutir um botão/estado na cápsula;
  - ou deixar fichas em um pequeno painel próximo (sem virar uma barra fixa gigante).
- **Remover** a barra fixa inferior para o modo “Blaze”.

Checklist:
- [ ] remover o bloco “Barra inferior (SALDO / APOSTA / Fichas / Lobby)” do layout Blaze.
- [ ] remover o “botão confirmar” circular grande (ou transformar em botão pequeno dentro da cápsula).

### 4.4. Adicionar “Card de info” abaixo do player

No screenshot, abaixo do player existe um card com título e provedor.

**Ações**:
- Criar componente:
  - `tuaobet-frontend/src/components/games/baccarat/BlazeGameInfoCard.tsx`
- Usar:
  - título: “Lightning Baccarat”
  - subtítulo: “Evolution Gaming” (ou o seu provedor)
  - ações à direita (ícones).

Checklist:
- [ ] `rounded-xl`, `border` discreta, `bg-tuao-dark-900`.
- [ ] padding ~16–20px.
- [ ] alinhar ícones à direita.

### 4.5. Roadmap/histórico (grade no canto inferior direito)

Hoje o hook `useBaccaratGame` já tem `history`, mas a UI não aparece no trecho inspecionado.

**Ações**:
- Renderizar `history` em uma grade compacta “Blaze-like” dentro do overlay:
  - círculos pequenos por outcome (azul/jogador, vermelho/banca, verde/empate);
  - grade com 5–6 colunas e várias linhas (tamanho pequeno).
- Criar:
  - `tuaobet-frontend/src/components/games/baccarat/BlazeRoadmap.tsx`

Checklist:
- [ ] fundo translúcido e borda discreta.
- [ ] tamanho semelhante ao do screenshot (bem compacto).

---

## 5) Navbar/Sidebar: aplicar tokens para aproximar mais do screenshot

### 5.1. CTA “Depositar” vermelho (Blaze-like)

Arquivo: `tuaobet-frontend/src/components/layout/Navbar.tsx`

Hoje o botão “Depositar” usa `bg-tuao-primary` (ciano). Para ficar igual:

**Ações**:
- aplicar `bg-tuao-cta` (vermelho) no CTA principal.
- reduzir glow “neon ciano” no underline/sombras (Blaze é mais clean).

Checklist:
- [ ] CTA vermelho com hover.
- [ ] sombras mais suaves, menos neon.

### 5.2. Sidebar com fundo “panel” e bordas discretas

Arquivo: `tuaobet-frontend/src/components/layout/Sidebar.tsx`

Hoje já está bem próximo (`bg-[#0f1419]`). Ajustes finos:
- bordas e hover menos brilhantes;
- tipografia de labels um pouco menor, mais “compacta”.

---

## 6) Lista objetiva de arquivos a criar/alterar

### Criar
- [ ] `tuaobet-frontend/public/images/baccarat-table.png`
- [ ] `tuaobet-frontend/src/components/games/baccarat/BlazePlayerFrame.tsx`
- [ ] `tuaobet-frontend/src/components/games/baccarat/BlazePlayerHeader.tsx`
- [ ] `tuaobet-frontend/src/components/games/baccarat/BlazePlayerControls.tsx`
- [ ] `tuaobet-frontend/src/components/games/baccarat/BlazeBaccaratOverlay.tsx`
- [ ] `tuaobet-frontend/src/components/games/baccarat/BlazeRoadmap.tsx`
- [ ] `tuaobet-frontend/src/components/games/baccarat/BlazeGameInfoCard.tsx`

### Alterar
- [ ] `tuaobet-frontend/tailwind.config.js` (tokens: cores, sombras, CTA vermelho)
- [ ] `tuaobet-frontend/src/components/layout/Navbar.tsx` (CTA vermelho + reduzir neon)
- [ ] `tuaobet-frontend/src/components/layout/Layout.tsx` (ajuste fino de paddings, se necessário)
- [ ] `tuaobet-frontend/src/pages/BaccaratGame.tsx` (trocar a UI atual pela composição Blaze: `PlayerFrame` + `InfoCard`)

---

## 7) Checklist de “1:1” (validação visual)

- [ ] **Proporção do player**: retângulo grande, com `rounded-xl`, sem “barras” extras.
- [ ] **Overlays**: multipliers (esq), cápsula (centro), roadmap (dir), lobby (dir).
- [ ] **Cores**: fundo/painéis/bordas/textos iguais em contraste e temperatura.
- [ ] **Tipografia**: labels pequenas (10–12px), títulos 16–18px, uppercase e tracking discreto.
- [ ] **Espaçamento**: padding do container e margens iguais ao screenshot.
- [ ] **Sombras**: suave (sem neon exagerado).

---

## 8) Notas de implementação (para não quebrar lógica)

- O estado do jogo já vem de `useBaccaratGame` via Socket.IO (`baccarat:*`). **Não precisa mudar lógica** para mudar o visual.
- Faça a refatoração **só de UI**:
  - manter `addChip`, `placeBet`, `history`, `liveBets`;
  - só reposicionar e reestilizar os controles.

