import { NextResponse, type NextRequest } from 'next/server'
import { getSessionToken } from '@/lib/auth'
import { env } from '@/lib/env'

// Inicia o fluxo OpenID da Steam: lê o JWT do cookie httpOnly (ilegível no client)
// e redireciona pro backend, que precisa do token pra vincular a Steam na conta logada.
export async function GET(request: NextRequest) {
  const token = getSessionToken()
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const target = new URL(`${env.BACKEND_URL}/auth/steam`)
  target.searchParams.set('token', token)
  return NextResponse.redirect(target)
}
