'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2, FolderOpen, Tag as TagIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  addGameToCollection,
  removeGameFromCollection,
  addGameToTag,
  removeGameFromTag,
} from '@/app/collections/actions'

type CollectionOpt = { id: string; name: string }
type TagOpt = { id: string; name: string; color: string | null }

export function GameOrganize({
  gameId,
  initialCollectionIds,
  initialTagIds,
}: {
  gameId: string
  initialCollectionIds: string[]
  initialTagIds: string[]
}) {
  const queryClient = useQueryClient()
  const [collIds, setCollIds] = useState(new Set(initialCollectionIds))
  const [tagIds, setTagIds] = useState(new Set(initialTagIds))
  const [busy, setBusy] = useState<string | null>(null)

  const { data: collections } = useQuery<CollectionOpt[]>({
    queryKey: ['collections'],
    queryFn: async () => {
      const r = await fetch('/api/collections')
      if (!r.ok) throw new Error()
      return r.json()
    },
    staleTime: 30_000,
  })

  const { data: tags } = useQuery<TagOpt[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const r = await fetch('/api/tags')
      if (!r.ok) throw new Error()
      return r.json()
    },
    staleTime: 30_000,
  })

  function toggleSet(
    set: Set<string>,
    setter: (s: Set<string>) => void,
    id: string,
    member: boolean,
  ) {
    const next = new Set(set)
    if (member) next.delete(id)
    else next.add(id)
    setter(next)
  }

  async function toggleCollection(id: string) {
    const member = collIds.has(id)
    setBusy(`c:${id}`)
    toggleSet(collIds, setCollIds, id, member)
    const res = member
      ? await removeGameFromCollection(id, gameId)
      : await addGameToCollection(id, gameId)
    setBusy(null)
    if (!res.ok) {
      toggleSet(collIds, setCollIds, id, !member) // reverte
    } else {
      queryClient.invalidateQueries({ queryKey: ['library', gameId] })
    }
  }

  async function toggleTag(id: string) {
    const member = tagIds.has(id)
    setBusy(`t:${id}`)
    toggleSet(tagIds, setTagIds, id, member)
    const res = member ? await removeGameFromTag(id, gameId) : await addGameToTag(id, gameId)
    setBusy(null)
    if (!res.ok) {
      toggleSet(tagIds, setTagIds, id, !member)
    } else {
      queryClient.invalidateQueries({ queryKey: ['library', gameId] })
    }
  }

  const noLists = collections && tags && collections.length === 0 && tags.length === 0

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Coleções e tags
      </h2>

      {noLists ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Você ainda não criou coleções ou tags.{' '}
          <Link href="/collections" className="text-primary hover:underline">
            Criar agora
          </Link>
          .
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <FolderOpen className="size-3.5" /> Coleções
            </p>
            {collections && collections.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {collections.map((c) => {
                  const member = collIds.has(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCollection(c.id)}
                      disabled={busy === `c:${c.id}`}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition',
                        member
                          ? 'border-primary bg-primary/15 text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {busy === `c:${c.id}` ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : member ? (
                        <Check className="size-3.5 text-primary" />
                      ) : null}
                      {c.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/70">Nenhuma coleção.</p>
            )}
          </div>

          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <TagIcon className="size-3.5" /> Tags
            </p>
            {tags && tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const member = tagIds.has(t.id)
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      disabled={busy === `t:${t.id}`}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition',
                        member
                          ? 'border-primary bg-primary/15 text-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {busy === `t:${t.id}` ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: t.color ?? '#94a3b8' }}
                        />
                      )}
                      {t.name}
                      {member && <Check className="size-3.5 text-primary" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/70">Nenhuma tag.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
