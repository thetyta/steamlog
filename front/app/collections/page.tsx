import { redirect } from 'next/navigation'
import { getMe } from '@/lib/queries'
import { api } from '@/lib/api'
import { TopNav } from '@/components/top-nav'
import { CollectionsManager } from './collections-manager'
import { TagsManager } from './tags-manager'

export type CollectionListItem = {
  id: string
  name: string
  description: string | null
  _count: { games: number }
}

export type TagListItem = {
  id: string
  name: string
  color: string | null
  _count: { games: number }
}

export default async function CollectionsPage() {
  const me = await getMe()
  if (!me) redirect('/')

  const [collections, tags] = await Promise.all([
    api<CollectionListItem[]>('/collections'),
    api<TagListItem[]>('/tags'),
  ])

  return (
    <>
      <TopNav active="collections" />
      <main className="container max-w-5xl space-y-12 py-10">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">Coleções e tags</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize sua biblioteca em coleções temáticas e marque jogos com tags.
          </p>
        </header>

        <CollectionsManager initial={collections} />
        <TagsManager initial={tags} />
      </main>
    </>
  )
}
