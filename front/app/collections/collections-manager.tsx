'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FolderPlus, Library, Loader2, FolderOpen } from 'lucide-react'
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
import { createCollection } from './actions'
import type { CollectionListItem } from './page'

const fieldClasses =
  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function CollectionsManager({ initial }: { initial: CollectionListItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    if (!name.trim()) {
      setError('Dê um nome à coleção.')
      return
    }
    start(async () => {
      setError(null)
      const res = await createCollection({ name: name.trim(), description: description.trim() })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setName('')
      setDescription('')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Coleções</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <FolderPlus className="size-4" />
          Nova coleção
        </Button>
      </div>

      {initial.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma coleção ainda. Crie uma pra agrupar jogos como “Pra zerar em 2026” ou
          “Co-op com amigos”.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initial.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.id}`}
              className="group flex flex-col rounded-xl border border-border bg-card/60 p-4 backdrop-blur transition hover:border-primary/50 hover:bg-card"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="size-4 text-primary" />
                <h3 className="flex-1 truncate font-medium">{c.name}</h3>
              </div>
              {c.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                  {c.description}
                </p>
              )}
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Library className="size-3.5" />
                {c._count.games} {c._count.games === 1 ? 'jogo' : 'jogos'}
              </span>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova coleção</DialogTitle>
            <DialogDescription>Agrupe jogos da sua biblioteca por tema.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                Nome
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Ex.: Pra zerar em 2026"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                Descrição <span className="normal-case">(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Pra que serve essa coleção…"
                className={`mt-1.5 resize-y ${fieldClasses}`}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
