import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Gamepad2, Sparkles, Library } from 'lucide-react'
import { getSessionToken } from '@/lib/auth'

export default function LandingPage() {
  if (getSessionToken()) redirect('/dashboard')

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center py-16">
      <div className="flex flex-col items-center text-center gap-6 max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-accent" />
          Recomendações com IA pra sua biblioteca Steam
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight">
          O que jogar <span className="text-gradient">agora</span>?
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl">
          Crie sua conta, diz seu humor e tempo disponível, e o GameMuse escolhe
          o melhor jogo da <em>sua</em> biblioteca pra você jogar agora. Vincule a Steam
          quando quiser pra importar seus jogos.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition hover:opacity-90 neon-ring"
          >
            <Gamepad2 className="size-5" />
            Criar conta
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-6 py-3 text-base font-medium transition hover:bg-accent"
          >
            Entrar
          </Link>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
        <Feature
          icon={<Library className="size-5" />}
          title="Importa tudo"
          desc="Sincroniza sua biblioteca completa com horas jogadas e enriquece com dados da IGDB."
        />
        <Feature
          icon={<Sparkles className="size-5" />}
          title="Curadoria por IA"
          desc="Recomendações baseadas no seu humor, tempo disponível e jogos que você já curtiu."
        />
        <Feature
          icon={<Gamepad2 className="size-5" />}
          title="Backlog vivo"
          desc="Marca status, dá nota, anota o que pensou — vira um diário da sua jornada."
        />
      </div>
    </main>
  )
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur">
      <div className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
