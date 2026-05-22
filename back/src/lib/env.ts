import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number(),
  FRONTEND_URL: z.string().url(),
  BACKEND_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  STEAM_API_KEY: z.string().min(1).optional(),
  IGDB_CLIENT_ID: z.string().min(1).optional(),
  IGDB_CLIENT_SECRET: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
})

export const env = schema.parse(process.env)

export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<typeof env[K]> {
  const value = env[key]
  if (value === undefined || value === null || value === '') {
    throw new Error(
      `Variável de ambiente ${key} não configurada. Defina no .env para usar esta funcionalidade.`,
    )
  }
  return value as NonNullable<typeof env[K]>
}
