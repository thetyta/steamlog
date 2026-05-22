import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { fetchOwnedGames } from '../services/steam.js'
import { fetchGamesBySteamAppIds } from '../services/igdb.js'

export async function steamRoutes(app: FastifyInstance) {
  app.post('/sync', { onRequest: [app.authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.user.sub } })

    const owned = await fetchOwnedGames(user.steamId64)
    if (owned.length === 0) {
      return reply.code(200).send({
        synced: 0,
        warning: 'Nenhum jogo retornado. Verifique se seu perfil Steam tem detalhes de jogo públicos.',
      })
    }

    const igdbMap = await fetchGamesBySteamAppIds(owned.map((g) => g.appid))

    for (const owned_game of owned) {
      const igdb = igdbMap.get(owned_game.appid)
      const genreNames = igdb?.genres?.map((g) => g.name) ?? []

      const game = await prisma.game.upsert({
        where: { steamAppId: owned_game.appid },
        create: {
          steamAppId: owned_game.appid,
          igdbId: igdb?.id,
          name: igdb?.name ?? owned_game.name,
          summary: igdb?.summary,
          coverUrl: igdb?.cover?.url?.replace('t_thumb', 't_cover_big'),
          releaseDate: igdb?.first_release_date ? new Date(igdb.first_release_date * 1000) : null,
          genres: {
            connectOrCreate: genreNames.map((name) => ({ where: { name }, create: { name } })),
          },
        },
        update: {
          igdbId: igdb?.id,
          name: igdb?.name ?? owned_game.name,
          summary: igdb?.summary,
          coverUrl: igdb?.cover?.url?.replace('t_thumb', 't_cover_big'),
          releaseDate: igdb?.first_release_date ? new Date(igdb.first_release_date * 1000) : null,
          genres: {
            connectOrCreate: genreNames.map((name) => ({ where: { name }, create: { name } })),
          },
        },
      })

      await prisma.libraryEntry.upsert({
        where: { userId_gameId: { userId: user.id, gameId: game.id } },
        create: {
          userId: user.id,
          gameId: game.id,
          playtimeMinutes: owned_game.playtime_forever,
          lastPlayedAt: owned_game.rtime_last_played
            ? new Date(owned_game.rtime_last_played * 1000)
            : null,
        },
        update: {
          playtimeMinutes: owned_game.playtime_forever,
          lastPlayedAt: owned_game.rtime_last_played
            ? new Date(owned_game.rtime_last_played * 1000)
            : null,
        },
      })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        librarySyncedAt: new Date(),
        geminiCacheName: null,
        geminiCacheExpiresAt: null,
      },
    })

    return { synced: owned.length }
  })
}
