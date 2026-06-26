'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Search,
  X,
  Loader2,
  Check,
  Library,
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
import { Badge } from '@/components/ui/badge'
import { EmptyCover } from '@/components/empty-cover'
import { cn } from '@/lib/utils'
import {
  updateCollection,
  deleteCollection,
  addGameToCollection,
  removeGameFromCollection,
} from '../actions'

type GameItem = {
  id: string
  name: string
  coverUrl: string | null
  genres?: { id: number; name: string }[]
}

export type CollectionDetailData = {
  id: string
  name: string
  description: string | null
  games: GameItem[]
}

const fieldClasses =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function coverSrc(url: string | null) {
  if (!url) return null
  return url.startsWith('//') ? `https:${url}` : url
}

function Cover({ game, className }: { game: GameItem; className?: string }) {
  const src = coverSrc(game.coverUrl)
  return (
    <div className={cn('relative overflow-hidden bg-secondary/40', className)}>
      {src ? (
        <Image src={src} alt={game.name} fill sizes="160px" className="object-cover" unoptimized />
      ) : (
        <EmptyCover name={game.name} />
      )}
    </div>
  )
}

export function CollectionDetail({ initial }: { initial: CollectionDetailData }) {
  const router = useRouter()
  const [games, setGames] = useState<GameItem[]>(initial.games)
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)

  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  return (
    <>
      <Link
        href="/collections"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Coleções
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-semibold tracking-tight">{name}</h1>
          {description && (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
          )}
          <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Library className="size-3.5" />
            {games.length} {games.length === 1 ? 'jogo' : 'jogos'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" />
            Editar
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Adicionar jogos
          </Button>
        </div>
      </header>

      {games.length === 0 ? (
        <button
          onClick={() => setAddOpen(true)}
          className="mt-8 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
        >
          <Plus className="size-7 opacity-50" />
          <span className="text-sm">Coleção vazia — adicione jogos da sua biblioteca.</span>
        </button>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {games.map((g) => (
            <GameTile
              key={g.id}
              game={g}
              onRemoved={() => setGames((s) => s.filter((x) => x.id !== g.id))}
              collectionId={initial.id}
            />
          ))}
        </div>
      )}

      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        id={initial.id}
        name={name}
        description={description}
        onSaved={(n, d) => {
          setName(n)
          setDescription(d)
          router.refresh()
        }}
      />

      <AddGamesDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        collectionId={initial.id}
        games={games}
        setGames={setGames}
      />
    </>
  )
}

function GameTile({
  game,
  collectionId,
  onRemoved,
}: {
  game: GameItem
  collectionId: string
  onRemoved: () => void
}) {
  const [pending, start] = useTransition()

  function remove() {
    start(async () => {
      const res = await removeGameFromCollection(collectionId, game.id)
      if (res.ok) onRemoved()
    })
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card/60">
      <Cover game={game} className="aspect-[3/4]" />
      <button
        onClick={remove}
        disabled={pending}
        className="absolute right-1.5 top-1.5 z-10 inline-flex size-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground opacity-0 backdrop-blur transition hover:text-destructive group-hover:opacity-100"
        aria-label={`Remover ${game.name}`}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      </button>
      <p className="line-clamp-2 p-2 text-sm font-medium leading-tight">{game.name}</p>
    </div>
  )
}

function EditDialog({
  open,
  onOpenChange,
  id,
  name,
  description,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  id: string
  name: string
  description: string | null
  onSaved: (name: string, description: string | null) => void
}) {
  const router = useRouter()
  const [n, setN] = useState(name)
  const [d, setD] = useState(description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (open) {
      setN(name)
      setD(description ?? '')
      setError(null)
    }
  }, [open, name, description])

  function save() {
    if (!n.trim()) {
      setError('Dê um nome à coleção.')
      return
    }
    start(async () => {
      const res = await updateCollection(id, { name: n.trim(), description: d.trim() || null })
      if (!res.ok) {
        setError(res.error)
        return
      }
      onSaved(n.trim(), d.trim() || null)
      onOpenChange(false)
    })
  }

  function del() {
    if (!confirm('Excluir esta coleção? Os jogos não são apagados.')) return
    start(async () => {
      const res = await deleteCollection(id)
      if (res.ok) {
        router.push('/collections')
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar coleção</DialogTitle>
          <DialogDescription>Altere o nome ou a descrição.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Nome</label>
            <Input value={n} onChange={(e) => setN(e.target.value)} maxLength={80} className="mt-1.5" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Descrição
            </label>
            <textarea
              value={d}
              onChange={(e) => setD(e.target.value)}
              rows={2}
              maxLength={500}
              className={`mt-1.5 resize-y ${fieldClasses}`}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={del} disabled={pending} className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
            Excluir
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type LibraryListItem = {
  gameId: string
  game: { id: string; name: string; coverUrl: string | null }
}

function AddGamesDialog({
  open,
  onOpenChange,
  collectionId,
  games,
  setGames,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  collectionId: string
  games: GameItem[]
  setGames: React.Dispatch<React.SetStateAction<GameItem[]>>
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<GameItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const memberIds = new Set(games.map((g) => g.id))

  const runSearch = useCallback(async (term: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/library?search=${encodeURIComponent(term)}`)
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { items: LibraryListItem[] }
      setResults(
        data.items.map((i) => ({ id: i.game.id, name: i.game.name, coverUrl: i.game.coverUrl })),
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

  useEffect(() => {
    if (open) {
      setSearch('')
      setResults([])
    }
  }, [open])

  function toggle(game: GameItem) {
    const isMember = memberIds.has(game.id)
    setBusyId(game.id)
    // otimista
    if (isMember) {
      setGames((s) => s.filter((x) => x.id !== game.id))
    } else {
      setGames((s) => [...s, game])
    }
    void (async () => {
      const res = isMember
        ? await removeGameFromCollection(collectionId, game.id)
        : await addGameToCollection(collectionId, game.id)
      setBusyId(null)
      if (!res.ok) {
        // reverte
        if (isMember) setGames((s) => [...s, game])
        else setGames((s) => s.filter((x) => x.id !== game.id))
      }
    })()
  }

  function close() {
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Adicionar jogos</DialogTitle>
          <DialogDescription>
            Busque na biblioteca e toque pra adicionar ou remover da coleção.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar na biblioteca…"
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border border-border">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Buscando…
            </div>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {search.trim() ? 'Nenhum jogo encontrado.' : 'Digite pra buscar seus jogos.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((g) => {
                const isMember = memberIds.has(g.id)
                return (
                  <li key={g.id}>
                    <button
                      onClick={() => toggle(g)}
                      disabled={busyId === g.id}
                      className="flex w-full items-center gap-3 p-2 text-left transition hover:bg-secondary/40"
                    >
                      <Cover game={g} className="aspect-[3/4] w-8 rounded" />
                      <span className="flex-1 truncate text-sm">{g.name}</span>
                      {busyId === g.id ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : isMember ? (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <Check className="size-4" /> na coleção
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

        <DialogFooter>
          <Button onClick={close}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
