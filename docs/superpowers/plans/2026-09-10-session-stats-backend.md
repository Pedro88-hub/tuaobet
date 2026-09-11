# Session Stats Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir timestamps de sessão no login/register e expor `GET /api/auth/session-stats` com previousLogin, won/lost da sessão, balance e sessionStartedAt.

**Architecture:** Três campos novos em `User` gravados em login/register via `recordLoginSession`. Endpoint autenticado agrega `Bet` settled desde `currentSessionStartedAt` com helpers puros de arredondamento/soma. Rate limit leve dedicado; `GET /me` permanece inalterado.

**Tech Stack:** Express, Prisma 5, PostgreSQL, TypeScript, `express-rate-limit`, Node.js built-in `node:test` (sem Jest/Vitest — o backend ainda não tem runner).

**Spec:** `docs/superpowers/specs/2026-09-10-session-stats-backend-design.md`

## Global Constraints

- Escopo só `tuaobet-backend` — sem wiring do frontend nesta entrega.
- Não usar `Transaction` para won/lost; só `Bet` com `result` win/loss.
- `wonAmount` nunca negativo: `max(0, payout - amount)` por aposta, depois soma, 2 casas.
- `lostAmount` = `SUM(amount)` onde `result = 'loss'`, 2 casas.
- Excluir `pending` e `cancelled`.
- Contas antigas: campos null até próximo login; fallback de janela `currentSessionStartedAt ?? createdAt`.
- Erros do endpoint alinhados a `getMe`: 401 / 403 / 404.
- Não expandir payload de `GET /me` nem incluir `sessionStats` obrigatório no login (opcional omitido na v1).
- Índice `Bet(userId, createdAt)` — o índice existente é `(result, createdAt)`; não duplicar se já existir equivalente.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `tuaobet-backend/prisma/schema.prisma` | Campos `lastLoginAt`, `previousLoginAt`, `currentSessionStartedAt` em `User`; `@@index([userId, createdAt])` em `Bet` |
| `tuaobet-backend/prisma/migrations/20260910220000_user_session_stats/migration.sql` | SQL da migração |
| `tuaobet-backend/src/services/sessionStatsMath.ts` | Funções puras: `round2`, `sumWonAmount`, `sumLostAmount` |
| `tuaobet-backend/src/services/sessionStatsMath.test.ts` | Testes unitários das regras de agregação |
| `tuaobet-backend/src/services/sessionStats.ts` | `recordLoginSession`, `getSessionStats` (Prisma + math) |
| `tuaobet-backend/src/middlewares/sessionStatsRateLimit.ts` | Rate limit ~30 req/min por user/IP |
| `tuaobet-backend/src/controllers/authController.ts` | Hooks login/register + handler `getSessionStats` |
| `tuaobet-backend/src/routes/authRoutes.ts` | `GET /session-stats` |
| `tuaobet-backend/package.json` | Script `test` com `node:test` + `ts-node` |

---

### Task 1: Migração Prisma (User session fields + Bet index)

**Files:**
- Modify: `tuaobet-backend/prisma/schema.prisma`
- Create: `tuaobet-backend/prisma/migrations/20260910220000_user_session_stats/migration.sql`

**Interfaces:**
- Consumes: schema Prisma atual (`User`, `Bet`)
- Produces: `User.lastLoginAt`, `User.previousLoginAt`, `User.currentSessionStartedAt` (`DateTime?`); índice `Bet_userId_createdAt_idx`

- [ ] **Step 1: Atualizar `schema.prisma`**

Em `model User`, após `createdAt`, adicionar:

```prisma
  lastLoginAt             DateTime?
  previousLoginAt         DateTime?
  currentSessionStartedAt DateTime?
```

Em `model Bet`, além do índice existente `@@index([result, createdAt])`, adicionar:

```prisma
  @@index([userId, createdAt])
```

- [ ] **Step 2: Criar ficheiro de migração**

Criar pasta `tuaobet-backend/prisma/migrations/20260910220000_user_session_stats/` com `migration.sql`:

```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "previousLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "currentSessionStartedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Bet_userId_createdAt_idx" ON "Bet"("userId", "createdAt");
```

- [ ] **Step 3: Aplicar migração e gerar client**

Run (em `tuaobet-backend`):

```bash
npx prisma migrate deploy
npx prisma generate
```

Expected: migração aplicada sem erro; client regenerado com os novos campos.

- [ ] **Step 4: Commit**

```bash
git add tuaobet-backend/prisma/schema.prisma tuaobet-backend/prisma/migrations/20260910220000_user_session_stats/
git commit -m "$(cat <<'EOF'
feat(auth): add user session timestamp fields and bet index

EOF
)"
```

---

### Task 2: Helpers puros de agregação + testes

