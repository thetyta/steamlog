import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { ensureLibraryCache, generateRecommendations } from '../services/gemini.js'

const createSchema = z.object({
  mood: z.string().min(1).max(200),
  timeAvailable: z.string().max(100).optional(),
  context: z.string().max(500).optional(),
})

const feedbackSchema = z.object({
  feedback: z.enum(['LIKED', 'DISLIKED', 'PLAYED', 'SKIPPED']),
})

export async function recommendationsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  app.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    const userId = request.user.sub

    const library = await prisma.libraryEntry.findMany({
      where: { userId },
      include: { game: { include: { genres: true } } },
    })

    if (library.length === 0) {
      return reply
        .code(400)
        .send({ error: 'Biblioteca vazia. Sincronize com a Steam antes.' })
    }

    const cacheName = await ensureLibraryCache(
      userId,
      library.map((entry) => ({
        name: entry.game.name,
        playtimeHours: Math.round((entry.playtimeMinutes / 60) * 10) / 10,
        status: entry.status,
        genres: entry.game.genres.map((g) => g.name),
        avgPlaytimeHours: entry.game.avgPlaytimeHours,
        summary: entry.game.summary,
      })),
    )

    const ai = await generateRecommendations(cacheName, body)

    const matched = ai.items
      .map((item, idx) => {
        const game = library.find(
          (l) => l.game.name.toLowerCase() === item.name.toLowerCase(),
        )?.game
        return game ? { game, reason: item.reason, rank: idx + 1 } : null
      })
      .filter((x): x is { game: { id: string }; reason: string; rank: number } => x !== null)

    return prisma.recommendation.create({
      data: {
        userId,
        mood: body.mood,
        timeAvailable: body.timeAvailable,
        context: body.context,
        rawResponse: ai as any,
        items: {
          create: matched.map((m) => ({
            gameId: m.game.id,
            rank: m.rank,
            reason: m.reason,
          })),
        },
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
