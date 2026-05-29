import Fastify from 'fastify'
import cors from '@fastify/cors'
import { ZodError } from 'zod'
import { env } from './lib/env.js'
import authPlugin from './plugins/auth.js'
import { authRoutes } from './routes/auth.js'
import { steamRoutes } from './routes/steam.js'
import { libraryRoutes } from './routes/library.js'
import { gamesRoutes } from './routes/games.js'
import { recommendationsRoutes } from './routes/recommendations.js'
import { statsRoutes } from './routes/stats.js'
import { collectionsRoutes } from './routes/collections.js'
import { tagsRoutes } from './routes/tags.js'
import { sessionsRoutes } from './routes/sessions.js'

async function bootstrap() {
  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: 'Dados inválidos', issues: error.issues })
    }
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: error.message })
    }
    request.log.error(error)
    return reply.code(500).send({ error: 'Erro interno' })
  })

  await app.register(authPlugin)

  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(steamRoutes, { prefix: '/steam' })
  await app.register(libraryRoutes, { prefix: '/library' })
  await app.register(gamesRoutes, { prefix: '/games' })
  await app.register(recommendationsRoutes, { prefix: '/recommendations' })
  await app.register(statsRoutes, { prefix: '/stats' })
  await app.register(collectionsRoutes, { prefix: '/collections' })
  await app.register(tagsRoutes, { prefix: '/tags' })
  await app.register(sessionsRoutes, { prefix: '/sessions' })

  app.get('/health', () => ({ status: 'ok' }))

  await app.listen({ port: env.PORT, host: '0.0.0.0' })
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
