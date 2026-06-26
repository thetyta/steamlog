'use client'

import { useState, useTransition } from 'react'
import { ThumbsUp, ThumbsDown, Gamepad2, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sendFeedbackAction } from '../actions'

type Feedback = 'LIKED' | 'DISLIKED' | 'PLAYED' | 'SKIPPED'

const OPTIONS: { value: Feedback; label: string; icon: typeof ThumbsUp }[] = [
  { value: 'LIKED', label: 'Curti', icon: ThumbsUp },
  { value: 'DISLIKED', label: 'Não curti', icon: ThumbsDown },
  { value: 'PLAYED', label: 'Joguei', icon: Gamepad2 },
  { value: 'SKIPPED', label: 'Pulei', icon: SkipForward },
]

export function FeedbackButtons({
  itemId,
  initial,
}: {
  itemId: string
  initial: Feedback | null
}) {
  const [selected, setSelected] = useState<Feedback | null>(initial)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function choose(value: Feedback) {
    if (pending) return
    const previous = selected
    setSelected(value)
    setError(null)
    startTransition(async () => {
      const res = await sendFeedbackAction(itemId, value)
      if (!res.ok) {
        setSelected(previous)
        setError(res.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = selected === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              disabled={pending}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition disabled:opacity-60',
                active
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
