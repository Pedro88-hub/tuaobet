# Spec: Session Stats Backend (barra de sessão)

**Data:** 2026-09-10  
**Status:** implemented  
**Escopo:** backend (`tuaobet-backend`) — schema, login, endpoint de stats  
**Consumidor:** [`SessionStatsBar.tsx`](../../../tuaobet-frontend/src/components/layout/SessionStatsBar.tsx)

## 1. Objetivo

Expor dados reais para a barra de sessão do site:

| Campo UI | Campo API | Fonte |
|----------|-----------|--------|
| Login anterior | `previousLoginAt` | `User.previousLoginAt` |
| Valor ganho | `wonAmount` | agregação de `Bet` na sessão atual |
| Valor perdido | `lostAmount` | agregação de `Bet` na sessão atual |
| Saldo da carteira | `balance` | `User.balance` (já existe) |
| Tempo na sessão atual | `sessionStartedAt` | `User.currentSessionStartedAt` (cliente calcula o elapsed) |

O frontend hoje mostra `—` / timer local. Após esta spec, o frontend passa a consumir o endpoint (fora do escopo deste documento, salvo contrato).

## 2. Definições

### 2.1 Sessão

Uma **sessão** começa em cada login bem-sucedido (e no register, que já emite token).

- `currentSessionStartedAt` = instante do login/register atual.
- Não há “logout” server-side hoje (JWT stateless). A sessão no servidor **não termina** até o próximo login; o “tempo na sessão” no cliente é `now - sessionStartedAt` enquanto o utilizador está autenticado na app.
- Novo login na mesma conta (outro browser/dispositivo) **reinicia** a sessão: `previousLoginAt` ← antigo `lastLoginAt`, `lastLoginAt`/`currentSessionStartedAt` ← now. Stats de ganho/perda passam a contar só a partir do novo `currentSessionStartedAt`.

### 2.2 Login anterior

- `previousLoginAt`: timestamp do login **anterior** ao atual (o que a UI chama “Login anterior”).
- No primeiro login da conta: `previousLoginAt = null` → UI mostra `—`.
- Atualização **apenas** em `login` (e `register` deixa `previousLoginAt = null`).

### 2.3 Valor ganho / perdido (janela da sessão)

Agregar apostas **settled** do utilizador com `createdAt >= currentSessionStartedAt`:

| Métrica | Regra |
|---------|--------|
| `wonAmount` | `SUM(payout - amount)` onde `result = 'win'` e `payout` não é null. Se `payout < amount`, tratar parcela como 0 (não negativar ganho). Arredondar a 2 casas. |
| `lostAmount` | `SUM(amount)` onde `result = 'loss'`. Arredondar a 2 casas. |

**Excluídos:** `result IN ('pending', 'cancelled')`, apostas sem settle.

**Não usar** `Transaction` para esta métrica: débitos `bet` ocorrem no stake, não no settle; créditos `win` são payout bruto. `Bet` já tem `result` / `payout` / `amount`.

### 2.4 Saldo

`User.balance` — sem mudança de escrita; só leitura no payload de stats.

### 2.5 Tempo na sessão

API devolve `sessionStartedAt` (ISO-8601). O cliente continua a cronometrar localmente a partir desse instante (evita drift de poll e mantém UI fluida). Opcional na API: `serverNow` para sync de relógio (não obrigatório na v1).

## 3. Alterações de schema (Prisma)

Em `User`:

```prisma
model User {
  // ... campos existentes ...
  lastLoginAt             DateTime?
  previousLoginAt         DateTime?
  currentSessionStartedAt DateTime?
}
```

Migração SQL sugerida:

```sql
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "previousLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "currentSessionStartedAt" TIMESTAMP(3);
```

Índice para agregação de apostas por utilizador + tempo:

```sql
CREATE INDEX "Bet_userId_createdAt_idx" ON "Bet"("userId", "createdAt");
```

(Se já existir índice equivalente, não duplicar.)

**Backfill:** utilizadores existentes ficam com os três campos `null` até o próximo login. Aceitável.

## 4. Contrato da API

### 4.1 `GET /api/auth/session-stats`

**Auth:** `authMiddleware` (mesmo padrão de `GET /api/auth/me`).

**Response 200:**

```json
{
  "previousLoginAt": "2026-09-10T18:00:00.000Z",
  "wonAmount": 120.5,
  "lostAmount": 80.0,
  "balance": 214800.76,
  "sessionStartedAt": "2026-09-10T21:30:00.000Z",
  "updatedAt": "2026-09-10T21:45:00.000Z"
}
```

| Campo | Tipo | Notas |
|-------|------|--------|
| `previousLoginAt` | `string \| null` | ISO-8601 ou `null` |
| `wonAmount` | `number` | ≥ 0, 2 casas |
| `lostAmount` | `number` | ≥ 0, 2 casas |
| `balance` | `number` | espelho de `User.balance` |
| `sessionStartedAt` | `string \| null` | ISO-8601; `null` só se conta antiga sem login pós-migração |
| `updatedAt` | `string` | `new Date().toISOString()` no servidor (para o disclaimer “atualizado a cada 2 min”) |

**Erros:** 401 sem token; 403 conta não `ACTIVE`; 404 user inexistente — alinhado a `getMe`.

