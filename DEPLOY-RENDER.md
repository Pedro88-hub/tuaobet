# Hospedar API de graça (Neon + Render)

## Visão geral

| Peça | Onde |
|------|------|
| Frontend | GitHub Pages → https://pedro88-hub.github.io/tuaobet/ |
| API | Render (free) → `https://tuaobet-api.onrender.com` |
| Postgres | Neon (free) |

## 1. Neon (base de dados)

1. Conta em [neon.tech](https://neon.tech) (GitHub ok).
2. **New Project** → nome `tuaobet` → região próxima (ex. São Paulo se existir, senão US East).
3. Copia a connection string **pooled** (recomendado no free) — começa com `postgresql://...`.
4. Se a URL não tiver `?sslmode=require`, acrescenta no fim: `?sslmode=require` (ou `&sslmode=require` se já houver query).

## 2. Render (API)

1. Conta em [render.com](https://render.com) com o GitHub.
2. **New → Blueprint** → escolhe o repo `Pedro88-hub/tuaobet` (usa o `render.yaml`).
3. Ou **New → Web Service** → mesmo repo:
   - Root Directory: `tuaobet-backend`
   - Build: `npm ci && npm run build`
   - Start: `npm run start:prod`
   - Instance: **Free**
   - Health Check Path: `/health`
4. Environment variables:
   - `DATABASE_URL` = string do Neon
   - `JWT_SECRET` = string longa aleatória (ou deixa o Blueprint gerar)
   - `FRONTEND_URL` = `https://pedro88-hub.github.io,https://tuao.dev.br,https://bet.tuao.dev.br,http://localhost:5173,http://localhost:8080`
   - `ADMIN_EMAILS` = o teu email (opcional)
   - `APISPORTS_FOOTBALL_KEY` = a tua chave (opcional, para desporto)
   - `NODE_ENV` = `production`
5. Deploy. URL típica: `https://tuaobet-api.onrender.com`
6. Testa: `https://tuaobet-api.onrender.com/health` → `{"ok":true,...}`

## 3. Apontar o frontend

No PC, na pasta do projeto:

```powershell
$env:VITE_API_URL = "https://tuaobet-api.onrender.com"
.\deploy-pages.ps1
```

(Substitui pela URL real que o Render mostrar.)

## Notas do plano free

- A API no Render **dorme** ~15 min sem tráfego; o 1º pedido pode demorar 30–60s.
- O workflow [`.github/workflows/keep-api-awake.yml`](.github/workflows/keep-api-awake.yml) faz ping a `/health` a cada 12 min (opcional: secret `API_HEALTH_URL`).
- O histórico do Crash e do Double (últimos 400 cada) fica no Postgres (`CrashRoundResult` / `DoubleRoundResult`) e sobrevive a cold starts.
- Neon free pode suspender projetos inativos; abre o dashboard e “wake” se preciso.
- Não precisas do Docker/túnel no PC para amigos usarem o site (só se quiseres desenvolver localmente).
