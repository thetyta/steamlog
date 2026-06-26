'use client'

import { useState, useEffect, useCallback, useRef, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Star,
  Loader2,
  Gamepad2,
  Check,
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
import { createSession, updateSession, deleteSession } from './actions'

export type PlaySession = {
  id: string
  playedAt: string
  rating: number | null
  note: string | null
  game: { id: string; name: string; coverUrl: string | null }
}

type PickGame = { id: string; name: string; coverUrl: string | null }

const fieldClasses =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

function coverSrc(url: string | null) {
  if (!url) return null
  return url.startsWith('//') ? `https:${url}` : url
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { dateStyle: 'medium' })
}

function Cover({ game, className }: { game: PickGame; className?: string }) {
  const src = coverSrc(game.coverUrl)
  return (
    <div className={cn('relative overflow-hidden bg-secondary/40', className)}>
      {src ? (
        <Image src={src} alt={game.name} fill sizes="80px" className="object-cover" unoptimized />
      ) : (
        <EmptyCover name={game.name} />
      )}
    </div>
  )
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: value }).map((_, i) => (
        <Star key={i} className="size-3.5 fill-current" />
      ))}
    </span>
  )
}

export function SessionsBoard({ sessions }: { sessions: PlaySession[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PlaySession | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(s: PlaySession) {
    setEditing(s)
    setOpen(true)
  }

  function remove(s: PlaySession) {
    if (!confirm(`Excluir a sessão de “${s.game.name}”?`)) return
    setDeletingId(s.id)
    start(async () => {
      const res = await deleteSession(s.id)
      setDeletingId(null)
      if (res.ok) router.refresh()
      else alert(res.error)
    })
  }

  return (
    <div className="mt-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Registrar sessão
        </Button>
      </div>

      {sessions.length === 0 ? (
        <button
          onClick={openCreate}
          className="mt-4 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border py-14 text-center text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
        >
          <Gamepad2 className="size-7 opacity-50" />
          <span className="text-sm">
            Nenhuma sessão registrada. Anote o que você jogou e o que achou.
          </span>
        </button>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex gap-4 rounded-xl border border-border bg-card/60 p-4 backdrop-blur"
            >
              <Cover
                game={s.game}
                className="aspect-[3/4] w-16 shrink-0 rounded-lg border border-border"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{s.game.name}</h3>
                  <div className="flex shrink-0 items-center">
                    <button
                      onClick={() => openEdit(s)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label="Editar"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => remove(s)}
                      disabled={deletingId === s.id}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Excluir"
                    >
                      {deletingId === s.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3.5" /> {formatDate(s.playedAt)}
                  </span>
                  {s.rating != null && <Stars value={s.rating} />}
                </div>
                {s.note && (
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {s.note}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <SessionDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => {
          setOpen(false)
          router.refresh()
        }}
      />
    </div>
  )
}

function SessionDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: PlaySession | null
  onSaved: () => void
}) {
  const [game, setGame] = useState<PickGame | null>(null)
  const [date, setDate] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // (re)inicializa ao abrir
  useEffect(() => {
    if (!open) return
    if (editing) {
      setGame(editing.game)
      setDate(editing.playedAt.slice(0, 10))
      setRating(editing.rating)
      setNote(editing.note ?? '')
    } else {
      setGame(null)
      setDate(new Date().toISOString().slice(0, 10))
      setRating(null)
      setNote('')
    }
    setError(null)
  }, [open, editing])

  function save() {
    if (!editing && !game) {
      setError('Escolha um jogo.')
      return
    }
    start(async () => {
      setError(null)
      const payload = {
        playedAt: date,
        rating,
        note: note.trim() || null,
      }
      const res = editing
        ? await updateSession(editing.id, payload)
        : await createSession({ gameId: game!.id, ...payload })
      if (!res.ok) {
        setError(res.error)
        return
      }
      onSaved()
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar sessão' : 'Registrar sessão'}</DialogTitle>
          <DialogDescription>
            {editing ? 'Ajuste os detalhes desta partida.' : 'Anote o que você jogou.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {editing ? (
            <div className="flex items-center gap-3 rounded-md border border-border bg-secondary/20 p-2">
              <Cover game={editing.game} className="aspect-[3/4] w-8 rounded" />
              <span className="text-sm font-medium">{editing.game.name}</span>
            </div>
          ) : (
            <GamePicker selected={game} onSelect={setGame} />
          )}

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Data
            </label>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className={`mt-1.5 ${fieldClasses}`}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Sua nota <span className="normal-case">(opcional)</span>
            </label>
            <div className="mt-1.5 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  className="p-0.5 transition hover:scale-110"
                  aria-label={`${n} estrelas`}
                >
                  <Star
                    className={cn(
                      'size-6 transition-colors',
                      (rating ?? 0) >= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
                    )}
                  />
                </button>
              ))}
              {rating != null && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  className="ml-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  limpar
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Comentário <span className="normal-case">(opcional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Como foi a sessão…"
              className={`mt-1.5 resize-y ${fieldClasses}`}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {editing ? 'Salvar' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type LibraryListItem = {
  gameId: string
  game: { id: string; name: string; coverUrl: string | null }
}

function GamePicker({
  selected,
  onSelect,
}: {
  selected: PickGame | null
  onSelect: (g: PickGame) => void
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PickGame[]>([])
  const [loading, setLoading] = useState(false)
  const [openList, setOpenList] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

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
    if (!openList) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(search.trim()), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search, openList, runSearch])

  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-muted-foreground">Jogo</label>
      {selected && !openList ? (
        <button
          type="button"
          onClick={() => {
            setOpenList(true)
            setSearch('')
          }}
          className="mt-1.5 flex w-full items-center gap-3 rounded-md border border-border bg-secondary/20 p-2 text-left transition hover:border-primary/50"
        >
          <Cover game={selected} className="aspect-[3/4] w-8 rounded" />
          <span className="flex-1 truncate text-sm font-medium">{selected.name}</span>
          <span className="text-xs text-muted-foreground">trocar</span>
        </button>
      ) : (
        <>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setOpenList(true)}
              placeholder="Buscar jogo na biblioteca…"
              className="pl-9"
              autoFocus
            />
          </div>
          {openList && (
            <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-border">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Buscando…
                </div>
              ) : results.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {search.trim() ? 'Nenhum jogo encontrado.' : 'Digite pra buscar.'}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {results.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(g)
                          setOpenList(false)
                        }}
                        className="flex w-full items-center gap-3 p-2 text-left transition hover:bg-secondary/40"
                      >
                        <Cover game={g} className="aspect-[3/4] w-8 rounded" />
                        <span className="flex-1 truncate text-sm">{g.name}</span>
                        {selected?.id === g.id && <Check className="size-4 text-primary" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
