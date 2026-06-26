import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { fetchAppDetails } from '../services/steam-store.js'

const listQuerySchema = z.object({
  status: z.enum(['BACKLOG', 'PLAYING', 'COMPLETED', 'ABANDONED']).optional(),
  search: z.string().optional(),
  collectionId: z.string().optional(),
  tagId: z.string().optional(),
  sortBy: z.enum(['name', 'playtime', 'lastPlayed', 'recent']).default('playtime'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
})

const updateBodySchema = z.object({
  status: z.enum(['BACKLOG', 'PLAYING', 'COMPLETED', 'ABANDONED']).optional(),
  userRating: z.number().int().min(1).max(5).nullable().optional(),
  userNote: z.string().max(2000).nullable().optional(),
})

const favoritesSchema = z.object({
  gameIds: z.array(z.string()).max(5),
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

    const gameFilter: Prisma.GameWhereInput = {}
    if (query.search) {
      gameFilter.name = { contains: query.search, mode: 'insensitive' }
    }
    if (query.collectionId) {
      gameFilter.collections = { some: { id: query.collectionId, userId } }
    }
    if (query.tagId) {
      gameFilter.tags = { some: { id: query.tagId, userId } }
    }

    const where = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(Object.keys(gameFilter).length ? { game: gameFilter } : {}),
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

  app.get('/favorites', async (request) => {
    return prisma.libraryEntry.findMany({
      where: { userId: request.user.sub, favoriteRank: { not: null } },
      orderBy: { favoriteRank: 'asc' },
      include: { game: true },
    })
  })

  app.put('/favorites', async (request, reply) => {
    const { gameIds } = favoritesSchema.parse(request.body)
    const userId = request.user.sub

    if (new Set(gameIds).size !== gameIds.length) {
      return reply.code(400).send({ error: 'Jogos duplicados na lista.' })
    }

    if (gameIds.length > 0) {
      const count = await prisma.libraryEntry.count({
        where: { userId, gameId: { in: gameIds } },
      })
      if (count !== gameIds.length) {
        return reply.code(400).send({ error: 'Algum jogo não está na sua biblioteca.' })
      }
    }

    // Limpa o ranking atual e reaplica numa transação — o índice único
    // [userId, favoriteRank] exige que nenhum rank colida no meio do caminho.
    await prisma.$transaction([
      prisma.libraryEntry.updateMany({
        where: { userId, favoriteRank: { not: null } },
        data: { favoriteRank: null },
      }),
      ...gameIds.map((gameId, idx) =>
        prisma.libraryEntry.update({
          where: { userId_gameId: { userId, gameId } },
          data: { favoriteRank: idx + 1 },
        }),
      ),
    ])

    return prisma.libraryEntry.findMany({
      where: { userId, favoriteRank: { not: null } },
      orderBy: { favoriteRank: 'asc' },
      include: { game: true },
    })
  })

  app.get('/:gameId', async (request, reply) => {
    const { gameId } = request.params as { gameId: string }
    const userId = request.user.sub
    const gameInclude = {
      genres: true,
      collections: { where: { userId } },
      tags: { where: { userId } },
    }
    const entry = await prisma.libraryEntry.findUnique({
      where: { userId_gameId: { userId, gameId } },
      include: { game: { include: gameInclude } },
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
            include: gameInclude,
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
