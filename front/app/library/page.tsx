import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Gamepad2 } from 'lucide-react'
import { getMe } from '@/lib/queries'
import { api } from '@/lib/api'
import { TopNav } from '@/components/top-nav'
import { Button } from '@/components/ui/button'
import type { LibraryEntry } from './game-card'
import { LibraryFilters } from './filters'
import { LibraryGrid } from './library-grid'

type LibraryResponse = {
  total: number
  page: number
  pageSize: number
  items: LibraryEntry[]
}

type SearchParams = {
  status?: string
  search?: string
  sortBy?: string
  page?: string
  collectionId?: string
  tagId?: string
}

type FilterOption = { id: string; name: string }

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const me = await getMe()
  if (!me) redirect('/')
  if (!me.librarySyncedAt) redirect('/perfil')

  const query = new URLSearchParams()
  if (searchParams.status) query.set('status', searchParams.status)
  if (searchParams.search) query.set('search', searchParams.search)
  if (searchParams.sortBy) query.set('sortBy', searchParams.sortBy)
  if (searchParams.collectionId) query.set('collectionId', searchParams.collectionId)
  if (searchParams.tagId) query.set('tagId', searchParams.tagId)
  if (searchParams.page) query.set('page', searchParams.page)
  query.set('pageSize', '48')

  const [data, collections, tags] = await Promise.all([
    api<LibraryResponse>(`/library?${query.toString()}`),
    api<FilterOption[]>('/collections'),
    api<FilterOption[]>('/tags'),
  ])
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize))

  return (
    <>
      <TopNav active="library" />
      <main className="container py-10">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Sua biblioteca</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.total} {data.total === 1 ? 'jogo' : 'jogos'}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <LibraryFilters collections={collections} tags={tags} />
        </div>

        {data.items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center gap-3 text-muted-foreground">
            <Gamepad2 className="size-12 opacity-40" />
            <p>Nenhum jogo encontrado com esses filtros.</p>
          </div>
        ) : (
          <LibraryGrid items={data.items} />
        )}

        {totalPages > 1 && <Pagination current={data.page} total={totalPages} searchParams={searchParams} />}
      </main>
    </>
  )
}

function Pagination({
  current,
  total,
  searchParams,
}: {
  current: number
  total: number
  searchParams: SearchParams
}) {
  const buildHref = (page: number) => {
    const q = new URLSearchParams()
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== 'page') q.set(k, v)
    })
    q.set('page', String(page))
    return `/library?${q.toString()}`
  }

  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      <Button asChild variant="secondary" size="sm" disabled={current <= 1}>
        <Link href={buildHref(Math.max(1, current - 1))} aria-disabled={current <= 1}>
          Anterior
        </Link>
      </Button>
      <span className="text-sm text-muted-foreground">
        Página {current} de {total}
      </span>
      <Button asChild variant="secondary" size="sm" disabled={current >= total}>
        <Link
          href={buildHref(Math.min(total, current + 1))}
          aria-disabled={current >= total}
        >
          Próxima
        </Link>
      </Button>
    </div>
  )
}
