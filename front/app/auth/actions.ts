'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { setSessionToken } from '@/lib/auth'
import { env } from '@/lib/env'

export type AuthState = { error?: string }

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})

const registerSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha precisa de ao menos 8 caracteres'),
  displayName: z.string().trim().max(80).optional(),
})

async function authRequest(path: string, body: unknown): Promise<{ token: string } | { error: string }> {
  const res = await fetch(`${env.BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (res.ok) {
    const data = (await res.json()) as { token: string }
    return { token: data.token }
  }

  const payload = (await res.json().catch(() => null)) as { error?: string } | null
  return { error: payload?.error ?? 'Erro ao processar a requisição.' }
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const result = await authRequest('/auth/login', parsed.data)
  if ('error' in result) {
    return { error: 'E-mail ou senha incorretos.' }
  }

  setSessionToken(result.token)
  redirect('/dashboard')
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const displayName = formData.get('displayName')
  const parsed = registerSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: displayName ? String(displayName) : undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const result = await authRequest('/auth/register', parsed.data)
  if ('error' in result) {
    return { error: result.error }
  }

  setSessionToken(result.token)
  redirect('/dashboard')
}
