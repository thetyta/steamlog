'use client'

import { useState } from 'react'
import Image from 'next/image'
import { EmptyCover } from '@/components/empty-cover'

export function StoreCover({
  name,
  steamAppId,
}: {
  name: string
  steamAppId: number | null
}) {
  const [errored, setErrored] = useState(false)
  const src = steamAppId
    ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`
    : null

  if (!src || errored) return <EmptyCover name={name} />

  return (
    <Image
      src={src}
      alt={name}
      fill
      sizes="80px"
      className="object-cover"
      unoptimized
      onError={() => setErrored(true)}
    />
  )
}
