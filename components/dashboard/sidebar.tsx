'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Leaf,
  LayoutDashboard,
  Container,
  Scale,
  Factory,
  TrendingUp,
  FileText,
  Settings,
  ChevronDown,
  LogOut,
  User,
  Gauge,
} from 'lucide-react'
import type { Profile } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/types'

interface SidebarProps {
  user: Profile | null
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Stocks',
    href: '/dashboard/stocks',
    icon: Container,
  },
  {
    name: 'Caudalímetro',
    href: '/dashboard/flowmeter',
    icon: Gauge,
  },
  {
    name: 'Balanza',
    href: '/dashboard/weighings',
    icon: Scale,
  },
  {
    name: 'Producción',
    href: '/dashboard/production',
    icon: Factory,
  },
  {
    name: 'Consumos',
    href: '/dashboard/consumption',
    icon: TrendingUp,
  },
  {
    name: 'Reportes',
    href: '/dashboard/reports',
    icon: FileText,
  },
]

const adminNavigation = [
  {
    name: 'Configuración',
    href: '/dashboard/admin',
    icon: Settings,
  },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isAdmin = user?.role === 'admin'
  const canWrite = user?.role === 'operador' || user?.role === 'admin'

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Leaf className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">ERA S.A.</span>
          <span className="text-xs text-sidebar-foreground/60">Control de Inventarios</span>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}

          {isAdmin && (
            <>
              <div className="my-3 border-t border-sidebar-border" />
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Administración
              </p>
              {adminNavigation.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
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
      </ScrollArea>

      {/* User Menu */}
      <div className="border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-6 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium truncate max-w-[120px]">
                    {user?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                  </span>
                  <span className="text-xs text-sidebar-foreground/60">
                    {user?.role ? ROLE_LABELS[user.role] : 'Sin rol'}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.full_name || 'Usuario'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
