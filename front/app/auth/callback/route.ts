import { NextResponse, type NextRequest } from 'next/server'
import { setSessionToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/?error=missing_token', request.url))
  }

  setSessionToken(token)
  return NextResponse.redirect(new URL('/perfil', request.url))
}
