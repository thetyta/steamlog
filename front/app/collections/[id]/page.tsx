import { notFound, redirect } from 'next/navigation'
import { getMe } from '@/lib/queries'
import { api, ApiError } from '@/lib/api'
import { TopNav } from '@/components/top-nav'
import { CollectionDetail, type CollectionDetailData } from './collection-detail'

export default async function CollectionPage({ params }: { params: { id: string } }) {
  const me = await getMe()
  if (!me) redirect('/')

  let data: CollectionDetailData
  try {
    data = await api<CollectionDetailData>(`/collections/${params.id}`)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound()
    throw e
  }

  return (
    <>
      <TopNav active="collections" />
      <main className="container max-w-5xl py-10">
        <CollectionDetail initial={data} />
      </main>
    </>
  )
}