**Files:**
- Create: `tuaobet-backend/src/services/sessionStatsMath.ts`
- Create: `tuaobet-backend/src/services/sessionStatsMath.test.ts`
- Modify: `tuaobet-backend/package.json` (script `test`)

**Interfaces:**
- Consumes: nada (puro)
- Produces:
  - `round2(n: number): number`
  - `sumWonAmount(bets: ReadonlyArray<{ amount: number; payout: number | null }>): number`
  - `sumLostAmount(bets: ReadonlyArray<{ amount: number }>): number`

- [ ] **Step 1: Adicionar script de teste em `package.json`**

No objeto `scripts`:

```json
"test": "node --require ts-node/register/transpile-only --test src/services/sessionStatsMath.test.ts"
```

Garantir que `ts-node` está disponível (já vem via `ts-node-dev` / ou instalar `ts-node` como devDependency se o require falhar).

- [ ] **Step 2: Escrever o teste que falha**

Criar `tuaobet-backend/src/services/sessionStatsMath.test.ts`:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { round2, sumWonAmount, sumLostAmount } from './sessionStatsMath';

describe('round2', () => {
  it('arredonda a 2 casas', () => {
    assert.equal(round2(1.005), 1.01);
    assert.equal(round2(10.1), 10.1);
    assert.equal(round2(0), 0);
  });
});

describe('sumWonAmount', () => {
  it('soma payout - amount só quando positivo', () => {
    assert.equal(
      sumWonAmount([
        { amount: 10, payout: 25 },
        { amount: 5, payout: 5 },
        { amount: 8, payout: 3 },
        { amount: 2, payout: null },
      ]),
      15
    );
  });

  it('devolve 0 para lista vazia', () => {
    assert.equal(sumWonAmount([]), 0);
  });
});

describe('sumLostAmount', () => {
  it('soma amounts de losses', () => {
    assert.equal(sumLostAmount([{ amount: 10 }, { amount: 3.333 }]), 13.33);
  });

  it('devolve 0 para lista vazia', () => {
    assert.equal(sumLostAmount([]), 0);
  });
});
```

- [ ] **Step 3: Correr teste e confirmar falha**

Run:

```bash
npm test
```

Expected: FAIL (módulo `./sessionStatsMath` inexistente ou exports em falta).

- [ ] **Step 4: Implementar helpers**

Criar `tuaobet-backend/src/services/sessionStatsMath.ts`:

```typescript
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function sumWonAmount(
  bets: ReadonlyArray<{ amount: number; payout: number | null }>
): number {
  let total = 0;
  for (const bet of bets) {
    if (bet.payout == null) continue;
    total += Math.max(0, bet.payout - bet.amount);
  }
  return round2(total);
}

export function sumLostAmount(bets: ReadonlyArray<{ amount: number }>): number {
  let total = 0;
  for (const bet of bets) {
    total += bet.amount;
  }
  return round2(total);
}
```

Nota: se `round2(1.005)` falhar por IEEE754, ajustar o teste para um caso estável (ex. `round2(1.234) === 1.23`) em vez de mudar a regra de negócio.

- [ ] **Step 5: Correr testes e confirmar PASS**

Run:

```bash
npm test
```

Expected: PASS (todos os asserts).

- [ ] **Step 6: Commit**

```bash
git add tuaobet-backend/package.json tuaobet-backend/package-lock.json tuaobet-backend/src/services/sessionStatsMath.ts tuaobet-backend/src/services/sessionStatsMath.test.ts
git commit -m "$(cat <<'EOF'
feat(auth): add session won/lost aggregation helpers

EOF
)"
```

---

### Task 3: Serviço `sessionStats` (Prisma)

**Files:**
- Create: `tuaobet-backend/src/services/sessionStats.ts`

**Interfaces:**
- Consumes: `prisma`, `sumWonAmount`, `sumLostAmount` de `sessionStatsMath`
- Produces:
  - `recordLoginSession(userId: string): Promise<void>`
  - `getSessionStats(userId: string): Promise<SessionStatsPayload | null>`
  - tipo `SessionStatsPayload`:
    ```typescript
    {
      previousLoginAt: string | null;
      wonAmount: number;
      lostAmount: number;
      balance: number;
      sessionStartedAt: string | null;
      updatedAt: string;
    }
    ```

- [ ] **Step 1: Implementar `sessionStats.ts`**

```typescript
import { prisma } from '../lib/prisma';
import { sumLostAmount, sumWonAmount } from './sessionStatsMath';

export type SessionStatsPayload = {
  previousLoginAt: string | null;
  wonAmount: number;
  lostAmount: number;
  balance: number;
  sessionStartedAt: string | null;
  updatedAt: string;
};

export async function recordLoginSession(userId: string): Promise<void> {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginAt: true },
  });
  if (!user) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      previousLoginAt: user.lastLoginAt,
      lastLoginAt: now,
      currentSessionStartedAt: now,
    },
  });
}

