# Deploy

Arquitetura: **front (Next.js) na Vercel** + **back (Fastify) no Railway/Render** + **Postgres no Neon**.
As API keys ficam **só no back** — o navegador nunca as recebe.

---

## 1. Banco — Neon (free)

1. Cria um projeto em https://neon.tech e copia a **connection string pooled**.
2. Roda as migrations contra ele:
   ```bash
   cd back
   DATABASE_URL="<string-do-neon>" npx prisma migrate deploy
   ```
3. (Opcional) cria o usuário demo em produção:
   ```bash
   DATABASE_URL="<string-do-neon>" npm run seed
   ```

## 2. Backend — Railway (ou Render)

- Novo projeto a partir do repo, **Root Directory = `back`**.
- Build: `npm run build`  ·  Start: `npm start`
  (o `start` já roda `prisma migrate deploy` antes de subir o servidor)
- **Environment Variables:**

  | Variável | Valor |
  |---|---|
  | `DATABASE_URL` | a string pooled do Neon |
  | `JWT_SECRET` | uma string forte ≥32 chars (`openssl rand -hex 32`) |
  | `FRONTEND_URL` | a URL da Vercel (passo 3) |
  | `BACKEND_URL` | a própria URL pública do Railway |
  | `GEMINI_API_KEY` | sua key (https://aistudio.google.com/apikey) |
  | `STEAM_API_KEY` | sua key (https://steamcommunity.com/dev/apikey) |
  | `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` | opcional (enriquecimento de jogos) |
  | `PORT` | o Railway injeta sozinho |

## 3. Frontend — Vercel

- Importa o repo, **Root Directory = `front`** (Next.js é detectado).
- **Environment Variable** (uma só):

  | Variável | Valor |
  |---|---|
  | `BACKEND_URL` | a URL pública do Railway |

## 4. Ordem (resolve o "ovo-galinha" das URLs)

1. Deploya o **back** primeiro → pega a URL do Railway.
2. Põe ela no `BACKEND_URL` da **Vercel** → deploya o front → pega a URL da Vercel.
3. Põe a URL da Vercel no `FRONTEND_URL` do **Railway** → **redeploy do back**.

---

## Segurança das keys

- `GEMINI_API_KEY` e `STEAM_API_KEY` ficam **só no Railway** (back), como env vars criptografadas. Nunca na Vercel.
- Na Vercel só vai `BACKEND_URL` (uma URL, não é segredo).
- Nada de `NEXT_PUBLIC_` em segredo (o projeto não usa). `.env` está no `.gitignore`.
- **Free tier do Gemini não cobra**: se billing estiver desligado no projeto da key, estourar o limite vira erro 429, não fatura.
- Se desconfiar que uma key vazou, **regenera** no provedor (invalida a antiga na hora).

## Limites embutidos (já no código)

No `POST /recommendations` (`back/src/routes/recommendations.ts`):
- `USER_DAILY_LIMIT` (5/dia por usuário), `GLOBAL_DAILY_LIMIT` (200/dia total), `COOLDOWN_SECONDS` (15s).
- Se o Gemini falhar (limite/instabilidade), retorna 503 com mensagem amigável (sem crash).

## Notas

- Features que dependem de key opcional (Steam, IGDB, Gemini) degradam sozinhas se a key não estiver setada.
- O `start` de produção **não** roda o seed — rode `npm run seed` manualmente se quiser o usuário demo em produção.
