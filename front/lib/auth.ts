import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'session_token'

export function getSessionToken() {
  return cookies().get(SESSION_COOKIE)?.value ?? null
}

export function setSessionToken(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function clearSessionToken() {
  cookies().delete(SESSION_COOKIE)
}