export async function getSessionStats(
  userId: string
): Promise<SessionStatsPayload | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      balance: true,
      previousLoginAt: true,
      currentSessionStartedAt: true,
      createdAt: true,
    },
  });
  if (!user) return null;

  const since = user.currentSessionStartedAt ?? user.createdAt;

  const [wins, losses] = await Promise.all([
    prisma.bet.findMany({
      where: {
        userId,
        result: 'win',
        createdAt: { gte: since },
      },
      select: { amount: true, payout: true },
    }),
    prisma.bet.findMany({
      where: {
        userId,
        result: 'loss',
        createdAt: { gte: since },
      },
      select: { amount: true },
    }),
  ]);

  // Preferível em volume alto: $queryRaw SUM(GREATEST("payout" - "amount", 0)).
  // v1 usa findMany + reduce (helpers puros testáveis).

  return {
    previousLoginAt: user.previousLoginAt?.toISOString() ?? null,
    wonAmount: sumWonAmount(wins),
    lostAmount: sumLostAmount(losses),
    balance: user.balance,
    sessionStartedAt: since.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
```

Se preferires raw SQL já na v1 (spec §5.1), podes substituir os dois `findMany` por:

```typescript
const rows = await prisma.$queryRaw<
  Array<{ won: number | null; lost: number | null }>
>`
  SELECT
    COALESCE(SUM(CASE WHEN result = 'win' THEN GREATEST("payout" - "amount", 0) ELSE 0 END), 0) AS won,
    COALESCE(SUM(CASE WHEN result = 'loss' THEN "amount" ELSE 0 END), 0) AS lost
  FROM "Bet"
  WHERE "userId" = ${userId}
    AND "createdAt" >= ${since}
    AND result IN ('win', 'loss')
`;
```

e mapear com `round2(Number(rows[0].won))` / `round2(Number(rows[0].lost))`. Qualquer das duas abordagens é aceite; a de `findMany` alinha com os testes unitários da Task 2.

- [ ] **Step 2: Commit**

```bash
git add tuaobet-backend/src/services/sessionStats.ts
git commit -m "$(cat <<'EOF'
feat(auth): add sessionStats service for login timestamps and aggregates

EOF
)"
```

---

### Task 4: Hooks em login / register

**Files:**
- Modify: `tuaobet-backend/src/controllers/authController.ts`

**Interfaces:**
- Consumes: `recordLoginSession` de `../services/sessionStats`
- Produces: login atualiza timestamps após credenciais OK; register grava `lastLoginAt` + `currentSessionStartedAt` no create (`previousLoginAt` omitido → null)

- [ ] **Step 1: Atualizar `register`**

Importar no topo:

```typescript
import { recordLoginSession, getSessionStats as fetchSessionStats } from '../services/sessionStats';
```

(`fetchSessionStats` só é usado na Task 5; se preferires, importa só `recordLoginSession` agora e adiciona o outro na Task 5.)

No `prisma.user.create`, em `data`, após `balance`:

```typescript
        balance: 50.00, // Bônus de cadastro
        lastLoginAt: new Date(),
        currentSessionStartedAt: new Date(),
```

Não definir `previousLoginAt` (fica `null`).

- [ ] **Step 2: Atualizar `login`**

Depois do check de `user.status !== UserStatus.ACTIVE` e **antes** de `generateToken`:

```typescript
    await recordLoginSession(user.id);
```

- [ ] **Step 3: Verificação rápida mental / smoke (opcional)**

Com servidor a correr: login duas vezes na mesma conta e confirmar via Prisma Studio / SQL que `previousLoginAt` do segundo login = `lastLoginAt` do primeiro.

- [ ] **Step 4: Commit**

```bash
git add tuaobet-backend/src/controllers/authController.ts
git commit -m "$(cat <<'EOF'
feat(auth): record session timestamps on login and register

EOF
)"
```

---

### Task 5: Endpoint `GET /api/auth/session-stats` + rate limit

**Files:**
- Create: `tuaobet-backend/src/middlewares/sessionStatsRateLimit.ts`
- Modify: `tuaobet-backend/src/controllers/authController.ts`
- Modify: `tuaobet-backend/src/routes/authRoutes.ts`

**Interfaces:**
- Consumes: `authMiddleware`, `fetchSessionStats` / `getSessionStats` do service, padrão de rate limit de `gameRateLimit.ts`
- Produces: `GET /api/auth/session-stats` → JSON §4.1 da spec; 401/403/404 como `getMe`

- [ ] **Step 1: Criar rate limiter**

`tuaobet-backend/src/middlewares/sessionStatsRateLimit.ts` (espelhar `gameRateLimit.ts`):

```typescript
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { AuthRequest } from './authMiddleware';

