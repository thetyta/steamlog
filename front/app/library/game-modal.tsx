'use client'

import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Tag, X, ExternalLink, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyCover } from '@/components/empty-cover'
import type { LibraryEntry } from './game-card'

type Screenshot = { thumb: string; full: string }

type LibraryDetail = LibraryEntry & {
  userNote: string | null
  game: LibraryEntry['game'] & {
    summary: string | null
    headerImageUrl: string | null
    detailedSummary: string | null
    releaseDate: string | null
    avgPlaytimeHours: number | null
    priceCents: number | null
    isFree: boolean
    screenshots: Screenshot[] | null
    steamAppId?: number
  }
}

function formatPrice(cents: number | null, isFree: boolean): string | null {
  if (isFree) return 'Gratuito'
  if (cents == null) return null
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fixProtocolRelative(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('//') ? `https:${url}` : url
}

export function GameModal({
  entry,
  onClose,
}: {
  entry: LibraryEntry | null
  onClose: () => void
}) {
  const { data: detail, isLoading } = useQuery<LibraryDetail>({
    queryKey: ['library', entry?.gameId],
    queryFn: async () => {
      const res = await fetch(`/api/library/${entry!.gameId}`)
      if (!res.ok) throw new Error('Falha ao carregar detalhe')
      return res.json()
    },
    enabled: !!entry,
    staleTime: 60_000,
  })

  return (
    <AnimatePresence>
      {entry && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] z-50 mx-auto max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-30 inline-flex size-9 items-center justify-center rounded-full bg-background/70 backdrop-blur hover:bg-background"
              aria-label="Fechar"
            >
              <X className="size-4" />
            </button>

            <ModalContent entry={entry} detail={detail} isLoading={isLoading} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ModalContent({
  entry,
  detail,
  isLoading,
}: {
  entry: LibraryEntry
  detail: LibraryDetail | undefined
  isLoading: boolean
}) {
  const coverSrc = fixProtocolRelative(entry.game.coverUrl)
  const header = detail?.game.headerImageUrl
  const hours = (entry.playtimeMinutes / 60).toFixed(1)
  const price = detail ? formatPrice(detail.game.priceCents, detail.game.isFree) : null
  const description = detail?.game.detailedSummary ?? detail?.game.summary

  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="relative aspect-[16/7] w-full overflow-hidden bg-secondary/40"
      >
        {header ? (
          <Image
            src={header}
            alt={entry.game.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 900px"
            unoptimized
            priority
          />
        ) : coverSrc ? (
          <Image
            src={coverSrc}
            alt={entry.game.name}
            fill
            className="object-cover blur-2xl scale-125"
            sizes="(max-width: 768px) 100vw, 900px"
            unoptimized
          />
        ) : (
          <EmptyCover name={entry.game.name} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
      </motion.div>

      <div className="px-6 pb-8 -mt-24 sm:-mt-28 relative z-10">
        <div className="flex items-end gap-4">
          <motion.div
            layoutId={`cover-${entry.gameId}`}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="relative aspect-[3/4] w-32 sm:w-40 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/40 shadow-2xl"
          >
            {coverSrc ? (
              <Image
                src={coverSrc}
                alt={entry.game.name}
                fill
                sizes="160px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <EmptyCover name={entry.game.name} />
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="pb-1"
          >
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {entry.game.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.game.genres.map((g) => (
                <Badge key={g.id} variant="secondary" className="text-[10px]">
                  {g.name}
                </Badge>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.dl
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm"
        >
          <Stat label="Status" value={entry.status} />
          <Stat
            label="Horas jogadas"
            value={
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> {hours}h
              </span>
            }
          />
          {isLoading ? (
            <Stat label="Preço" value={<Skeleton className="h-4 w-16" />} />
          ) : (
            price && (
              <Stat
                label="Preço atual"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Tag className="size-3.5" /> {price}
                  </span>
                }
              />
            )
          )}
          {detail?.lastPlayedAt && (
            <Stat
              label="Última vez jogado"
              value={new Date(detail.lastPlayedAt).toLocaleDateString('pt-BR')}
            />
          )}
        </motion.dl>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : description ? (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic">
              Sem descrição disponível.
            </p>
          )}
        </motion.div>

        {detail?.game.screenshots && detail.game.screenshots.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Screenshots
            </h2>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {detail.game.screenshots.slice(0, 6).map((s, i) => (
                <a
                  key={i}
                  href={s.full}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-secondary/40"
                >
                  <Image
                    src={s.thumb}
                    alt={`Screenshot ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition group-hover:scale-105"
                    unoptimized
                  />
                  <ExternalLink className="absolute bottom-2 right-2 size-3.5 text-white opacity-0 transition group-hover:opacity-100" />
                </a>
              ))}
            </div>
          </motion.section>
        )}

        {isLoading && !detail && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Carregando detalhes da Steam Store…
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  )
}
