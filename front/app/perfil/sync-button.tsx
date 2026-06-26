'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2, RefreshCw, TriangleAlert, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { syncSteamLibrary, type SyncResult } from './actions'

export function SyncSteamButton({ variant = 'default' }: { variant?: 'default' | 'secondary' }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<SyncResult | null>(null)

  function onClick() {
    setResult(null)
    startTransition(async () => {
      const r = await syncSteamLibrary()
      setResult(r)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={onClick}
        disabled={pending}
        variant={variant}
        size="lg"
        className="self-start"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sincronizando…
          </>
        ) : (
          <>
            <RefreshCw className="size-4" />
            Sincronizar biblioteca
          </>
        )}
      </Button>

      {result?.ok && result.synced > 0 && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="size-4" />
          {result.synced} jogos sincronizados
        </div>
      )}

      {result?.ok && result.warning && (
        <div className="flex items-start gap-2 text-sm text-amber-400">
          <TriangleAlert className="size-4 mt-0.5 shrink-0" />
          <span>{result.warning}</span>
        </div>
      )}

      {result?.ok === false && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <XCircle className="size-4 mt-0.5 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}
    </div>
  )
}
