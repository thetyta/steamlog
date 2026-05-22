import { GoogleGenerativeAI, GoogleAICacheManager } from '@google/generative-ai/server'
import { GoogleGenerativeAI as Client } from '@google/generative-ai'
import { requireEnv } from '../lib/env.js'
import { prisma } from '../lib/prisma.js'

const MODEL = 'models/gemini-2.5-flash'
const CACHE_TTL_SECONDS = 60 * 60

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
  return `Você é um curador de videogames. Recomenda jogos da biblioteca pessoal do usuário com base no humor, tempo disponível e contexto que ele descreve. Sempre devolve JSON válido no formato:
{"items":[{"name":"...","reason":"..."}]}
Escolha 3 a 5 jogos. As razões devem ser curtas (1-2 frases), específicas e em português.`
}

function buildLibraryContext(games: LibraryGameForPrompt[]) {
  const lines = games.map((g) => {
    const genres = g.genres.length ? ` [${g.genres.join(', ')}]` : ''
    const avg = g.avgPlaytimeHours ? ` ~${g.avgPlaytimeHours}h pra zerar` : ''
    return `- ${g.name} — ${g.playtimeHours}h jogadas, status: ${g.status}${genres}${avg}`
  })
  return `Biblioteca do usuário:\n${lines.join('\n')}`
}

export async function ensureLibraryCache(userId: string, games: LibraryGameForPrompt[]) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const stillValid =
    user.geminiCacheName &&
    user.geminiCacheExpiresAt &&
    user.geminiCacheExpiresAt.getTime() > Date.now() + 60_000

  if (stillValid) return user.geminiCacheName!

  if (user.geminiCacheName) {
    await getCacheManager().delete(user.geminiCacheName).catch(() => {})
  }

  const cache = await getCacheManager().create({
    model: MODEL,
    systemInstruction: buildSystemInstruction(),
    contents: [{ role: 'user', parts: [{ text: buildLibraryContext(games) }] }],
    ttlSeconds: CACHE_TTL_SECONDS,
  })

  await prisma.user.update({
    where: { id: userId },
    data: {
      geminiCacheName: cache.name,
      geminiCacheExpiresAt: new Date(Date.now() + CACHE_TTL_SECONDS * 1000),
    },
  })

  return cache.name
}

export type RecommendationInput = {
  mood: string
  timeAvailable?: string
  context?: string
}

export type RecommendationResult = {
  items: { name: string; reason: string }[]
}

export async function generateRecommendations(
  cacheName: string,
  input: RecommendationInput,
): Promise<RecommendationResult> {
  const userMessage = [
    `Humor / vibe: ${input.mood}`,
    input.timeAvailable ? `Tempo disponível: ${input.timeAvailable}` : null,
    input.context ? `Contexto extra: ${input.context}` : null,
    `Responda apenas com o JSON especificado.`,
  ]
    .filter(Boolean)
    .join('\n')

  const model = getAi().getGenerativeModel({ model: MODEL, cachedContent: { name: cacheName } as any })

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: { responseMimeType: 'application/json' },
  })

  const text = result.response.text()
  return JSON.parse(text) as RecommendationResult
}
