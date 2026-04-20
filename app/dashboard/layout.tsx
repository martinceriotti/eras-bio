import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { MobileHeader } from '@/components/dashboard/mobile-header'
import type { Profile } from '@/lib/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const userProfile: Profile | null = profile

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block">
        <Sidebar user={userProfile} />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        {/* Mobile Header */}
        <MobileHeader user={userProfile} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
