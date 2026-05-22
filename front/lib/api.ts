import 'server-only'
import { getSessionToken } from './auth'
import { env } from './env'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

type ApiOptions = RequestInit & { auth?: boolean }

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { auth = true, headers, body, ...rest } = options
  const token = auth ? getSessionToken() : null

  const res = await fetch(`${env.BACKEND_URL}${path}`, {
    ...rest,
    body,
    headers: {
      ...(body !== undefined && body !== null
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new ApiError(res.status, text || res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
