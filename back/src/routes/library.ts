import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { fetchAppDetails } from '../services/steam-store.js'

const listQuerySchema = z.object({
  status: z.enum(['BACKLOG', 'PLAYING', 'COMPLETED', 'ABANDONED']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'playtime', 'lastPlayed', 'recent']).default('playtime'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
})

const updateBodySchema = z.object({
  status: z.enum(['BACKLOG', 'PLAYING', 'COMPLETED', 'ABANDONED']).optional(),
  userRating: z.number().int().min(1).max(5).nullable().optional(),
  userNote: z.string().max(2000).nullable().optional(),
})

export async function libraryRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  app.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query)
    const userId = request.user.sub

    const orderBy =
      query.sortBy === 'name'
        ? { game: { name: 'asc' as const } }
        : query.sortBy === 'playtime'
          ? { playtimeMinutes: 'desc' as const }
          : query.sortBy === 'lastPlayed'
            ? { lastPlayedAt: 'desc' as const }
            : { updatedAt: 'desc' as const }

    const where = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { game: { name: { contains: query.search, mode: 'insensitive' as const } } }
        : {}),
    }

    const [total, items] = await Promise.all([
      prisma.libraryEntry.count({ where }),
      prisma.libraryEntry.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { game: { include: { genres: true } } },
      }),
    ])

    return { total, page: query.page, pageSize: query.pageSize, items }
  })

  app.get('/:gameId', async (request, reply) => {
    const { gameId } = request.params as { gameId: string }
    const entry = await prisma.libraryEntry.findUnique({
      where: { userId_gameId: { userId: request.user.sub, gameId } },
      include: { game: { include: { genres: true } } },
    })
    if (!entry) return reply.code(404).send({ error: 'Not in library' })

    if (!entry.game.steamFetchedAt) {
      try {
        const details = await fetchAppDetails(entry.game.steamAppId)
        if (details) {
          const updated = await prisma.game.update({
            where: { id: entry.game.id },
            data: {
              isFree: details.isFree,
              priceCents: details.priceCents,
              headerImageUrl: details.headerImageUrl,
              screenshots: details.screenshots as object,
              detailedSummary: details.detailedSummary,
              steamFetchedAt: new Date(),
            },
            include: { genres: true },
          })
          return { ...entry, game: updated }
        }
        await prisma.game.update({
          where: { id: entry.game.id },
          data: { steamFetchedAt: new Date() },
        })
      } catch (err) {
        request.log.warn({ err, steamAppId: entry.game.steamAppId }, 'Steam Store fetch failed')
      }
    }

    return entry
  })

  app.patch('/:gameId', async (request, reply) => {
    const { gameId } = request.params as { gameId: string }
    const body = updateBodySchema.parse(request.body)

    const entry = await prisma.libraryEntry.findUnique({
      where: { userId_gameId: { userId: request.user.sub, gameId } },
    })
    if (!entry) return reply.code(404).send({ error: 'Not in library' })

    return prisma.libraryEntry.update({
      where: { userId_gameId: { userId: request.user.sub, gameId } },
      data: body,
      include: { game: true },
    })
  })
}
