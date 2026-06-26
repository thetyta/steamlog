import { NextResponse, type NextRequest } from 'next/server'
import { api, ApiError } from '@/lib/api'

export async function GET() {
  try {
    const data = await api('/library/favorites')
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await api('/library/favorites', {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof ApiError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
