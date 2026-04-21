'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Registrar el error para análisis (ej. Sentry, Datadog)
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocurrió un error inesperado. Por favor intentá de nuevo.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Código: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} variant="outline">
        Reintentar
      </Button>
    </div>
  )
}
