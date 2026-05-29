'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AuthState } from './actions'

type Mode = 'login' | 'register'

type Props = {
  mode: Mode
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>
}

export function AuthForm({ mode, action }: Props) {
  const [state, formAction] = useFormState(action, {})
  const isRegister = mode === 'register'

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isRegister && (
        <Field label="Nome de exibição (opcional)">
          <Input name="displayName" type="text" maxLength={80} placeholder="Como quer ser chamado" autoComplete="name" />
        </Field>
      )}

      <Field label="E-mail">
        <Input name="email" type="email" required placeholder="voce@email.com" autoComplete="email" />
      </Field>

      <Field label="Senha">
        <Input
          name="password"
          type="password"
          required
          minLength={isRegister ? 8 : undefined}
          placeholder={isRegister ? 'Ao menos 8 caracteres' : '••••••••'}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
        />
      </Field>

      {state.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton label={isRegister ? 'Criar conta' : 'Entrar'} />

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? (
          <>
            Já tem conta?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Não tem conta?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Criar conta
            </Link>
          </>
        )}
      </p>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="mt-2">
      {pending && <Loader2 className="size-4 animate-spin" />}
      {label}
    </Button>
  )
}
