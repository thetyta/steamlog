'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Tag as TagIcon, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { createTag, updateTag, deleteTag } from './actions'
import type { TagListItem } from './page'

const PRESETS = ['#7dd3fc', '#f9a8d4', '#fcd34d', '#86efac', '#c4b5fd', '#fca5a5', '#94a3b8']
const DEFAULT_COLOR = '#7dd3fc'

export function TagsManager({ initial }: { initial: TagListItem[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<TagListItem | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setName('')
    setColor(DEFAULT_COLOR)
    setError(null)
    setOpen(true)
  }

  function openEdit(tag: TagListItem) {
    setEditing(tag)
    setName(tag.name)
    setColor(tag.color ?? DEFAULT_COLOR)
    setError(null)
    setOpen(true)
  }

  function submit() {
    if (!name.trim()) {
      setError('Dê um nome à tag.')
      return
    }
    start(async () => {
      setError(null)
      const res = editing
        ? await updateTag(editing.id, { name: name.trim(), color })
        : await createTag({ name: name.trim(), color })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  function remove(tag: TagListItem) {
    if (!confirm(`Excluir a tag “${tag.name}”? Os jogos não são apagados.`)) return
    setDeletingId(tag.id)
    start(async () => {
      const res = await deleteTag(tag.id)
      setDeletingId(null)
      if (res.ok) router.refresh()
    })
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tags</h2>
        <Button size="sm" variant="secondary" onClick={openCreate}>
          <Plus className="size-4" />
          Nova tag
        </Button>
      </div>

      {initial.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma tag ainda. Tags são rótulos coloridos como “relaxar”, “rage” ou
          “história boa”.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {initial.map((t) => (
            <div
              key={t.id}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 py-1 pl-3 pr-1.5 text-sm"
            >
              <Link
                href={`/library?tagId=${t.id}`}
                className="inline-flex items-center gap-2 hover:text-foreground"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: t.color ?? '#94a3b8' }}
                />
                <span>{t.name}</span>
                <span className="text-xs text-muted-foreground">{t._count.games}</span>
              </Link>
              <div className="flex items-center">
                <button
                  onClick={() => openEdit(t)}
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground"
                  aria-label={`Editar ${t.name}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => remove(t)}
                  disabled={deletingId === t.id}
                  className="rounded-full p-1 text-muted-foreground hover:text-destructive"
                  aria-label={`Excluir ${t.name}`}
                >
                  {deletingId === t.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar tag' : 'Nova tag'}</DialogTitle>
            <DialogDescription>
              <span className="inline-flex items-center gap-1">
                <TagIcon className="size-3.5" />
                Rótulo colorido pra marcar jogos.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                Nome
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Ex.: relaxar"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                Cor
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-9 cursor-pointer rounded-md border border-input bg-background"
                  aria-label="Cor personalizada"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setColor(p)}
                      className={cn(
                        'size-6 rounded-full ring-offset-2 ring-offset-background transition',
                        color.toLowerCase() === p.toLowerCase() && 'ring-2 ring-ring',
                      )}
                      style={{ backgroundColor: p }}
                      aria-label={`Cor ${p}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
