import Link from 'next/link'
import Image from 'next/image'
import { Gamepad2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMe } from '@/lib/queries'

type Active = 'dashboard' | 'library' | 'recommendations'

export async function TopNav({ active }: { active?: Active }) {
  const me = await getMe()
  if (!me) return null

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Gamepad2 className="size-5 text-primary" />
            <span>GameMuse</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <NavLink href="/dashboard" active={active === 'dashboard'}>
              Dashboard
            </NavLink>
            <NavLink href="/library" active={active === 'library'}>
              Biblioteca
            </NavLink>
            <NavLink href="/recommendations" active={active === 'recommendations'}>
              Recomendações
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-muted-foreground">
            {me.displayName}
          </span>
          {me.avatarUrl && (
            <Image
              src={me.avatarUrl}
              alt={me.displayName}
              width={32}
              height={32}
              className="size-8 rounded-full"
            />
          )}
          <Link
            href="/auth/logout"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-md px-3 py-1.5 transition',
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </Link>
  )
}
