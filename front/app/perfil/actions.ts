'use server'

import { revalidatePath } from 'next/cache'
import { api, ApiError } from '@/lib/api'

type SyncResponse = { synced: number; warning?: string }

export type SyncResult =
  | { ok: true; synced: number; warning?: string }
  | { ok: false; error: string }

export async function syncSteamLibrary(): Promise<SyncResult> {
  try {
    const result = await api<SyncResponse>('/steam/sync', { method: 'POST' })
    revalidatePath('/perfil')
    return { ok: true, ...result }
  } catch (e) {
    const message =
      e instanceof ApiError
        ? `Erro ${e.status}: ${e.message}`
        : e instanceof Error
          ? e.message
          : 'Erro desconhecido ao sincronizar'
    return { ok: false, error: message }
  }
}
