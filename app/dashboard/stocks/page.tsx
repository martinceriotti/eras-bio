import { createClient } from '@/lib/supabase/server'
import { requireAuth, canEdit, isAdmin } from '@/lib/auth'
import { getActiveTanks } from '@/lib/services/tanks'
import { getStockReadingsByDate } from '@/lib/services/stocks'
import { StocksClient } from './stocks-client'

export default async function StocksPage() {
  const supabase = await createClient()
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const { user, profile } = await requireAuth(supabase)
  const [tanks, todayReadings] = await Promise.all([
    getActiveTanks(supabase),
    getStockReadingsByDate(supabase, today),
  ])

  return (
    <StocksClient
      tanks={tanks}
      initialReadings={todayReadings}
      selectedDate={today}
      canEdit={canEdit(profile)}
      isAdmin={isAdmin(profile)}
      userId={user.id}
    />
  )
}
