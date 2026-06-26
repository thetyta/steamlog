'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Star, Loader2, Check, AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LibraryEntry } from './game-card'

type Status = LibraryEntry['status']

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'BACKLOG', label: 'Backlog' },
  { value: 'PLAYING', label: 'Jogando' },
  { value: 'COMPLETED', label: 'Zerado' },
  { value: 'ABANDONED', label: 'Largado' },
]

type Patch = {
  status?: Status
  userRating?: number | null
  userNote?: string | null
}

export function GameEditor({
  gameId,
  initialStatus,
  initialRating,
  initialNote,
}: {
  gameId: string
  initialStatus: Status
  initialRating: number | null
  initialNote: string | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<Status>(initialStatus)
  const [rating, setRating] = useState<number | null>(initialRating)
  const [hover, setHover] = useState<number | null>(null)
  const [note, setNote] = useState(initialNote ?? '')
  const savedNote = initialNote ?? ''

  const mutation = useMutation({
    mutationFn: async (patch: Patch) => {
      const res = await fetch(`/api/library/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Falha ao salvar')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library', gameId] })
      router.refresh()
    },
  })

  function changeStatus(next: Status) {
    setStatus(next)
    mutation.mutate({ status: next })
  }

  function changeRating(next: number) {
    const value = rating === next ? null : next
    setRating(value)
    mutation.mutate({ userRating: value })
  }

  function saveNote() {
    const trimmed = note.trim()
    mutation.mutate({ userNote: trimmed || null })
  }

  const noteDirty = note.trim() !== savedNote.trim()

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sua progressão
        </h2>
        <SaveIndicator
          isPending={mutation.isPending}
          isError={mutation.isError}
          isSettled={mutation.isSuccess}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            Status
          </label>
          <Select value={status} onValueChange={(v) => changeStatus(v as Status)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            Sua nota
          </label>
          <div className="mt-1.5 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (hover ?? rating ?? 0) >= n
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => changeRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(null)}
                  className="p-0.5 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
                >
                  <Star
                    className={cn(
                      'size-6 transition-colors',
                      active
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/40',
                    )}
                  />
                </button>
              )
            })}
            {rating != null && (
              <button
                type="button"
                onClick={() => changeRating(rating)}
                className="ml-2 text-xs text-muted-foreground hover:text-foreground"
              >
                limpar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Anotações
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="O que achou, onde parou, pra que momento serve…"
          className="mt-1.5 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
        />
        {noteDirty && (
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              onClick={saveNote}
              disabled={mutation.isPending}
            >
              Salvar nota
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function SaveIndicator({
  isPending,
  isError,
  isSettled,
}: {
  isPending: boolean
  isError: boolean
  isSettled: boolean
}) {
  if (isPending)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> salvando…
      </span>
    )
  if (isError)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="size-3.5" /> erro ao salvar
      </span>
    )
  if (isSettled)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="size-3.5" /> salvo
      </span>
    )
  return null
}
