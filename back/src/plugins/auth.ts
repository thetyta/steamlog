import type { FastifyInstance, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { env } from '../lib/env.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string }
    user: { sub: string }
  }
}

async function authPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, { secret: env.JWT_SECRET })

  app.decorate('authenticate', async (request: FastifyRequest) => {
    await request.jwtVerify()
  })
}

export default fp(authPlugin)
