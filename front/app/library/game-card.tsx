'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Clock, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyCover } from '@/components/empty-cover'
import { cn } from '@/lib/utils'

export type LibraryEntry = {
  gameId: string
  playtimeMinutes: number
  lastPlayedAt: string | null
  status: 'BACKLOG' | 'PLAYING' | 'COMPLETED' | 'ABANDONED'
  userRating: number | null
  game: {
    id: string
    name: string
    coverUrl: string | null
    genres: { id: number; name: string }[]
  }
}

const STATUS_LABEL: Record<LibraryEntry['status'], string> = {
  BACKLOG: 'Backlog',
  PLAYING: 'Jogando',
  COMPLETED: 'Zerado',
  ABANDONED: 'Largado',
}

const STATUS_STYLE: Record<LibraryEntry['status'], string> = {
  BACKLOG: 'bg-secondary text-secondary-foreground',
  PLAYING: 'bg-accent text-accent-foreground',
  COMPLETED: 'bg-primary text-primary-foreground',
  ABANDONED: 'bg-muted text-muted-foreground',
}

export function GameCard({
  entry,
  onSelect,
}: {
  entry: LibraryEntry
  onSelect: (entry: LibraryEntry) => void
}) {
  const hours = (entry.playtimeMinutes / 60).toFixed(1)
  const coverSrc = entry.game.coverUrl?.startsWith('//')
    ? `https:${entry.game.coverUrl}`
    : entry.game.coverUrl

  return (
    <motion.button
      onClick={() => onSelect(entry)}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card/60 text-left transition hover:border-primary/50 hover:bg-card focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <motion.div
        layoutId={`cover-${entry.gameId}`}
        className="relative aspect-[3/4] overflow-hidden bg-secondary/40"
      >
        {coverSrc ? (
          <Image
            src={coverSrc}
            alt={entry.game.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <EmptyCover name={entry.game.name} />
        )}
        <div className="absolute top-2 right-2 z-10">
          <Badge
            className={cn(
              'text-[10px] uppercase tracking-wide',
              STATUS_STYLE[entry.status],
            )}
          >
            {STATUS_LABEL[entry.status]}
          </Badge>
        </div>
      </motion.div>

      <div className="flex flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-tight">
          {entry.game.name}
        </p>
        <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {hours}h
          </span>
          {entry.userRating != null && (
            <span className="inline-flex items-center gap-0.5 text-amber-400">
              <Star className="size-3 fill-current" />
              {entry.userRating}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}
