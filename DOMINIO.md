# Domínio oficial: bet.tuao.dev.br + api.tuao.dev.br

Hoje o site e a API estão no GitHub Pages / Render. O domínio oficial fica assim:

| Host | Destino |
|------|---------|
| `bet.tuao.dev.br` | GitHub Pages (frontend) |
| `api.tuao.dev.br` | Render `tuaobet.onrender.com` (API) |

O túnel Cloudflare no PC **deixa de ser necessário** para estes dois hosts.

---

## 1. Cloudflare DNS (dash.cloudflare.com → tuao.dev.br → DNS)

Apaga ou edita os registos antigos do **túnel** para `bet` e `api`.

### Site

Tipo **CNAME**:

- **Name:** `bet`
- **Target:** `pedro88-hub.github.io`
- **Proxy:** DNS only (cinzento) no início; depois podes ligar o proxy laranja se quiseres

### API

Tipo **CNAME**:

- **Name:** `api`
- **Target:** `tuaobet.onrender.com`
- **Proxy:** DNS only (cinzento) recomendado com o SSL do Render

---

## 2. GitHub Pages (custom domain)

1. Repo → **Settings** → **Pages**
2. **Custom domain:** `bet.tuao.dev.br` → Save
3. Liga **Enforce HTTPS** quando o certificado ficar pronto (pode demorar alguns minutos)

O ficheiro `CNAME` na branch `gh-pages` já é publicado pelo `deploy-pages.ps1`.

---

## 3. Render (custom domain da API)

1. Serviço **tuaobet** → **Settings** → **Custom Domains**
2. Add: `api.tuao.dev.br`
3. Segue o CNAME que o Render mostrar (normalmente `tuaobet.onrender.com`)
4. Em **Environment**, atualiza se ainda não tiveres:

```
FRONTEND_URL=https://bet.tuao.dev.br,https://tuao.dev.br,https://pedro88-hub.github.io,http://localhost:5173,http://localhost:8080
```

(O código já inclui estes defaults; a env no Render reforça.)

---

## 4. Republicar frontend (já feito no PC com o script)

```powershell
.\deploy-pages.ps1
```

Isto gera o site com `base: /` e `VITE_API_URL=https://api.tuao.dev.br`.

---

## 5. Testar

- https://bet.tuao.dev.br  
- https://api.tuao.dev.br/health → `{"ok":true,...}`

Propagação DNS: minutos a algumas horas.
