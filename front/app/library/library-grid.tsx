'use client'

import { useState, useEffect, useCallback } from 'react'
import { LayoutGroup } from 'framer-motion'
import { GameCard, type LibraryEntry } from './game-card'
import { GameModal } from './game-modal'

export function LibraryGrid({ items }: { items: LibraryEntry[] }) {
  const [selected, setSelected] = useState<LibraryEntry | null>(null)

  const handleClose = useCallback(() => setSelected(null), [])

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [selected, handleClose])

  return (
    <LayoutGroup>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((entry) => (
          <GameCard key={entry.gameId} entry={entry} onSelect={setSelected} />
        ))}
      </div>
      <GameModal entry={selected} onClose={handleClose} />
    </LayoutGroup>
  )
}
