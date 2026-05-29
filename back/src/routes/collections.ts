import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

const createSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
})

const addGameSchema = z.object({
  gameId: z.string().min(1),
})

export async function collectionsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  app.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    try {
      const collection = await prisma.collection.create({
        data: { userId: request.user.sub, name: body.name, description: body.description ?? null },
      })
      return reply.code(201).send(collection)
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.code(409).send({ error: 'Você já tem uma coleção com esse nome' })
      }
      throw err
    }
  })

  app.get('/', async (request) => {
    return prisma.collection.findMany({
      where: { userId: request.user.sub },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { games: true } } },
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const collection = await prisma.collection.findFirst({
      where: { id, userId: request.user.sub },
      include: { games: { include: { genres: true } } },
    })
    if (!collection) return reply.code(404).send({ error: 'Coleção não encontrada' })
    return collection
  })

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateSchema.parse(request.body)

    const owned = await prisma.collection.findFirst({ where: { id, userId: request.user.sub } })
    if (!owned) return reply.code(404).send({ error: 'Coleção não encontrada' })

    try {
      return await prisma.collection.update({ where: { id }, data: body })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.code(409).send({ error: 'Você já tem uma coleção com esse nome' })
      }
      throw err
    }
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const owned = await prisma.collection.findFirst({ where: { id, userId: request.user.sub } })
    if (!owned) return reply.code(404).send({ error: 'Coleção não encontrada' })

    await prisma.collection.delete({ where: { id } })
    return reply.code(204).send()
  })

  app.post('/:id/games', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = addGameSchema.parse(request.body)

    const owned = await prisma.collection.findFirst({ where: { id, userId: request.user.sub } })
    if (!owned) return reply.code(404).send({ error: 'Coleção não encontrada' })

    const game = await prisma.game.findUnique({ where: { id: body.gameId } })
    if (!game) return reply.code(404).send({ error: 'Jogo não encontrado' })

    return prisma.collection.update({
      where: { id },
      data: { games: { connect: { id: body.gameId } } },
      include: { games: true },
    })
  })

  app.delete('/:id/games/:gameId', async (request, reply) => {
    const { id, gameId } = request.params as { id: string; gameId: string }

    const owned = await prisma.collection.findFirst({ where: { id, userId: request.user.sub } })
    if (!owned) return reply.code(404).send({ error: 'Coleção não encontrada' })

    return prisma.collection.update({
      where: { id },
      data: { games: { disconnect: { id: gameId } } },
      include: { games: true },
    })
  })
}
