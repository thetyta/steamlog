import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { getMe } from '@/lib/queries'
import { api } from '@/lib/api'
import { TopNav } from '@/components/top-nav'
import { Button } from '@/components/ui/button'
import { EmptyCover } from '@/components/empty-cover'

type RecItem = {
  id: string
  kind: 'OWNED' | 'BUY'
  name: string | null
  game: { id: string; name: string; coverUrl: string | null } | null
}

type RecommendationListItem = {
  id: string
  mood: string
  createdAt: string
  items: RecItem[]
}

function coverSrc(url: string | null): string | null {
  if (!url) return null
  return url.startsWith('//') ? `https:${url}` : url
}

function itemName(item: RecItem): string {
  return item.game?.name ?? item.name ?? 'Jogo'
}

function countLabel(items: RecItem[]): string {
  const owned = items.filter((i) => i.kind === 'OWNED').length
  const buy = items.filter((i) => i.kind === 'BUY').length
  const parts: string[] = []
  if (owned) parts.push(`${owned} da biblioteca`)
  if (buy) parts.push(`${buy} pra comprar`)
  return parts.join(' · ') || 'sem itens'
}

export default async function RecommendationsPage() {
  const me = await getMe()
  if (!me) redirect('/')

  const list = await api<RecommendationListItem[]>('/recommendations')

  return (
    <>
      <TopNav active="recommendations" />
      <main className="container py-10 max-w-3xl">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Recomendações</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Seu histórico de pedidos pra IA.
            </p>
          </div>
          <Button asChild>
            <Link href="/recommendations/new">
              <Sparkles className="size-4" />
              Nova recomendação
            </Link>
          </Button>
        </div>

        {list.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-4 text-center text-muted-foreground">
            <Sparkles className="size-12 opacity-40" />
            <p>Você ainda não pediu nenhuma recomendação.</p>
            <Button asChild variant="secondary">
              <Link href="/recommendations/new">Pedir a primeira</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {list.map((rec) => {
              const createdAt = new Date(rec.createdAt).toLocaleString('pt-BR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
              return (
                <li key={rec.id}>
                  <Link
                    href={`/recommendations/${rec.id}`}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card/60 p-4 backdrop-blur transition hover:border-primary/50 hover:bg-card"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {createdAt}
                      </p>
                      <p className="mt-0.5 truncate font-medium">“{rec.mood}”</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {countLabel(rec.items)}
                      </p>
                    </div>
                    <div className="flex shrink-0 -space-x-3">
                      {rec.items.slice(0, 4).map((item) => {
                        const name = itemName(item)
                        const cover = coverSrc(item.game?.coverUrl ?? null)
                        return (
                          <div
                            key={item.id}
                            className="relative aspect-[3/4] w-10 overflow-hidden rounded-md border border-border bg-secondary/40"
                          >
                            {cover ? (
                              <Image
                                src={cover}
                                alt={name}
                                fill
                                sizes="40px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <EmptyCover name={name} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </>
  )
}
