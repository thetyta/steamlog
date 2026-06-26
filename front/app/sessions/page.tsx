import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/queries'
import { api } from '@/lib/api'
import { TopNav } from '@/components/top-nav'
import { Button } from '@/components/ui/button'
import { SessionsBoard, type PlaySession } from './sessions-board'

type SessionsResponse = {
  total: number
  page: number
  pageSize: number
  items: PlaySession[]
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: { page?: string }
}) {
  const me = await getMe()
  if (!me) redirect('/')

  const page = Math.max(1, Number(searchParams.page) || 1)
  const data = await api<SessionsResponse>(`/sessions?page=${page}&pageSize=20`)
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))

  return (
    <>
      <TopNav active="sessions" />
      <main className="container max-w-3xl py-10">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Sessões de jogo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? 'sessão registrada' : 'sessões registradas'}.
          </p>
        </header>

        <SessionsBoard sessions={data.items} />

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button asChild variant="secondary" size="sm" disabled={page <= 1}>
              <Link href={`/sessions?page=${page - 1}`} aria-disabled={page <= 1}>
                Anterior
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button asChild variant="secondary" size="sm" disabled={page >= totalPages}>
              <Link href={`/sessions?page=${page + 1}`} aria-disabled={page >= totalPages}>
                Próxima
              </Link>
            </Button>
          </div>
        )}
      </main>
    </>
  )
}
