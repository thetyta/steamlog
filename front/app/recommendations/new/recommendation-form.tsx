'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { RecommendationState } from '../actions'

type Props = {
  action: (prev: RecommendationState, formData: FormData) => Promise<RecommendationState>
}

const TIME_OPTIONS = [
  'Menos de 30 minutos',
  'Cerca de 1 hora',
  '2 a 3 horas',
  'Uma tarde inteira / sem pressa',
]

const fieldClasses =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export function RecommendationForm({ action }: Props) {
  const [state, formAction] = useFormState(action, {})

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field
        label="Como você está / o que procura?"
        hint="Ex: cansado, quero algo relaxante e bonito de olhar"
      >
        <Input
          name="mood"
          required
          maxLength={200}
          placeholder="Descreva o humor ou a vibe"
          autoFocus
        />
      </Field>

      <Field label="Quanto tempo você tem? (opcional)">
        <select name="timeAvailable" defaultValue="" className={cn(fieldClasses, 'h-10')}>
          <option value="">Sem preferência</option>
          {TIME_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Contexto extra (opcional)"
        hint="Ex: jogando com amigos, quero terminar algo do backlog"
      >
        <textarea
          name="context"
          maxLength={500}
          rows={3}
          placeholder="Qualquer detalhe que ajude a IA a escolher"
          className={cn(fieldClasses, 'min-h-[80px] resize-y')}
        />
      </Field>

      {state.error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="mt-1">
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Gerando recomendação…
        </>
      ) : (
        <>
          <Sparkles className="size-4" />
          Gerar recomendação
        </>
      )}
    </Button>
  )
}
