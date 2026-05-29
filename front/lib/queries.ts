import 'server-only'
import { cache } from 'react'
import { api } from './api'
import { getSessionToken } from './auth'

export type Me = {
  id: string
  email: string
  steamId64: string | null
  displayName: string
  avatarUrl: string | null
  profileUrl: string | null
  librarySyncedAt: string | null
}

export const getMe = cache(async (): Promise<Me | null> => {
  if (!getSessionToken()) return null
  return api<Me>('/auth/me')
})
