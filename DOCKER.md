# TuaoBet com Docker (guia para iniciantes)

Este guia explica como subir **PostgreSQL + API + site** no teu computador com um único comando, e como ver a base de dados no **DBeaver**.

## O que vais precisar

1. **Docker Desktop** instalado e a correr (Windows ou Mac).  
   - Download: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
2. **DBeaver** (opcional, para ver/editar dados).  
   - Download: [https://dbeaver.io/download/](https://dbeaver.io/download/)

## Passo 1 — Abrir o terminal na pasta certa

A pasta do projeto deve conter o ficheiro `docker-compose.yml` (a pasta `tuaobet` que tem `tuaobet-backend` e `tuaobet-frontend` dentro).

No PowerShell:

```powershell
cd C:\Users\pedro\Desktop\tuaobet
```

(Ajusta o caminho se o teu projeto estiver noutro sítio.)

## Passo 2 — Construir e iniciar tudo

```powershell
docker compose up --build
```

- Na **primeira** vez demora mais (descarrega imagens e compila).
- Quando aparecerem linhas estáveis sem erros, está pronto.

### Onde abrir o site

- **Site (frontend):** [http://localhost:8080](http://localhost:8080)
- **API (backend):** [http://localhost:3001](http://localhost:3001) (no Docker a API usa a **3001** no teu PC para não chocar com `npm run dev` na 3000)

### Parar os contentores

No mesmo terminal: `Ctrl+C`  
Para apagar também os contentores parados:

```powershell
docker compose down
```

Para apagar **também** os dados da base de dados (começar do zero):

```powershell
docker compose down -v
```

## Passo 3 — Segredo JWT (recomendado)

Por defeito o compose usa um JWT de desenvolvimento. Para definir o teu:

1. Cria um ficheiro `.env` **na mesma pasta** que `docker-compose.yml`:

```env
JWT_SECRET=coloca_aqui_uma_frase_longa_e_aleatoria_sem_espacos
```

2. Volta a subir: `docker compose up --build`

O `docker-compose.yml` já lê `JWT_SECRET` deste ficheiro.

## DBeaver — ligar ao PostgreSQL

O Docker expõe o Postgres na **porta 5432** do teu PC (desde que não tenhas outro Postgres a usar essa porta).

### Dados da ligação

| Campo    | Valor           |
|----------|-----------------|
| Host     | `localhost`     |
| Porta    | `5432`          |
| Base de dados | `tuaobet` |
| Utilizador | `tuaobet`     |
| Palavra-passe | `tuaobet_secret` |

### Passos no DBeaver

1. Abre o DBeaver → **Database** → **New Database Connection**.
2. Escolhe **PostgreSQL** → **Next**.
3. Preenche **Host**, **Port**, **Database**, **Username**, **Password** como na tabela.
4. Clica **Test Connection**.  
   - Se pedir o controlador JDBC, aceita descarregar.
5. Se o teste passar → **Finish**.

### Se der erro “porta em uso”

Outro programa pode estar a usar a 5432. No `docker-compose.yml`, na secção `db` → `ports`, podes mudar para:

```yaml
- "5433:5432"
```

No DBeaver usas então a porta **5433**. (O backend dentro do Docker continua a usar `db:5432`; não precisas alterar o `DATABASE_URL` do serviço `backend`.)

### Ver as tabelas

No explorador do DBeaver: **tuaobet** → **Schemas** → **public** → **Tables**  
Deves ver `User`, `Bet`, `Transaction`.

---

## Resumo dos contentores

| Serviço   | Contentor           | Porta no PC |
|-----------|---------------------|-------------|
| PostgreSQL | `tuaobet-db`       | 5432        |
| Backend   | `tuaobet-backend`   | 3001        |
| Frontend  | `tuaobet-frontend`  | 8080 → 80   |

## Desenvolvimento sem Docker

Se preferires `npm run dev` no backend e no frontend, continua a usar um `.env` no backend com `DATABASE_URL` apontando para o Postgres (local ou Docker só com `docker compose up db`).
