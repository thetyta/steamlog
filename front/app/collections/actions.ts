'use server'

import { revalidatePath } from 'next/cache'
import { api, ApiError } from '@/lib/api'

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

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

async function run<T>(fn: () => Promise<T>, fallback: string): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: readError(e, fallback) }
  }
}

/* ---------------- Coleções ---------------- */

export async function createCollection(input: {
  name: string
  description?: string | null
}): Promise<ActionResult> {
  const res = await run(
    () =>
      api('/collections', {
        method: 'POST',
        body: JSON.stringify({ name: input.name, description: input.description || null }),
      }),
    'Não foi possível criar a coleção.',
  )
  if (res.ok) revalidatePath('/collections')
  return res
}

export async function updateCollection(
  id: string,
  input: { name?: string; description?: string | null },
): Promise<ActionResult> {
  const res = await run(
    () => api(`/collections/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    'Não foi possível atualizar a coleção.',
  )
  if (res.ok) {
    revalidatePath('/collections')
    revalidatePath(`/collections/${id}`)
  }
  return res
}

export async function deleteCollection(id: string): Promise<ActionResult> {
  const res = await run(
    () => api(`/collections/${id}`, { method: 'DELETE' }),
    'Não foi possível excluir a coleção.',
  )
  if (res.ok) revalidatePath('/collections')
  return res
}

export async function addGameToCollection(
  id: string,
  gameId: string,
): Promise<ActionResult> {
  const res = await run(
    () =>
      api(`/collections/${id}/games`, {
        method: 'POST',
        body: JSON.stringify({ gameId }),
      }),
    'Não foi possível adicionar o jogo.',
  )
  if (res.ok) {
    revalidatePath(`/collections/${id}`)
    revalidatePath('/collections')
  }
  return res
}

export async function removeGameFromCollection(
  id: string,
  gameId: string,
): Promise<ActionResult> {
  const res = await run(
    () => api(`/collections/${id}/games/${gameId}`, { method: 'DELETE' }),
    'Não foi possível remover o jogo.',
  )
  if (res.ok) {
    revalidatePath(`/collections/${id}`)
    revalidatePath('/collections')
  }
  return res
}

/* ---------------- Tags ---------------- */

export async function createTag(input: {
  name: string
  color?: string | null
}): Promise<ActionResult> {
  const res = await run(
    () =>
      api('/tags', {
        method: 'POST',
        body: JSON.stringify({ name: input.name, color: input.color || null }),
      }),
    'Não foi possível criar a tag.',
  )
  if (res.ok) revalidatePath('/collections')
  return res
}

export async function updateTag(
  id: string,
  input: { name?: string; color?: string | null },
): Promise<ActionResult> {
  const res = await run(
    () => api(`/tags/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    'Não foi possível atualizar a tag.',
  )
  if (res.ok) revalidatePath('/collections')
  return res
}

export async function deleteTag(id: string): Promise<ActionResult> {
  const res = await run(
    () => api(`/tags/${id}`, { method: 'DELETE' }),
    'Não foi possível excluir a tag.',
  )
  if (res.ok) revalidatePath('/collections')
  return res
}

export async function addGameToTag(id: string, gameId: string): Promise<ActionResult> {
  const res = await run(
    () => api(`/tags/${id}/games/${gameId}`, { method: 'POST' }),
    'Não foi possível aplicar a tag.',
  )
  if (res.ok) revalidatePath('/collections')
  return res
}

export async function removeGameFromTag(
  id: string,
  gameId: string,
): Promise<ActionResult> {
  const res = await run(
    () => api(`/tags/${id}/games/${gameId}`, { method: 'DELETE' }),
    'Não foi possível remover a tag.',
  )
  if (res.ok) revalidatePath('/collections')
  return res
}
