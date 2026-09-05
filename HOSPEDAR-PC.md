# Hospedar TuaoBet no teu PC (Windows) com tuao.dev.br

Objetivo: amigos acedem a **https://tuao.dev.br** (site) e **https://api.tuao.dev.br** (API), sem abrir portas no router — tráfego entra pela **Cloudflare Tunnel**.

## Pré-requisitos

- **Docker Desktop** no Windows (WSL2 ativado se o instalador pedir).
- Domínio **tuao.dev.br** na conta **Registro.br** (ou onde estiver registado).
- Conta **Cloudflare** (plano grátis chega).

## 1. Meter o domínio na Cloudflare

1. Em [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a Site** → `tuao.dev.br`.
2. A Cloudflare dá-te **2 nameservers** (ex.: `xxx.ns.cloudflare.com`).
3. No **Registro.br** → o teu domínio → **DNS** → altera nameservers para os da Cloudflare (propagação pode levar até algumas horas).

Até propagar, o túnel pode falhar nos hostnames; é normal.

## 2. Instalar o cloudflared (Windows)

1. Descarrega o binário em [Developers · Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) (Windows 64-bit).
2. Extrai `cloudflared.exe` para uma pasta fixa, por exemplo `C:\cloudflared\`.
3. (Opcional) Adiciona essa pasta ao **PATH** do Windows para usar `cloudflared` em qualquer terminal.

## 3. Criar o túnel e DNS

Abre **PowerShell** ou **cmd**:

```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel login
```

Abre o browser para autorizar a conta Cloudflare (escolhe a zona **tuao.dev.br**).

```powershell
.\cloudflared.exe tunnel create tuaobet
```

Anota o **UUID** do túnel que aparece.

Cria os registos DNS (apontam para o túnel):

```powershell
.\cloudflared.exe tunnel route dns tuaobet tuao.dev.br
.\cloudflared.exe tunnel route dns tuaobet api.tuao.dev.br
```

## 4. Ficheiro de configuração do túnel

1. Copia `cloudflared\config.example.yml` deste repositório para um sítio fixo, por exemplo `C:\cloudflared\config.yml`.
2. Edita:
   - `tunnel:` → cola o **UUID** do passo anterior.
   - `credentials-file:` → caminho real do `.json` (o `tunnel create` guarda em `C:\Users\<tu>\.cloudflared\<uuid>.json`).

Confirma que os `hostname` batem certo com o que vais usar: **tuao.dev.br** e **api.tuao.dev.br**.

## 5. Subir o TuaoBet com URLs públicas

Na pasta raiz do projeto (onde está `docker-compose.yml`):

1. Cria ou edita o ficheiro **`.env`** na raiz com (ajusta se usares outros subdomínios):

```env
PUBLIC_API_URL=https://api.tuao.dev.br
PUBLIC_FRONTEND_URL=https://tuao.dev.br,http://localhost:8080,http://localhost:5173
JWT_SECRET=um_segredo_longo_aleatorio_minimo_32_caracteres
```

2. Arranca com o override **home**:

```powershell
docker compose -f docker-compose.yml -f docker-compose.home.yml up -d --build
```

Isto faz **rebuild** do frontend com `VITE_API_URL=https://api.tuao.dev.br` e configura o **CORS** do backend para aceitar **https://tuao.dev.br** (e ainda localhost para testes locais).

3. Confirma que responde em casa:

- `http://localhost:8080` → site
- `http://localhost:3001/api/...` → API (se tiveres rota pública para testar)

## 6. Arrancar o túnel (sempre que quiseres o site no ar)

```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel --config C:\cloudflared\config.yml run tuaobet
```

Deixa esta janela aberta (ou configura como **serviço Windows** — vê a doc Cloudflare “Run as a service”).

## 7. Testar com os amigos

- Site: **https://tuao.dev.br**
- A API não precisa de ser aberta manualmente no browser; o site chama **https://api.tuao.dev.br**.

Se o login ou os jogos em tempo real falharem, confirma na consola do browser (F12 → Network) se os pedidos vão para **api.tuao.dev.br** e se não há erros de CORS.

## Notas importantes

- O **PC tem de estar ligado** e o **Docker** a correr; senão o site cai.
- Desativa **hibernação** / sleep agressivo enquanto quiseres hospedar.
- A porta **5432** do Postgres está exposta no `docker-compose.yml` para o **teu PC** (DBeaver). Não abras essa porta no router; com túnel **não** ficas a expor a BD à internet.
- **JWT_SECRET** e password da BD: usa valores fortes; o `.env` não deve ir para o Git.
- Se mudares `PUBLIC_API_URL` ou `PUBLIC_FRONTEND_URL`, volta a correr `docker compose ... up -d --build` para o frontend apanhar o novo `VITE_API_URL`.

## Comando rápido (referência)

```powershell
docker compose -f docker-compose.yml -f docker-compose.home.yml up -d --build
```

```powershell
.\cloudflared.exe tunnel --config C:\cloudflared\config.yml run tuaobet
```
