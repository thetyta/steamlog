import { NextResponse, type NextRequest } from 'next/server'
import { clearSessionToken } from '@/lib/auth'

// POST (não GET): logout muda estado, então não pode ser um link prefetchável.
// Um <Link> GET seria pré-buscado pelo Next ao renderizar a navbar e apagaria
// o cookie de sessão sozinho.
export async function POST(request: NextRequest) {
  clearSessionToken()
  return NextResponse.redirect(new URL('/', request.url), { status: 303 })
}
