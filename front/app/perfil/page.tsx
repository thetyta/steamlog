import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ExternalLink,
  Gamepad2,
  Library,
  Sparkles,
  Clock,
  CheckCircle2,
  PlayCircle,
  ListChecks,
  XCircle,
} from 'lucide-react'
import { getMe } from '@/lib/queries'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TopNav } from '@/components/top-nav'
import { SyncSteamButton } from './sync-button'
import { FavoritesSection, type FavoriteGame } from './favorites'

type Stats = {
  totalGames: number
  totalHours: number
  byStatus: Partial<Record<'BACKLOG' | 'PLAYING' | 'COMPLETED' | 'ABANDONED', number>>
  topGenres: { name: string; count: number }[]
}

type RawFavorite = {
  gameId: string
  favoriteRank: number
  game: { id: string; name: string; coverUrl: string | null }
}

async function getStats(): Promise<Stats | null> {
  try {
    return await api<Stats>('/stats')
  } catch (e) {
    if (e instanceof ApiError) return null
    throw e
  }
}

async function getFavorites(): Promise<FavoriteGame[]> {
  try {
    const raw = await api<RawFavorite[]>('/library/favorites')
    return raw.map((f) => ({
      gameId: f.gameId,
      name: f.game.name,
      coverUrl: f.game.coverUrl,
    }))
  } catch (e) {
    if (e instanceof ApiError) return []
    throw e
  }
}

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: { steam?: string }
}) {
  const me = await getMe()
  if (!me) redirect('/')

  const synced = me.librarySyncedAt ? new Date(me.librarySyncedAt) : null
  const [stats, favorites] = await Promise.all([getStats(), getFavorites()])
  const justLinked = searchParams.steam === 'linked'
  const alreadyLinked = searchParams.steam === 'already_linked'

  return (
    <>
      <TopNav active="perfil" />
      <main className="container py-12 max-w-4xl">
        <header className="flex items-center gap-4">
          {me.avatarUrl && (
            <Image
              src={me.avatarUrl}
              alt={me.displayName}
              width={64}
              height={64}
              className="size-16 rounded-full neon-ring"
            />
          )}
          <div>
            <p className="text-sm text-muted-foreground">Bem-vindo,</p>
            <h1 className="text-2xl font-semibold">{me.displayName}</h1>
            {me.profileUrl && (
              <a
                href={me.profileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Perfil Steam <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        </header>

        {stats && stats.totalGames > 0 && <StatsSection stats={stats} />}

        {stats && stats.totalGames > 0 && <FavoritesSection initial={favorites} />}

        {justLinked && (
          <p className="mt-6 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-foreground">
            Steam vinculada com sucesso! Agora você pode sincronizar sua biblioteca.
          </p>
        )}
        {alreadyLinked && (
          <p className="mt-6 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Essa conta Steam já está vinculada a outro usuário.
          </p>
        )}

        <section className="mt-10 rounded-xl border border-border bg-card/60 p-6 backdrop-blur">
          {synced ? (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-semibold">Biblioteca sincronizada</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Última atualização:{' '}
                    {synced.toLocaleString('pt-BR', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                {me.steamId64 && <SyncSteamButton variant="secondary" />}
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button asChild size="lg" className="justify-start">
                  <Link href="/library">
                    <Library className="size-4" />
                    Ver biblioteca
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="justify-start">
                  <Link href="/recommendations/new">
                    <Sparkles className="size-4" />
                    Pedir recomendação
                  </Link>
                </Button>
              </div>
            </>
          ) : !me.steamId64 ? (
            <>
              <h2 className="font-semibold">Vincule sua Steam</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sua conta ainda não tem uma Steam vinculada. Vincule pra importar sua
                biblioteca e receber recomendações.
              </p>
              <p className="mt-2 text-xs text-muted-foreground/70">
                Requer que o servidor tenha a <code>STEAM_API_KEY</code> configurada e que
                seu perfil esteja com &quot;Detalhes do jogo: Público&quot;.
              </p>
              <div className="mt-6">
                <Button asChild size="lg">
                  <Link href="/auth/steam/start">
                    <Gamepad2 className="size-4" />
                    Vincular com Steam
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-semibold">Primeiro passo</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sincronize sua biblioteca da Steam pra começar. O processo pode levar
                alguns segundos enquanto enriquecemos seus jogos com dados da IGDB.
              </p>
              <p className="mt-2 text-xs text-muted-foreground/70">
                Lembrete: seu perfil Steam precisa estar com &quot;Detalhes do jogo:
                Público&quot;.
              </p>
              <div className="mt-6">
                <SyncSteamButton />
              </div>
            </>
          )}
        </section>
      </main>
    </>
  )
}

const STATUS_META: {
  key: 'BACKLOG' | 'PLAYING' | 'COMPLETED' | 'ABANDONED'
  label: string
  icon: typeof ListChecks
  className: string
}[] = [
  { key: 'BACKLOG', label: 'Backlog', icon: ListChecks, className: 'text-muted-foreground' },
  { key: 'PLAYING', label: 'Jogando', icon: PlayCircle, className: 'text-accent' },
  { key: 'COMPLETED', label: 'Zerados', icon: CheckCircle2, className: 'text-primary' },
  { key: 'ABANDONED', label: 'Largados', icon: XCircle, className: 'text-muted-foreground' },
]

function StatsSection({ stats }: { stats: Stats }) {
  const maxGenre = Math.max(1, ...stats.topGenres.map((g) => g.count))

  return (
    <section className="mt-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <BigStat
          icon={<Library className="size-4" />}
          label="Jogos"
          value={stats.totalGames.toString()}
        />
        <BigStat
          icon={<Clock className="size-4" />}
          label="Horas jogadas"
          value={`${stats.totalHours.toLocaleString('pt-BR')}h`}
        />
        <BigStat
          icon={<Sparkles className="size-4" />}
          label="Gênero favorito"
          value={stats.topGenres[0]?.name ?? '—'}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_META.map(({ key, label, icon: Icon, className }) => (
          <div
            key={key}
            className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur"
          >
            <div className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
              <Icon className="size-3.5" />
              {label}
            </div>
            <p className="mt-1 text-2xl font-semibold">{stats.byStatus[key] ?? 0}</p>
          </div>
        ))}
      </div>

      {stats.topGenres.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-card/60 p-5 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Top gêneros
          </h2>
          <ul className="mt-4 space-y-2.5">
            {stats.topGenres.slice(0, 6).map((g) => (
              <li key={g.name} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm">{g.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(g.count / maxGenre) * 100}%` }}
                  />
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {g.count}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function BigStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
      <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-2xl font-semibold" title={value}>
        {value}
      </p>
    </div>
  )
}
