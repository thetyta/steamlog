import { NextResponse, type NextRequest } from 'next/server'
import { clearSessionToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  clearSessionToken()
  return NextResponse.redirect(new URL('/', request.url))
}
