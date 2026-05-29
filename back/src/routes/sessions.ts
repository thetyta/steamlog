import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'

const createSchema = z.object({
  gameId: z.string().min(1),
  playedAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().min(1).max(10080),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
})

const updateSchema = z.object({
  playedAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().min(1).max(10080).optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
})

const listQuerySchema = z.object({
  gameId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export async function sessionsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  app.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)

    const game = await prisma.game.findUnique({ where: { id: body.gameId } })
    if (!game) return reply.code(404).send({ error: 'Jogo não encontrado' })

    const session = await prisma.playSession.create({
      data: {
        userId: request.user.sub,
        gameId: body.gameId,
        playedAt: body.playedAt,
        durationMinutes: body.durationMinutes,
        rating: body.rating ?? null,
        note: body.note ?? null,
      },
      include: { game: true },
    })
    return reply.code(201).send(session)
  })

  app.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query)
    const where = {
      userId: request.user.sub,
      ...(query.gameId ? { gameId: query.gameId } : {}),
    }

    const [total, items] = await Promise.all([
      prisma.playSession.count({ where }),
      prisma.playSession.findMany({
        where,
        orderBy: { playedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { game: true },
      }),
    ])

    return { total, page: query.page, pageSize: query.pageSize, items }
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = await prisma.playSession.findFirst({
      where: { id, userId: request.user.sub },
      include: { game: true },
    })
    if (!session) return reply.code(404).send({ error: 'Sessão não encontrada' })
    return session
  })

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateSchema.parse(request.body)

    const owned = await prisma.playSession.findFirst({ where: { id, userId: request.user.sub } })
    if (!owned) return reply.code(404).send({ error: 'Sessão não encontrada' })

    return prisma.playSession.update({ where: { id }, data: body, include: { game: true } })
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const owned = await prisma.playSession.findFirst({ where: { id, userId: request.user.sub } })
    if (!owned) return reply.code(404).send({ error: 'Sessão não encontrada' })

    await prisma.playSession.delete({ where: { id } })
    return reply.code(204).send()
  })
}