**Rate limit:** reutilizar rate limit de auth/jogo se existir; caso contrário, limite leve dedicado (ex. 30 req/min por IP+user) porque o frontend pollará ~a cada 2 minutos.

### 4.2 Mudanças em `POST /api/auth/login`

Dentro da mesma request (transação Prisma preferível):

1. Validar credenciais + status (fluxo atual).
2. `previousLoginAt := user.lastLoginAt` (pode ser `null`).
3. `lastLoginAt := now`.
4. `currentSessionStartedAt := now`.
5. Emitir token + user payload atual.
6. Opcional v1: incluir bloco `sessionStats` no login response para evitar round-trip imediato; **não obrigatório** se o frontend pollar `session-stats` ao montar a barra.

### 4.3 Mudanças em `POST /api/auth/register`

Após create:

- `lastLoginAt = now`
- `currentSessionStartedAt = now`
- `previousLoginAt = null`

### 4.4 `GET /api/auth/me`

**Não obrigatório** expandir na v1. Manter payload atual. Stats ficam só em `/session-stats` para permitir poll sem misturar com identidade.

## 5. Implementação sugerida (ficheiros)

| Ficheiro | Responsabilidade |
|----------|------------------|
| `prisma/schema.prisma` | Novos campos + índice `Bet` |
| `prisma/migrations/<ts>_user_session_stats/` | SQL |
| `src/services/sessionStats.ts` | `recordLoginSession(userId)`, `getSessionStats(userId)` |
| `src/controllers/authController.ts` | Chamar `recordLoginSession` em login/register; novo `getSessionStats` |
| `src/routes/authRoutes.ts` | `GET /session-stats` autenticado |

### 5.1 `getSessionStats(userId)` (pseudológica)

```
user = findUnique(id, select balance, previousLoginAt, currentSessionStartedAt)
se !user → not found
since = user.currentSessionStartedAt ?? user.createdAt  // fallback suave

wonAgg = Bet.aggregate where userId, result='win', createdAt >= since
  _sum: { payout, amount }  → wonAmount = max(0, round2((payout??0) - (amount??0)))
  // Preferível: raw SQL / groupBy por bet e somar max(0, payout-amount)
  // Implementação correta: findMany select amount,payout + reduce em JS se volume baixo
  // ou $queryRaw com SUM(GREATEST(payout - amount, 0))

lostAgg = Bet.aggregate where userId, result='loss', createdAt >= since
  _sum: { amount } → lostAmount = round2(amount ?? 0)

return { previousLoginAt, wonAmount, lostAmount, balance, sessionStartedAt: since, updatedAt: now }
```

**Performance:** para v1, `aggregate` + raw `SUM(GREATEST("payout" - "amount", 0))` é preferível a carregar todas as bets. Índice `(userId, createdAt)` cobre o filtro.

### 5.2 `recordLoginSession(userId)` 

```
now = new Date()
user = findUnique ...
update {
  previousLoginAt: user.lastLoginAt,
  lastLoginAt: now,
  currentSessionStartedAt: now,
}
```

Chamar **depois** de validar senha/status e **antes** de gerar a response.

## 6. Segurança e privacidade

- Endpoint autenticado; stats **só** do `req.userId`.
- Não expor `lastLoginAt` de outros utilizadores.
- Não logar valores sensíveis em excesso; audit admin existente não precisa desta feature na v1.

## 7. Testes (aceitação)

1. **Primeiro login** pós-migração: `previousLoginAt = null`, `sessionStartedAt` ≈ now, won/lost = 0.
2. **Segundo login** horas depois: `previousLoginAt` = instante do primeiro login; nova sessão zera won/lost até novas bets.
3. **Aposta win** na sessão: `wonAmount` aumenta em `payout - amount`.
4. **Aposta loss** na sessão: `lostAmount` aumenta em `amount`.
5. **Pending** não altera won/lost.
6. **Bet anterior à sessão** não entra nas somas.
7. **Utilizador suspenso/banido:** 403.
8. **Sem token:** 401.
9. **Balance** no response igual a `User.balance` após um win (ledger).

Sugestão: testes de integração no padrão já usado no backend (se houver); senão, script manual com Prisma seed + curl.

## 8. Fora de escopo (v1)

- Frontend wiring / poll de 2 minutos (spec separada ou tarefa de follow-up).
- Sessões multi-dispositivo simultâneas com IDs distintos.
- Logout server-side / invalidação de JWT.
- Histórico de sessões.
- “Valor ganho/perdido” lifetime (só janela da sessão atual).
- WebSocket push das stats (poll HTTP basta).

## 9. Ordem de implementação

1. Migração Prisma (`User` + índice `Bet`).
2. Serviço `sessionStats.ts` + testes unitários das regras de agregação (funções puras de reduce, se extrair).
3. Hook em `login` / `register`.
4. Rota `GET /session-stats`.
5. Verificação manual com conta de teste.
6. (Follow-up) Frontend: poll 2 min + formatação de `previousLoginAt` em pt-BR.

## 10. Critério de pronto

- Migração aplica limpa em Postgres local.
- Login grava os três timestamps corretamente.
- `GET /api/auth/session-stats` devolve JSON conforme §4.1 com won/lost coerentes com bets da sessão.
- Contas antigas sem backfill não quebram (null → UI `—` / fallback de `sessionStartedAt`).
