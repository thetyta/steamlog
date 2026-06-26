'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FilterOption = { id: string; name: string }

export function LibraryFilters({
  collections = [],
  tags = [],
}: {
  collections?: FilterOption[]
  tags?: FilterOption[]
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState(params.get('search') ?? '')

  useEffect(() => {
    const handler = setTimeout(() => {
      updateParam('search', search || null)
    }, 400)
    return () => clearTimeout(handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    startTransition(() => {
      router.push(`/library?${next.toString()}`)
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jogo…"
          className="pl-9"
        />
      </div>

      <Select
        value={params.get('status') ?? 'ALL'}
        onValueChange={(v) => updateParam('status', v === 'ALL' ? null : v)}
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos os status</SelectItem>
          <SelectItem value="BACKLOG">Backlog</SelectItem>
          <SelectItem value="PLAYING">Jogando</SelectItem>
          <SelectItem value="COMPLETED">Zerados</SelectItem>
          <SelectItem value="ABANDONED">Largados</SelectItem>
        </SelectContent>
      </Select>

      {collections.length > 0 && (
        <Select
          value={params.get('collectionId') ?? 'ALL'}
          onValueChange={(v) => updateParam('collectionId', v === 'ALL' ? null : v)}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Coleção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as coleções</SelectItem>
            {collections.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {tags.length > 0 && (
        <Select
          value={params.get('tagId') ?? 'ALL'}
          onValueChange={(v) => updateParam('tagId', v === 'ALL' ? null : v)}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as tags</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={params.get('sortBy') ?? 'playtime'}
        onValueChange={(v) => updateParam('sortBy', v === 'playtime' ? null : v)}
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="playtime">Mais jogadas</SelectItem>
          <SelectItem value="recent">Atualizado recente</SelectItem>
          <SelectItem value="lastPlayed">Jogadas recente</SelectItem>
          <SelectItem value="name">Nome (A-Z)</SelectItem>
        </SelectContent>
      </Select>

      {pending && (
        <span className="text-xs text-muted-foreground self-center">atualizando…</span>
      )}
    </div>
  )
}
