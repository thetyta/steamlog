import { redirect, notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Clock, Tag } from 'lucide-react'
import { getMe } from '@/lib/queries'
import { api, ApiError } from '@/lib/api'
import { TopNav } from '@/components/top-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Screenshot = { thumb: string; full: string }

type LibraryDetail = {
  gameId: string
  playtimeMinutes: number
  lastPlayedAt: string | null
  status: string
  userRating: number | null
  userNote: string | null
  game: {
    id: string
    name: string
    summary: string | null
    coverUrl: string | null
    headerImageUrl: string | null
    detailedSummary: string | null
    releaseDate: string | null
    avgPlaytimeHours: number | null
    priceCents: number | null
    isFree: boolean
    screenshots: Screenshot[] | null
    genres: { id: number; name: string }[]
  }
}

function fixProtocolRelative(url: string | null): string | null {
  if (!url) return null
  return url.startsWith('//') ? `https:${url}` : url
}

function formatPrice(cents: number | null, isFree: boolean): string | null {
  if (isFree) return 'Gratuito'
  if (cents == null) return null
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function GameDetailPage({ params }: { params: { gameId: string } }) {
  const me = await getMe()
  if (!me) redirect('/')

  let entry: LibraryDetail
  try {
    entry = await api<LibraryDetail>(`/library/${params.gameId}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    throw e
  }

  const cover = fixProtocolRelative(entry.game.coverUrl)
  const header = entry.game.headerImageUrl
  const hours = (entry.playtimeMinutes / 60).toFixed(1)
  const price = formatPrice(entry.game.priceCents, entry.game.isFree)
  const description = entry.game.detailedSummary ?? entry.game.summary

  return (
    <>
      <TopNav active="library" />
      <main className="container py-8 max-w-5xl">
        <Button asChild variant="secondary" size="sm">
          <Link href="/library">
            <ArrowLeft className="size-4" />
            Voltar à biblioteca
          </Link>
        </Button>

        {header && (
          <div className="relative mt-6 overflow-hidden rounded-xl border border-border">
            <Image
              src={header}
              alt={entry.game.name}
              width={1920}
              height={620}
              className="w-full object-cover"
              unoptimized
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
          {cover && (
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-secondary/40">
              <Image
                src={cover}
                alt={entry.game.name}
                fill
                sizes="220px"
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{entry.game.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.game.genres.map((g) => (
                <Badge key={g.id} variant="secondary">
                  {g.name}
                </Badge>
              ))}
            </div>

            <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat label="Status" value={entry.status} />
              <Stat
                label="Horas jogadas"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> {hours}h
                  </span>
                }
              />
              {entry.game.avgPlaytimeHours && (
                <Stat
                  label="Tempo médio pra zerar"
                  value={`~${entry.game.avgPlaytimeHours.toFixed(0)}h`}
                />
              )}
              {price && (
                <Stat
                  label="Preço atual"
                  value={
                    <span className="inline-flex items-center gap-1">
                      <Tag className="size-3.5" /> {price}
                    </span>
                  }
                />
              )}
              {entry.lastPlayedAt && (
                <Stat
                  label="Última vez jogado"
                  value={new Date(entry.lastPlayedAt).toLocaleDateString('pt-BR')}
                />
              )}
            </dl>

            {description && (
              <p className="mt-6 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {description}
              </p>
            )}
          </div>
        </div>

        {entry.game.screenshots && entry.game.screenshots.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">Screenshots</h2>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {entry.game.screenshots.map((s, i) => (
                <a
                  key={i}
                  href={s.full}
                  target="_blank"
                  rel="noreferrer"
                  className="relative aspect-video overflow-hidden rounded-lg border border-border bg-secondary/40 transition hover:border-primary/50"
                >
                  <Image
                    src={s.thumb}
                    alt={`Screenshot ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
          Em breve: editar status, nota e anotações pessoais.
        </div>
      </main>
    </>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  )
}
