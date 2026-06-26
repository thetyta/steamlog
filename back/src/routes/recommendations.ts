import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import {
  generateRecommendations,
  type FeedbackSummary,
  type RecommendationResult,
} from '../services/gemini.js'
import { searchSteamAppId } from '../services/steam-store.js'

const createSchema = z.object({
  mood: z.string().min(1).max(200),
  timeAvailable: z.string().max(100).optional(),
  context: z.string().max(500).optional(),
})

const feedbackSchema = z.object({
  feedback: z.enum(['LIKED', 'DISLIKED', 'PLAYED', 'SKIPPED']),
})

// Limites pra racionar a cota gratuita do Gemini (não há cobrança na free tier;
// isso evita estourar o limite diário compartilhado e degrada com elegância).
const USER_DAILY_LIMIT = 5
const GLOBAL_DAILY_LIMIT = 200
const COOLDOWN_SECONDS = 15

export async function recommendationsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  app.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const userId = request.user.sub

    // --- Rate limiting: protege a cota gratuita do Gemini (checa antes do trabalho caro) ---
    const now = Date.now()
    const since24h = new Date(now - 24 * 60 * 60 * 1000)

    const lastRec = await prisma.recommendation.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    if (lastRec && now - lastRec.createdAt.getTime() < COOLDOWN_SECONDS * 1000) {
      return reply
        .code(429)
        .send({ error: 'Espere alguns segundos antes de pedir outra recomendação.' })
    }

    const userToday = await prisma.recommendation.count({
      where: { userId, createdAt: { gte: since24h } },
    })
    if (userToday >= USER_DAILY_LIMIT) {
      return reply.code(429).send({
        error: `Você atingiu o limite de ${USER_DAILY_LIMIT} recomendações por dia. Tente de novo amanhã.`,
      })
    }

    const globalToday = await prisma.recommendation.count({
      where: { createdAt: { gte: since24h } },
    })
    if (globalToday >= GLOBAL_DAILY_LIMIT) {
      return reply.code(429).send({
        error: 'O serviço de recomendações atingiu o limite diário. Tente novamente amanhã.',
      })
    }

    const library = await prisma.libraryEntry.findMany({
      where: { userId },
      include: { game: { include: { genres: true } } },
    })

    if (library.length === 0) {
      return reply
        .code(400)
        .send({ error: 'Biblioteca vazia. Sincronize com a Steam antes.' })
    }

    // Histórico de feedback pra refinar (mais recente primeiro; dedupe por jogo, com cap).
    const feedbackEntries = await prisma.recommendationItem.findMany({
      where: { recommendation: { userId }, userFeedback: { not: null } },
      select: { name: true, userFeedback: true, game: { select: { name: true } } },
      orderBy: { recommendation: { createdAt: 'desc' } },
      take: 120,
    })

    const FEEDBACK_CAP = 15
    const seenFeedback = new Set<string>()
    const feedback: FeedbackSummary = { liked: [], disliked: [], played: [], skipped: [] }
    for (const entry of feedbackEntries) {
      const name = entry.game?.name ?? entry.name
      if (!name) continue
      const key = name.toLowerCase()
      if (seenFeedback.has(key)) continue
      seenFeedback.add(key)
      const bucket =
        entry.userFeedback === 'LIKED'
          ? feedback.liked
          : entry.userFeedback === 'DISLIKED'
            ? feedback.disliked
            : entry.userFeedback === 'PLAYED'
              ? feedback.played
              : feedback.skipped
      if (bucket.length < FEEDBACK_CAP) bucket.push(name)
    }

    let ai: RecommendationResult
    try {
      ai = await generateRecommendations(
        userId,
        library.map((entry) => ({
          name: entry.game.name,
          playtimeHours: Math.round((entry.playtimeMinutes / 60) * 10) / 10,
          status: entry.status,
          genres: entry.game.genres.map((g) => g.name),
          avgPlaytimeHours: entry.game.avgPlaytimeHours,
          summary: entry.game.summary,
        })),
        body,
        feedbackEntries.length > 0 ? feedback : undefined,
      )
    } catch (err) {
      request.log.error({ err }, 'Falha ao gerar recomendação (Gemini)')
      return reply.code(503).send({
        error:
          'A IA está temporariamente indisponível (limite ou instabilidade). Tente de novo em alguns minutos.',
      })
    }

    const inLibrary = (name: string) =>
      library.some((l) => l.game.name.toLowerCase() === name.toLowerCase())

    // "library": casa por nome exato com a biblioteca; descarta o que não bater.
    const ownedItems: Prisma.RecommendationItemCreateWithoutRecommendationInput[] = []
    for (const item of ai.library) {
      const game = library.find(
        (l) => l.game.name.toLowerCase() === item.name.toLowerCase(),
      )?.game
      if (!game) continue
      ownedItems.push({
        name: game.name,
        kind: 'OWNED',
        rank: ownedItems.length + 1,
        reason: item.reason,
        game: { connect: { id: game.id } },
      })
    }

    // "buy": jogos fora da biblioteca; ignora qualquer um que o usuário já tenha.
    const buyPicks = ai.buy.filter((item) => !inLibrary(item.name))
    // Resolve o appId da Steam de cada um (em paralelo) pra capa + link reais.
    const buyAppIds = await Promise.all(buyPicks.map((p) => searchSteamAppId(p.name)))
    const buyItems: Prisma.RecommendationItemCreateWithoutRecommendationInput[] = buyPicks.map(
      (item, idx) => ({
        name: item.name,
        kind: 'BUY' as const,
        rank: idx + 1,
        reason: item.reason,
        steamAppId: buyAppIds[idx],
      }),
    )

    return prisma.recommendation.create({
      data: {
        userId,
        mood: body.mood,
        timeAvailable: body.timeAvailable,
        context: body.context,
        rawResponse: ai as unknown as Prisma.InputJsonValue,
        items: { create: [...ownedItems, ...buyItems] },
      },
      include: { items: { include: { game: true }, orderBy: { rank: 'asc' } } },
    })
  })

  app.get('/', async (request) => {
    return prisma.recommendation.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { game: true }, orderBy: { rank: 'asc' } } },
      take: 50,
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const rec = await prisma.recommendation.findFirst({
      where: { id, userId: request.user.sub },
      include: { items: { include: { game: true }, orderBy: { rank: 'asc' } } },
    })
    if (!rec) return reply.code(404).send({ error: 'Not found' })
    return rec
  })

  app.post('/items/:itemId/feedback', async (request, reply) => {
    const { itemId } = request.params as { itemId: string }
    const body = feedbackSchema.parse(request.body)

    const item = await prisma.recommendationItem.findFirst({
      where: { id: itemId, recommendation: { userId: request.user.sub } },
    })
    if (!item) return reply.code(404).send({ error: 'Not found' })

    return prisma.recommendationItem.update({
      where: { id: itemId },
      data: { userFeedback: body.feedback },
    })
  })
}
