import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
// @ts-expect-error — lib sem typings
import SteamAuth from 'node-steam-openid'
import { env, requireEnv } from '../lib/env.js'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword } from '../lib/password.js'

const publicUserSelect = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  profileUrl: true,
  steamId64: true,
  librarySyncedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(80).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const linkSchema = z.object({
  steamId64: z.string().regex(/^\d{17}$/, 'steamId64 deve ter 17 dígitos'),
})

function makeSteam(returnUrl: string) {
  return new SteamAuth({
    realm: env.BACKEND_URL,
    returnUrl,
    apiKey: requireEnv('STEAM_API_KEY'),
  })
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)

    const exists = await prisma.user.findUnique({ where: { email: body.email } })
    if (exists) return reply.code(409).send({ error: 'E-mail já cadastrado' })

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await hashPassword(body.password),
        displayName: body.displayName ?? body.email.split('@')[0],
      },
      select: publicUserSelect,
    })

    const token = app.jwt.sign({ sub: user.id }, { expiresIn: '7d' })
    return reply.code(201).send({ token, user })
  })

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Credenciais inválidas' })
    }

    const token = app.jwt.sign({ sub: user.id }, { expiresIn: '7d' })
    return {
      token,
      user: await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: publicUserSelect }),
    }
  })

  app.get('/me', { onRequest: [app.authenticate] }, async (request) => {
    return prisma.user.findUniqueOrThrow({
      where: { id: request.user.sub },
      select: publicUserSelect,
    })
  })

  app.post('/steam/link', { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = linkSchema.parse(request.body)
    try {
      return await prisma.user.update({
        where: { id: request.user.sub },
        data: { steamId64: body.steamId64 },
        select: publicUserSelect,
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.code(409).send({ error: 'Esse steamId64 já está vinculado a outra conta' })
      }
      throw err
    }
  })

  app.delete('/steam/link', { onRequest: [app.authenticate] }, async (request) => {
    return prisma.user.update({
      where: { id: request.user.sub },
      data: { steamId64: null },
      select: publicUserSelect,
    })
  })

  // Fluxo OpenID (opcional, requer STEAM_API_KEY): linka a Steam na conta já logada.
  // O front inicia em /auth/steam?token=<JWT>; o token roda no returnUrl pra identificar o usuário no retorno.
  app.get('/steam', async (request, reply) => {
    const { token } = request.query as { token?: string }
    if (!token) return reply.code(400).send({ error: 'token ausente — faça login antes de linkar a Steam' })

    const returnUrl = `${env.BACKEND_URL}/auth/steam/return?token=${encodeURIComponent(token)}`
    const redirectUrl = await makeSteam(returnUrl).getRedirectUrl()
    return reply.redirect(redirectUrl)
  })

  app.get('/steam/return', async (request, reply) => {
    const { token } = request.query as { token?: string }
    if (!token) return reply.code(400).send({ error: 'token ausente no retorno do Steam' })

    let userId: string
    try {
      userId = app.jwt.verify<{ sub: string }>(token).sub
    } catch {
      return reply.code(401).send({ error: 'token inválido' })
    }

    const returnUrl = `${env.BACKEND_URL}/auth/steam/return?token=${encodeURIComponent(token)}`
    const steamUser = await makeSteam(returnUrl).authenticate(request.raw)

    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          steamId64: steamUser.steamid,
          avatarUrl: steamUser.avatar.large,
          profileUrl: steamUser.profile.url,
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.redirect(`${env.FRONTEND_URL}/dashboard?steam=already_linked`)
      }
      throw err
    }

    return reply.redirect(`${env.FRONTEND_URL}/dashboard?steam=linked`)
  })
}
