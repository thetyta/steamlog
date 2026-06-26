import { GoogleAICacheManager } from '@google/generative-ai/server'
import { GoogleGenerativeAI as Client } from '@google/generative-ai'
import { requireEnv } from '../lib/env.js'
import { prisma } from '../lib/prisma.js'

const MODEL = 'models/gemini-2.5-flash'
const CACHE_TTL_SECONDS = 60 * 60
// O Gemini só aceita criar um cachedContent com no mínimo 1024 tokens.
// Bibliotecas pequenas ficam abaixo disso, então caímos pro modo inline.
const MIN_CACHE_TOKENS = 1024

let _cacheManager: GoogleAICacheManager | null = null
let _ai: Client | null = null

function getCacheManager() {
  if (!_cacheManager) _cacheManager = new GoogleAICacheManager(requireEnv('GEMINI_API_KEY'))
  return _cacheManager
}

function getAi() {
  if (!_ai) _ai = new Client(requireEnv('GEMINI_API_KEY'))
  return _ai
}

type LibraryGameForPrompt = {
  name: string
  playtimeHours: number
  status: string
  genres: string[]
  avgPlaytimeHours: number | null
  summary: string | null
}

function buildSystemInstruction() {
  return `Você é um curador de videogames. Com base no humor, tempo disponível e contexto do usuário — e no PERFIL e BIBLIOTECA dele — você faz duas listas de recomendação.

Devolva SEMPRE um JSON válido exatamente neste formato:
{"library":[{"name":"...","reason":"..."}],"buy":[{"name":"...","reason":"..."}]}

Regras:
- "library": 3 a 5 jogos que o usuário JÁ TEM. Use apenas nomes que aparecem na biblioteca fornecida, escritos exatamente igual.
- "buy": 3 a 5 jogos que o usuário NÃO possui e que valeria a pena comprar, combinando com o gosto/perfil dele. Nunca repita jogos da biblioteca; sugira títulos reais e existentes.
- Leve em conta o perfil: o que ele costuma jogar, gêneros favoritos, o que está jogando agora e o backlog.
- Se houver "Histórico de feedback", use-o pra refinar: priorize o estilo dos jogos que ele CURTIU, evite os parecidos com os que ele NÃO CURTIU, e não repita na lista da biblioteca jogos que ele marcou como JOGOU.
- As razões devem ser curtas (1-2 frases), específicas e em português. Em "buy", diga por que combina com o perfil dele.`
}

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: 'no backlog',
  PLAYING: 'jogando agora',
  COMPLETED: 'zerados',
  ABANDONED: 'largados',
}

function buildPlayerProfile(games: LibraryGameForPrompt[]) {
  const byStatus: Record<string, number> = {}
  const byGenre: Record<string, number> = {}
  let totalHours = 0

  for (const g of games) {
    byStatus[g.status] = (byStatus[g.status] ?? 0) + 1
    totalHours += g.playtimeHours
    for (const genre of g.genres) byGenre[genre] = (byGenre[genre] ?? 0) + 1
  }

  const statusLine =
    Object.entries(byStatus)
      .map(([s, n]) => `${n} ${STATUS_LABEL[s] ?? s.toLowerCase()}`)
      .join(', ') || 'sem dados'

  const topGenres =
    Object.entries(byGenre)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([g, n]) => `${g} (${n})`)
      .join(', ') || 'sem gêneros'

  const mostPlayed = [...games]
    .sort((a, b) => b.playtimeHours - a.playtimeHours)
    .slice(0, 5)
    .map((g) => `${g.name} (${Math.round(g.playtimeHours)}h)`)
    .join(', ')

  return `Perfil do jogador:
- ${games.length} jogos na biblioteca, ~${Math.round(totalHours)}h jogadas no total.
- Por status: ${statusLine}.
- Gêneros mais presentes: ${topGenres}.
- Mais jogados: ${mostPlayed}.`
}

function buildLibraryContext(games: LibraryGameForPrompt[]) {
  const lines = games.map((g) => {
    const genres = g.genres.length ? ` [${g.genres.join(', ')}]` : ''
    const avg = g.avgPlaytimeHours ? ` ~${g.avgPlaytimeHours}h pra zerar` : ''
    return `- ${g.name} — ${g.playtimeHours}h jogadas, status: ${g.status}${genres}${avg}`
  })
  return `${buildPlayerProfile(games)}\n\nBiblioteca do usuário:\n${lines.join('\n')}`
}

/** Estimativa barata de tokens (~4 chars/token) pra evitar uma chamada que já sabemos que falharia. */
function estimateTokens(text: string) {
  return Math.ceil(text.length / 4)
}

