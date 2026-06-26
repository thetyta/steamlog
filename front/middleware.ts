import { NextResponse, type NextRequest } from 'next/server'

// Mesmo nome usado em lib/auth.ts. Definido aqui inline porque o middleware roda
// no edge runtime e não pode importar módulos que usam `next/headers`.
const SESSION_COOKIE = 'session_token'

// Páginas acessíveis sem login.
const AUTH_PAGES = ['/login', '/register']
const PUBLIC_PATHS = ['/', ...AUTH_PAGES]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLoggedIn = request.cookies.has(SESSION_COOKIE)
  const isPublic = PUBLIC_PATHS.includes(pathname)

  // Já logado tentando ver login/registro → manda pro app.
  if (isLoggedIn && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/perfil', request.url))
  }

  // Não logado tentando acessar rota protegida → manda pro login.
  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Roda em todas as rotas de página, menos: BFF (/api), internos do Next,
  // os callbacks de /auth (precisam rodar sem sessão) e arquivos estáticos.
  matcher: ['/((?!api|_next|auth|favicon.ico|.*\\..*).*)'],
}
