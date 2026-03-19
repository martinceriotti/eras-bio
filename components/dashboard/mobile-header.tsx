'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Leaf,
  Menu,
  LayoutDashboard,
  Container,
  Scale,
  Factory,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Gauge,
} from 'lucide-react'
import type { Profile } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'

interface MobileHeaderProps {
  user: Profile | null
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Stocks', href: '/dashboard/stocks', icon: Container },
  { name: 'Caudalímetro', href: '/dashboard/flowmeter', icon: Gauge },
  { name: 'Balanza', href: '/dashboard/weighings', icon: Scale },
  { name: 'Producción', href: '/dashboard/production', icon: Factory },
  { name: 'Consumos', href: '/dashboard/consumption', icon: TrendingUp },
  { name: 'Reportes', href: '/dashboard/reports', icon: FileText },
]

const adminNavigation = [
  { name: 'Configuración', href: '/dashboard/admin', icon: Settings },
]

export function MobileHeader({ user }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isAdmin = user?.role === 'admin'

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Leaf className="h-4 w-4" />
        </div>
        <span className="font-semibold text-foreground">ERA S.A.</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-14 items-center gap-3 border-b px-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Leaf className="h-4 w-4" />
              </div>
              <span className="font-semibold">ERA S.A.</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}

              {isAdmin && (
                <>
                  <div className="my-3 border-t" />
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Administración
                  </p>
                  {adminNavigation.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    )
                  })}
                </>
              )}
            </nav>

            {/* User info & Logout */}
            <div className="border-t p-4">
              <div className="mb-3 px-3">
                <p className="text-sm font-medium">{user?.full_name || user?.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role ? ROLE_LABELS[user.role] : 'Sin rol'}
                </p>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
