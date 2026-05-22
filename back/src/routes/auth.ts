import type { FastifyInstance } from 'fastify'
// @ts-expect-error — lib sem typings
import SteamAuth from 'node-steam-openid'
import { env, requireEnv } from '../lib/env.js'
import { prisma } from '../lib/prisma.js'

let _steam: SteamAuth | null = null
function getSteam() {
  if (!_steam) {
    _steam = new SteamAuth({
      realm: env.BACKEND_URL,
      returnUrl: `${env.BACKEND_URL}/auth/steam/return`,
      apiKey: requireEnv('STEAM_API_KEY'),
    })
  }
  return _steam
}

export async function authRoutes(app: FastifyInstance) {
  app.get('/steam', async (_request, reply) => {
    const redirectUrl = await getSteam().getRedirectUrl()
    return reply.redirect(redirectUrl)
  })

  app.get('/steam/return', async (request, reply) => {
    const steamUser = await getSteam().authenticate(request.raw)

    const user = await prisma.user.upsert({
      where: { steamId64: steamUser.steamid },
      create: {
        steamId64: steamUser.steamid,
        displayName: steamUser.username,
        avatarUrl: steamUser.avatar.large,
        profileUrl: steamUser.profile.url,
      },
      update: {
        displayName: steamUser.username,
        avatarUrl: steamUser.avatar.large,
        profileUrl: steamUser.profile.url,
      },
    })

    const token = app.jwt.sign({ sub: user.id, steamId64: user.steamId64 }, { expiresIn: '7d' })

    return reply.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`)
  })

  app.get('/me', { onRequest: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.user.sub },
      select: {
        id: true,
        steamId64: true,
        displayName: true,
        avatarUrl: true,
        profileUrl: true,
        librarySyncedAt: true,
      },
    })
    return user
  })
}
