import { NextResponse, type NextRequest } from 'next/server'
import { api, ApiError } from '@/lib/api'

export async function GET(
  _request: NextRequest,
  { params }: { params: { gameId: string } },
) {
  try {
    const data = await api(`/library/${params.gameId}`)
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