/** Poll ~2 min no frontend; limite leve por user/IP. */
export const sessionStatsRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SESSION_STATS_RATE_LIMIT_MAX ?? 30),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as AuthRequest).userId;
    if (userId) return `uid:${userId}`;
    return ipKeyGenerator(req.ip ?? 'unknown');
  },
  message: { message: 'Demasiados pedidos de estatísticas de sessão.' },
});
```

- [ ] **Step 2: Adicionar handler no controller**

Em `authController.ts`, exportar (espelhar `getMe` para status):

```typescript
export const getSessionStats = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { status: true },
    });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    if (user.status !== UserStatus.ACTIVE) {
      return res.status(403).json({
        message: user.status === UserStatus.BANNED ? 'Conta banida.' : 'Conta suspensa.',
        code: user.status === UserStatus.BANNED ? 'ACCOUNT_BANNED' : 'ACCOUNT_SUSPENDED',
      });
    }

    const stats = await fetchSessionStats(req.userId);
    if (!stats) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao buscar estatísticas de sessão' });
  }
};
```

Garantir import: `getSessionStats as fetchSessionStats` de `../services/sessionStats`.

- [ ] **Step 3: Registar rota**

Em `authRoutes.ts`:

```typescript
import { login, register, getMe, getSessionStats } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { sessionStatsRateLimiter } from '../middlewares/sessionStatsRateLimit';

// ...
router.get('/me', authMiddleware, getMe);
router.get('/session-stats', authMiddleware, sessionStatsRateLimiter, getSessionStats);
```

- [ ] **Step 4: Verificação manual**

1. Sem token:

```bash
curl -s -o - -w "\n%{http_code}\n" http://localhost:3333/api/auth/session-stats
```

Expected: 401.

2. Com token de conta ACTIVE após login:

```bash
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:3333/api/auth/session-stats
```

Expected JSON com chaves:
`previousLoginAt`, `wonAmount`, `lostAmount`, `balance`, `sessionStartedAt`, `updatedAt`.
Primeiro login pós-migração: `previousLoginAt: null`, won/lost `0`.

3. Segundo login: `previousLoginAt` ≈ instante do login anterior; `sessionStartedAt` ≈ now.

4. (Se possível) criar bet `win` / `loss` com `createdAt` na sessão e confirmar somas; bet `pending` não altera.

- [ ] **Step 5: Commit**

```bash
git add tuaobet-backend/src/middlewares/sessionStatsRateLimit.ts tuaobet-backend/src/controllers/authController.ts tuaobet-backend/src/routes/authRoutes.ts
git commit -m "$(cat <<'EOF'
feat(auth): expose GET /api/auth/session-stats endpoint

EOF
)"
```

---

### Task 6: Critério de pronto (checklist final)

**Files:** nenhum código novo — só verificação.

- [ ] **Step 1: Confirmar migração limpa**

```bash
cd tuaobet-backend && npx prisma migrate status
```

Expected: todas as migrações applied, incluindo `20260910220000_user_session_stats`.

- [ ] **Step 2: Correr unit tests**

```bash
cd tuaobet-backend && npm test
```

Expected: PASS.

- [ ] **Step 3: Checklist de aceitação da spec §7**

Marcar mentalmente / no PR:

1. Primeiro login → `previousLoginAt = null`, `sessionStartedAt` ≈ now, won/lost = 0  
2. Segundo login → `previousLoginAt` = login anterior; won/lost zerados até novas bets  
3. Win na sessão → `wonAmount` sobe `payout - amount`  
4. Loss na sessão → `lostAmount` sobe `amount`  
5. Pending não altera  
6. Bet anterior à sessão fora das somas  
7. Suspenso/banido → 403  
8. Sem token → 401  
9. `balance` espelha `User.balance`

- [ ] **Step 4: (Opcional) Atualizar status do spec para `implemented`**

Em `docs/superpowers/specs/2026-09-10-session-stats-backend-design.md`, mudar `Status: draft` → `Status: implemented` só se o utilizador pedir; caso contrário deixar.

---

## Self-review (plan vs spec)

| Spec § | Coberto por |
|--------|-------------|
| §3 schema + índice Bet | Task 1 |
| §2 / §5.1 agregação won/lost | Task 2 + 3 |
| §4.2 / §4.3 login + register | Task 4 |
| §4.1 endpoint + erros | Task 5 |
| §4.1 rate limit | Task 5 |
| §4.4 me inalterado | implícito (não tocado) |
| §6 security (só próprio user) | Task 5 (`req.userId`) |
| §7 aceitação | Task 6 |
| §8 frontend / WS / logout | fora de escopo — sem tasks |
| Fallback `createdAt` | Task 3 `since` |

Sem placeholders TBD; assinaturas consistentes (`recordLoginSession`, `getSessionStats` / alias `fetchSessionStats` no controller).
