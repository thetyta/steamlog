import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, Clock, MessageSquare, ShoppingCart, Library, ExternalLink } from 'lucide-react'
import { getMe } from '@/lib/queries'
import { api, ApiError } from '@/lib/api'
import { TopNav } from '@/components/top-nav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyCover } from '@/components/empty-cover'
import { FeedbackButtons } from './feedback-buttons'
import { StoreCover } from './store-cover'

type Feedback = 'LIKED' | 'DISLIKED' | 'PLAYED' | 'SKIPPED'

type RecItem = {
  id: string
  rank: number
  reason: string
  kind: 'OWNED' | 'BUY'
  name: string | null
  steamAppId: number | null
  userFeedback: Feedback | null
  game: {
    id: string
    name: string
    coverUrl: string | null
  } | null
}

type RecommendationDetail = {
  id: string
  mood: string
  timeAvailable: string | null
  context: string | null
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

function steamSearchUrl(name: string): string {
  return `https://store.steampowered.com/search/?term=${encodeURIComponent(name)}`
}

export default async function RecommendationPage({
  params,
}: {
  params: { id: string }
}) {
  const me = await getMe()
  if (!me) redirect('/')

  let rec: RecommendationDetail
  try {
    rec = await api<RecommendationDetail>(`/recommendations/${params.id}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    throw e
  }

  const createdAt = new Date(rec.createdAt).toLocaleString('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const owned = rec.items.filter((i) => i.kind === 'OWNED')
  const buy = rec.items.filter((i) => i.kind === 'BUY')

  return (
    <>
      <TopNav active="recommendations" />
      <main className="container py-10 max-w-3xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {createdAt}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Recomendações pra “{rec.mood}”
            </h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
              {rec.timeAvailable && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" /> {rec.timeAvailable}
                </span>
              )}
              {rec.context && (
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="size-3.5" /> {rec.context}
                </span>
              )}
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link href="/recommendations/new">
              <Sparkles className="size-4" />
              Nova recomendação
            </Link>
          </Button>
        </div>

        {rec.items.length === 0 ? (
          <div className="mt-12 rounded-xl border border-border bg-card/60 p-8 text-center text-sm text-muted-foreground">
            A IA não retornou recomendações utilizáveis. Tente de novo com uma descrição
            diferente.
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {owned.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Library className="size-4 text-primary" />
                  Da sua biblioteca
                </h2>
                <ol className="mt-4 flex flex-col gap-4">
                  {owned.map((item) => {
                    const name = itemName(item)
                    const cover = coverSrc(item.game?.coverUrl ?? null)
                    return (
                      <li
                        key={item.id}
                        className="flex gap-4 rounded-xl border border-border bg-card/60 p-4 backdrop-blur"
                      >
                        <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary/40">
                          {cover ? (
                            <Image
                              src={cover}
                              alt={name}
                              fill
                              sizes="80px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <EmptyCover name={name} />
                          )}
                          <Badge className="absolute left-1 top-1 size-6 justify-center rounded-full p-0 text-xs">
                            {item.rank}
                          </Badge>
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <h3 className="font-semibold leading-tight">{name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                          <div className="mt-auto pt-3">
                            <FeedbackButtons itemId={item.id} initial={item.userFeedback} />
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>
            )}

            {buy.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <ShoppingCart className="size-4 text-accent" />
                  Pra comprar
                </h2>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Jogos fora da sua biblioteca que combinam com seu perfil.
                </p>
                <ol className="mt-4 flex flex-col gap-4">
                  {buy.map((item) => {
                    const name = itemName(item)
                    const storeUrl = item.steamAppId
                      ? `https://store.steampowered.com/app/${item.steamAppId}`
                      : steamSearchUrl(name)
                    return (
                      <li
                        key={item.id}
                        className="flex gap-4 rounded-xl border border-dashed border-border bg-card/40 p-4 backdrop-blur"
                      >
                        <a
                          href={storeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary/40 transition hover:border-primary/50"
                        >
                          <StoreCover name={name} steamAppId={item.steamAppId} />
                          <Badge
                            variant="secondary"
                            className="absolute left-1 top-1 size-6 justify-center rounded-full p-0 text-xs"
                          >
                            {item.rank}
                          </Badge>
                        </a>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <h3 className="font-semibold leading-tight">{name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                          <div className="mt-auto pt-3">
                            <Button asChild variant="secondary" size="sm">
                              <a href={storeUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="size-3.5" />
                                {item.steamAppId ? 'Ver na Steam' : 'Buscar na Steam'}
                              </a>
                            </Button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>
            )}
          </div>
        )}
      </main>
    </>
  )
}
