import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export async function statsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  app.get('/', async (request) => {
    const userId = request.user.sub

    const [totals, byStatus, topGenres] = await Promise.all([
      prisma.libraryEntry.aggregate({
        where: { userId },
        _sum: { playtimeMinutes: true },
        _count: true,
      }),
      prisma.libraryEntry.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      prisma.$queryRaw<{ name: string; count: bigint }[]>`
        SELECT g.name, COUNT(*)::bigint as count
        FROM "LibraryEntry" le
        JOIN "Game" gm ON gm.id = le."gameId"
        JOIN "_GameToGenre" gg ON gg."A" = gm.id
        JOIN "Genre" g ON g.id = gg."B"
        WHERE le."userId" = ${userId}
        GROUP BY g.name
        ORDER BY count DESC
        LIMIT 10
      `,
    ])

    return {
      totalGames: totals._count,
      totalHours: Math.round(((totals._sum.playtimeMinutes ?? 0) / 60) * 10) / 10,
      byStatus: byStatus.reduce<Record<string, number>>((acc, row) => {
        acc[row.status] = row._count
        return acc
      }, {}),
      topGenres: topGenres.map((g) => ({ name: g.name, count: Number(g.count) })),
    }
  })
}
