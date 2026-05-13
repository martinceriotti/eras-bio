'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useState } from 'react'
import { Leaf, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error al enviar el correo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Leaf className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">ERA S.A.</h1>
            <p className="text-sm text-muted-foreground text-balance text-center">
              Sistema de Control de Inventarios - Planta de Biodiesel
            </p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
              <CardDescription>
                {sent
                  ? 'Revisá tu correo electrónico'
                  : 'Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="flex flex-col gap-4 text-center">
                  <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
                    Te enviamos un enlace a <strong>{email}</strong>. Revisá también la carpeta de spam.
                  </div>
                  <Link
                    href="/auth/login"
                    className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al inicio de sesión
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-5">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="usuario@era.com.ar"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    {error && (
                      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}
                    <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                      {isLoading ? 'Enviando...' : 'Enviar enlace'}
                    </Button>
                  </div>
                  <div className="mt-6 text-center">
                    <Link
                      href="/auth/login"
                      className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver al inicio de sesión
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Energías Renovables Argentinas S.A.
          </p>
        </div>
      </div>
    </div>
  )
}