/**
 * Garante um cachedContent reaproveitável pra biblioteca do usuário.
 * Retorna `null` quando a biblioteca é pequena demais pra cachear (ou se a
 * criação falhar) — nesse caso o chamador manda o contexto inline.
 */
async function ensureLibraryCache(
  userId: string,
  systemInstruction: string,
  libraryContext: string,
): Promise<string | null> {
  if (estimateTokens(systemInstruction + libraryContext) < MIN_CACHE_TOKENS) {
    return null
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const stillValid =
    user.geminiCacheName &&
    user.geminiCacheExpiresAt &&
    user.geminiCacheExpiresAt.getTime() > Date.now() + 60_000

  if (stillValid) return user.geminiCacheName!

  if (user.geminiCacheName) {
    await getCacheManager().delete(user.geminiCacheName).catch(() => {})
  }

  try {
    const cache = await getCacheManager().create({
      model: MODEL,
      systemInstruction,
      contents: [{ role: 'user', parts: [{ text: libraryContext }] }],
      ttlSeconds: CACHE_TTL_SECONDS,
    })

    await prisma.user.update({
      where: { id: userId },
      data: {
        geminiCacheName: cache.name,
        geminiCacheExpiresAt: new Date(Date.now() + CACHE_TTL_SECONDS * 1000),
      },
    })

    return cache.name ?? null
  } catch {
    // Fallback seguro: segue sem cache (modo inline).
    return null
  }
}

export type RecommendationInput = {
  mood: string
  timeAvailable?: string
  context?: string
}

export type FeedbackSummary = {
  liked: string[]
  disliked: string[]
  played: string[]
  skipped: string[]
}

function buildFeedbackContext(fb?: FeedbackSummary): string | null {
  if (!fb) return null
  const lines: string[] = []
  if (fb.liked.length) lines.push(`- Curtiu (puxe mais nessa pegada): ${fb.liked.join(', ')}`)
  if (fb.disliked.length)
    lines.push(`- Não curtiu (evite parecidos): ${fb.disliked.join(', ')}`)
  if (fb.played.length)
    lines.push(`- Já jogou (não repita na lista da biblioteca): ${fb.played.join(', ')}`)
  if (fb.skipped.length) lines.push(`- Pulou (menos prioridade): ${fb.skipped.join(', ')}`)
  if (!lines.length) return null
  return `Histórico de feedback do usuário em recomendações anteriores:\n${lines.join('\n')}`
}

export type RecommendationPick = { name: string; reason: string }

export type RecommendationResult = {
  library: RecommendationPick[]
  buy: RecommendationPick[]
}

export async function generateRecommendations(
  userId: string,
  games: LibraryGameForPrompt[],
  input: RecommendationInput,
  feedback?: FeedbackSummary,
): Promise<RecommendationResult> {
  const systemInstruction = buildSystemInstruction()
  const libraryContext = buildLibraryContext(games)
  const cacheName = await ensureLibraryCache(userId, systemInstruction, libraryContext)

  // O feedback vai na mensagem do pedido (não no cache da biblioteca), pra o
  // cachedContent continuar reaproveitável mesmo quando o feedback muda.
  const userMessage = [
    buildFeedbackContext(feedback),
    `Humor / vibe: ${input.mood}`,
    input.timeAvailable ? `Tempo disponível: ${input.timeAvailable}` : null,
    input.context ? `Contexto extra: ${input.context}` : null,
    `Responda apenas com o JSON especificado.`,
  ]
    .filter(Boolean)
    .join('\n')

  // Com cache: o sistema + biblioteca já vivem no cachedContent.
  // Sem cache: mandamos tudo inline (system instruction + biblioteca + pedido).
  const model = cacheName
    ? getAi().getGenerativeModel({ model: MODEL, cachedContent: { name: cacheName } as any })
    : getAi().getGenerativeModel({ model: MODEL, systemInstruction })

  const contents = cacheName
    ? [{ role: 'user' as const, parts: [{ text: userMessage }] }]
    : [
        { role: 'user' as const, parts: [{ text: libraryContext }] },
        { role: 'user' as const, parts: [{ text: userMessage }] },
      ]

  const result = await model.generateContent({
    contents,
    generationConfig: { responseMimeType: 'application/json' },
  })

  const text = result.response.text()
  const parsed = JSON.parse(text) as Partial<RecommendationResult>

  const clean = (list: unknown): RecommendationPick[] =>
    Array.isArray(list)
      ? list
          .filter(
            (p): p is RecommendationPick =>
              !!p && typeof p.name === 'string' && typeof p.reason === 'string',
          )
          .map((p) => ({ name: p.name.trim(), reason: p.reason.trim() }))
      : []

  return { library: clean(parsed.library), buy: clean(parsed.buy) }
}
