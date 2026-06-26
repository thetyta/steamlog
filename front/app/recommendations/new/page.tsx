import { redirect } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { getMe } from '@/lib/queries'
import { TopNav } from '@/components/top-nav'
import { createRecommendationAction } from '../actions'
import { RecommendationForm } from './recommendation-form'

export default async function NewRecommendationPage() {
  const me = await getMe()
  if (!me) redirect('/')

  return (
    <>
      <TopNav active="recommendations" />
      <main className="container py-12 max-w-2xl">
        <header className="flex items-start gap-3">
          <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Pedir recomendação</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Conta como você tá e quanto tempo tem. A IA escolhe jogos da sua própria
              biblioteca que combinam com o momento.
            </p>
          </div>
        </header>

        <section className="mt-8 rounded-xl border border-border bg-card/60 p-6 backdrop-blur">
          <RecommendationForm action={createRecommendationAction} />
        </section>
      </main>
    </>
  )
}
