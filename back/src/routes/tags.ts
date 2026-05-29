import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color deve ser hex tipo #1a2b3c')

const createSchema = z.object({
  name: z.string().min(1).max(40),
  color: hexColor.nullable().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(40).optional(),
  color: hexColor.nullable().optional(),
})

export async function tagsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.authenticate)

  app.post('/', async (request, reply) => {
    const body = createSchema.parse(request.body)
    try {
      const tag = await prisma.tag.create({
        data: { userId: request.user.sub, name: body.name, color: body.color ?? null },
      })
      return reply.code(201).send(tag)
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.code(409).send({ error: 'Você já tem uma tag com esse nome' })
      }
      throw err
    }
  })

  app.get('/', async (request) => {
    return prisma.tag.findMany({
      where: { userId: request.user.sub },
      orderBy: { name: 'asc' },
      include: { _count: { select: { games: true } } },
    })
  })

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const tag = await prisma.tag.findFirst({
      where: { id, userId: request.user.sub },
      include: { games: { include: { genres: true } } },
    })
    if (!tag) return reply.code(404).send({ error: 'Tag não encontrada' })
    return tag
  })

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = updateSchema.parse(request.body)

    const owned = await prisma.tag.findFirst({ where: { id, userId: request.user.sub } })
    if (!owned) return reply.code(404).send({ error: 'Tag não encontrada' })

    try {
      return await prisma.tag.update({ where: { id }, data: body })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return reply.code(409).send({ error: 'Você já tem uma tag com esse nome' })
      }
      throw err
    }
  })

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const owned = await prisma.tag.findFirst({ where: { id, userId: request.user.sub } })
    if (!owned) return reply.code(404).send({ error: 'Tag não encontrada' })

    await prisma.tag.delete({ where: { id } })
    return reply.code(204).send()
  })

  app.post('/:id/games/:gameId', async (request, reply) => {
    const { id, gameId } = request.params as { id: string; gameId: string }

    const owned = await prisma.tag.findFirst({ where: { id, userId: request.user.sub } })
    if (!owned) return reply.code(404).send({ error: 'Tag não encontrada' })

    const game = await prisma.game.findUnique({ where: { id: gameId } })
    if (!game) return reply.code(404).send({ error: 'Jogo não encontrado' })

    return prisma.tag.update({
      where: { id },
      data: { games: { connect: { id: gameId } } },
      include: { games: true },
    })
  })

  app.delete('/:id/games/:gameId', async (request, reply) => {
    const { id, gameId } = request.params as { id: string; gameId: string }

    const owned = await prisma.tag.findFirst({ where: { id, userId: request.user.sub } })
    if (!owned) return reply.code(404).send({ error: 'Tag não encontrada' })

    return prisma.tag.update({
      where: { id },
      data: { games: { disconnect: { id: gameId } } },
      include: { games: true },
    })
  })
}
