import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, Gamepad2, Library, Sparkles } from 'lucide-react'
import { getMe } from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { TopNav } from '@/components/top-nav'
import { SyncSteamButton } from './sync-button'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { steam?: string }
}) {
  const me = await getMe()
  if (!me) redirect('/')

  const synced = me.librarySyncedAt ? new Date(me.librarySyncedAt) : null
  const justLinked = searchParams.steam === 'linked'
  const alreadyLinked = searchParams.steam === 'already_linked'

  return (
    <>
      <TopNav active="dashboard" />
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
          {!me.steamId64 ? (
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
          ) : synced ? (
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
                <SyncSteamButton variant="secondary" />
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
