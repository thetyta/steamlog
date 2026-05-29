import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Gamepad2 } from 'lucide-react'
import { getSessionToken } from '@/lib/auth'
import { loginAction } from '@/app/auth/actions'
import { AuthForm } from '@/app/auth/auth-form'

export default function LoginPage() {
  if (getSessionToken()) redirect('/dashboard')

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <Gamepad2 className="size-6 text-primary" />
          <span className="text-lg">GameMuse</span>
        </Link>

        <div className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur">
          <h1 className="text-xl font-semibold">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse sua conta com e-mail e senha.
          </p>
          <div className="mt-6">
            <AuthForm mode="login" action={loginAction} />
          </div>
        </div>
      </div>
    </main>
  )
}
