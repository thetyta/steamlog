import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export async function gamesRoutes(app: FastifyInstance) {
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const game = await prisma.game.findUnique({
      where: { id },
      include: { genres: true },
    })
    if (!game) return reply.code(404).send({ error: 'Game not found' })
    return game
  })
}
