const PALETTE: [string, string][] = [
  ['#7c3aed', '#06b6d4'],
  ['#ec4899', '#f59e0b'],
  ['#10b981', '#06b6d4'],
  ['#f59e0b', '#ef4444'],
  ['#8b5cf6', '#ec4899'],
  ['#06b6d4', '#10b981'],
  ['#a855f7', '#3b82f6'],
  ['#f97316', '#db2777'],
]

function hashName(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function EmptyCover({
  name,
  className = '',
}: {
  name: string
  className?: string
}) {
  const [c1, c2] = PALETTE[hashName(name) % PALETTE.length]

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden p-3 text-center ${className}`}
      style={{
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 8px)',
        }}
      />
      <span className="relative z-10 line-clamp-4 text-balance text-sm font-bold leading-tight text-white drop-shadow">
        {name}
      </span>
    </div>
  )
}
