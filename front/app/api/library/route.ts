import { NextResponse, type NextRequest } from 'next/server'
import { api, ApiError } from '@/lib/api'

// Proxy de busca da biblioteca — usado pelo seletor de favoritos no /perfil.
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get('search') ?? ''
  const params = new URLSearchParams({ pageSize: '24', sortBy: 'name' })
  if (search) params.set('search', search)

  try {
    const data = await api(`/library?${params.toString()}`)
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
