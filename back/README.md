# Backend — Recomendador Steam + Gemini

Guia de execução do backend. Todos os comandos são rodados a partir desta pasta (`back/`).

## Pré-requisitos

- **Node.js** 20+ (ou 22+)
- **Docker** + **Docker Compose**
- **Chaves de API** (gratuitas):
  - [Steam Web API Key](https://steamcommunity.com/dev/apikey)
  - [IGDB / Twitch](https://api-docs.igdb.com) — exige criar app em [dev.twitch.tv](https://dev.twitch.tv)
  - [Gemini API Key](https://aistudio.google.com/apikey)

## 1. Configurar variáveis de ambiente

Copie o template e preencha as chaves:

```bash
cp .env.example .env
```

### Obrigatórias (servidor não sobe sem elas)

| Variável                                        | Como obter                                                    |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `POSTGRES_PASSWORD`                             | Defina uma senha qualquer                                     |
| `DATABASE_URL`                                  | Precisa bater com `POSTGRES_USER/PASSWORD/DB/PORT`            |
| `JWT_SECRET`                                    | Gere com `openssl rand -hex 32`                               |

### Opcionais (servidor sobe; rotas que dependem delas falham se chamadas)

| Variável                                        | Habilita                                          | Como obter                  |
| ----------------------------------------------- | ------------------------------------------------- | --------------------------- |
| `STEAM_API_KEY`                                 | Login via Steam e sync da biblioteca              | Steam Web API               |
| `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET`         | Enriquecer metadados de jogos (gêneros, capa)     | Twitch Developer Console    |
| `GEMINI_API_KEY`                                | Recomendações geradas por IA                      | Google AI Studio            |

> O backend valida o `.env` com Zod no startup. As obrigatórias falham rápido se faltarem; as opcionais só falham quando uma rota que depende delas é chamada (erro claro: "Variável X não configurada").

## 2. Subir o banco (PostgreSQL via Docker)

```bash
docker compose up -d
```

- O Compose lê automaticamente o `.env` da mesma pasta pra interpolar as variáveis (`${POSTGRES_USER}` etc.) no `docker-compose.yml`.
- `-d` roda em background.
- A imagem `postgres:16-alpine` é **baixada automaticamente** do Docker Hub na primeira execução. Não há build local.

Confira se o container está saudável:

```bash
docker compose ps
```

Espere o status virar `healthy` antes de seguir.

### Se o pull automático falhar

Se a rede estiver instável ou houver problema de proxy, dá pra baixar a imagem manualmente antes:

```bash
docker pull postgres:16-alpine
```

Depois rode `docker compose up -d` normalmente — ele usa a imagem local já baixada.

## 3. Instalar dependências

```bash
npm install
```

## 4. Gerar o Prisma Client

```bash
npm run prisma:generate
```

Gera o cliente tipado a partir de `prisma/schema.prisma`. Precisa ser rodado sempre que o schema mudar.

## 5. Rodar o servidor

```bash
npm run dev
```

Este script faz duas coisas em sequência:

1. **`prisma migrate deploy`** — aplica todas as migrations pendentes de `prisma/migrations/` no banco.
2. **`tsx --env-file=.env src/server.ts`** — sobe o Fastify, escutando por padrão em `http://localhost:3333`.

> Se você alterar o `schema.prisma` e precisar criar uma **nova** migration, rode `npm run prisma:migrate` manualmente — ele é interativo e pede o nome da migration.


## Coleção Postman

Em `postman/des-web.postman_collection.json` tem todos os endpoints prontos pra importar no Postman (ou Insomnia, que aceita o mesmo formato).

**Como usar:**

1. No Postman: **Import** → selecione `postman/des-web.postman_collection.json`.
2. Edite as variáveis da coleção:
   - `baseUrl` → já vem como `http://localhost:3333`.
   - `token` → cole o JWT obtido após login Steam (extraído da URL de callback `?token=...`).
   - `gameId`, `recommendationId`, `recommendationItemId` → preencha conforme for testando.
3. A coleção já tem auth Bearer configurada no nível da coleção — endpoints públicos (`/health`, `/games/:id`, `/auth/steam*`) sobrescrevem pra `noauth`.

## Estrutura

```
back/
├── docker-compose.yml      # Serviço do Postgres
├── postman/                # Coleção Postman dos endpoints
├── prisma/
│   ├── schema.prisma       # Modelo de dados
│   └── migrations/         # Histórico de migrations
└── src/
    ├── server.ts           # Entrypoint do Fastify
    ├── plugins/            # Plugins (cors, jwt, etc.)
    ├── routes/             # Rotas HTTP
    ├── services/           # Integrações (Steam, IGDB, Gemini)
    └── lib/                # Utilitários (env, prisma client)
```

## Fluxo resumido (TL;DR)

```bash
cp .env.example .env             # preencha as chaves
docker compose up -d
npm install
npm run prisma:generate
npm run dev                      # já roda migrate deploy + servidor
```
