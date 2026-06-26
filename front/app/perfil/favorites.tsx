'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Crown,
  Pencil,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  Check,
  Loader2,
  Trophy,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyCover } from '@/components/empty-cover'
import { cn } from '@/lib/utils'

export type FavoriteGame = { gameId: string; name: string; coverUrl: string | null }

const MAX = 5

function coverSrc(url: string | null) {
  if (!url) return null
  return url.startsWith('//') ? `https:${url}` : url
}

function Cover({
  game,
  className,
  sizes,
}: {
  game: FavoriteGame
  className?: string
  sizes?: string
}) {
  const src = coverSrc(game.coverUrl)
  return (
    <div className={cn('relative overflow-hidden bg-secondary/40', className)}>
      {src ? (
        <Image
          src={src}
          alt={game.name}
          fill
          sizes={sizes ?? '160px'}
          className="object-cover"
          unoptimized
        />
      ) : (
        <EmptyCover name={game.name} />
      )}
    </div>
  )
}

const RANK_STYLE: Record<number, string> = {
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-slate-300 text-slate-900',
  3: 'bg-orange-400 text-orange-950',
}

function RankBadge({ rank, className }: { rank: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-full text-xs font-bold shadow',
        RANK_STYLE[rank] ?? 'bg-secondary text-secondary-foreground',
        className,
      )}
    >
      {rank}
    </span>
  )
}

export function FavoritesSection({ initial }: { initial: FavoriteGame[] }) {
  const [favorites, setFavorites] = useState<FavoriteGame[]>(initial)
  const [open, setOpen] = useState(false)

  const top = favorites[0]
  const rest = favorites.slice(1)

  return (
    <section className="mt-8 rounded-xl border border-border bg-card/60 p-5 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Trophy className="size-4 text-amber-400" />
          Top 5 favoritos
        </h2>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="size-3.5" />
          {favorites.length ? 'Editar' : 'Escolher'}
        </Button>
      </div>

      {favorites.length === 0 ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
        >
          <Crown className="size-7 opacity-50" />
          <span className="text-sm">
            Monte seu pódio — escolha até 5 jogos favoritos da sua biblioteca.
          </span>
        </button>
      ) : (
        <div className="mt-5">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
            {/* #1 em destaque */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <Cover
                  game={top}
                  className="aspect-[3/4] w-32 rounded-xl border-2 border-amber-400/70 shadow-lg sm:w-40"
                  sizes="160px"
                />
                <Crown className="absolute -top-3 left-1/2 size-7 -translate-x-1/2 text-amber-400 drop-shadow" />
                <RankBadge rank={1} className="absolute -bottom-2 left-1/2 -translate-x-1/2" />
              </div>
              <p className="mt-3 w-32 truncate text-center text-sm font-medium sm:w-40" title={top.name}>
                {top.name}
              </p>
            </div>

            {/* #2 a #5 */}
            {rest.length > 0 && (
              <div className="mt-6 grid flex-1 grid-cols-2 justify-items-center gap-3 sm:mt-0 sm:grid-cols-4">
                {rest.map((g, i) => (
                  <div key={g.gameId} className="flex w-24 flex-col items-center sm:w-28">
                    <div className="relative w-full">
                      <Cover
                        game={g}
                        className="aspect-[3/4] w-full rounded-lg border border-border"
                        sizes="120px"
                      />
                      <RankBadge
                        rank={i + 2}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                      />
                    </div>
                    <p className="mt-3 w-full truncate text-center text-xs text-muted-foreground" title={g.name}>
                      {g.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <FavoritesEditor
        open={open}
        onOpenChange={setOpen}
        current={favorites}
        onSaved={setFavorites}
      />
    </section>
  )
}

type LibraryListItem = {
  gameId: string
  game: { id: string; name: string; coverUrl: string | null }
}

function FavoritesEditor({
  open,
  onOpenChange,
  current,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  current: FavoriteGame[]
  onSaved: (next: FavoriteGame[]) => void
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<FavoriteGame[]>(current)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<FavoriteGame[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Re-seed sempre que abre.
  useEffect(() => {
    if (open) {
      setSelected(current)
      setSearch('')
      setResults([])
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const runSearch = useCallback(async (term: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/library?search=${encodeURIComponent(term)}`)
      if (!res.ok) throw new Error('Falha na busca')
      const data = (await res.json()) as { items: LibraryListItem[] }
      setResults(
        data.items.map((i) => ({
          gameId: i.gameId,
          name: i.game.name,
          coverUrl: i.game.coverUrl,
        })),
      )
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(search.trim()), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search, open, runSearch])

  const selectedIds = new Set(selected.map((s) => s.gameId))

  function toggle(game: FavoriteGame) {
    setError(null)
    if (selectedIds.has(game.gameId)) {
      setSelected((s) => s.filter((g) => g.gameId !== game.gameId))
    } else if (selected.length < MAX) {
      setSelected((s) => [...s, game])
    } else {
      setError(`Máximo de ${MAX} jogos. Remova um antes de adicionar outro.`)
    }
  }

  function move(index: number, dir: -1 | 1) {
    setSelected((s) => {
      const next = [...s]
      const target = index + dir
      if (target < 0 || target >= next.length) return s
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function remove(gameId: string) {
    setSelected((s) => s.filter((g) => g.gameId !== gameId))
  }

  function save() {
    startSaving(async () => {
      setError(null)
      const res = await fetch('/api/library/favorites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameIds: selected.map((s) => s.gameId) }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error ?? 'Não foi possível salvar.')
        return
      }
      onSaved(selected)
      router.refresh()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seu top 5 favoritos</DialogTitle>
          <DialogDescription>
            Busque na sua biblioteca e escolha até {MAX} jogos. A ordem define o pódio.
          </DialogDescription>
        </DialogHeader>

        {/* Selecionados */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Selecionados
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {selected.length}/{MAX}
            </span>
          </div>
          {selected.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum jogo escolhido ainda.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {selected.map((g, i) => (
                <li
                  key={g.gameId}
                  className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 p-2"
                >
                  <RankBadge rank={i + 1} />
                  <Cover game={g} className="aspect-[3/4] w-8 rounded" sizes="32px" />
                  <span className="flex-1 truncate text-sm">{g.name}</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Subir"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === selected.length - 1}
                      className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Descer"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                    <button
                      onClick={() => remove(g.gameId)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remover"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Busca */}
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar na biblioteca…"
              className="pl-9"
            />
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-border">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Buscando…
              </div>
            ) : results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {search.trim() ? 'Nenhum jogo encontrado.' : 'Digite pra buscar seus jogos.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {results.map((g) => {
                  const isSelected = selectedIds.has(g.gameId)
                  return (
                    <li key={g.gameId}>
                      <button
                        onClick={() => toggle(g)}
                        className="flex w-full items-center gap-3 p-2 text-left transition hover:bg-secondary/40"
                      >
                        <Cover game={g} className="aspect-[3/4] w-8 rounded" sizes="32px" />
                        <span className="flex-1 truncate text-sm">{g.name}</span>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-xs text-primary">
                            <Check className="size-4" /> escolhido
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">adicionar</span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
