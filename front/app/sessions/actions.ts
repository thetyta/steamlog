'use server'

import { revalidatePath } from 'next/cache'
import { api, ApiError } from '@/lib/api'

export type SessionActionResult = { ok: true } | { ok: false; error: string }

function readError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    try {
      return (JSON.parse(e.message) as { error?: string }).error ?? fallback
    } catch {
      return e.message || fallback
    }
  }
  return fallback
}

export type SessionInput = {
  gameId: string
  playedAt: string
  rating: number | null
  note: string | null
}

export async function createSession(input: SessionInput): Promise<SessionActionResult> {
  try {
    await api('/sessions', { method: 'POST', body: JSON.stringify(input) })
    revalidatePath('/sessions')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: readError(e, 'Não foi possível registrar a sessão.') }
  }
}

export async function updateSession(
  id: string,
  input: Omit<SessionInput, 'gameId'>,
): Promise<SessionActionResult> {
  try {
    await api(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
    revalidatePath('/sessions')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: readError(e, 'Não foi possível atualizar a sessão.') }
  }
}

export async function deleteSession(id: string): Promise<SessionActionResult> {
  try {
    await api(`/sessions/${id}`, { method: 'DELETE' })
    revalidatePath('/sessions')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: readError(e, 'Não foi possível excluir a sessão.') }
  }
}
