import { createClient } from '@/lib/supabase/server'
import { requireAuth, canEdit, isAdmin } from '@/lib/auth'
import { getActiveTanks } from '@/lib/services/tanks'
import { getStockReadingsByDate } from '@/lib/services/stocks'
import { StocksClient } from './stocks-client'

export default async function StocksPage() {
  const supabase = await createClient()
  const now = new Date()
  // Fecha inicial = ayer (hoy no se permite cargar datos)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const initialDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  const { user, profile } = await requireAuth(supabase)
  const [tanks, initialReadings] = await Promise.all([
    getActiveTanks(supabase),
    getStockReadingsByDate(supabase, initialDate),
  ])

  return (
    <StocksClient
      tanks={tanks}
      initialReadings={initialReadings}
      selectedDate={initialDate}
      canEdit={canEdit(profile)}
      isAdmin={isAdmin(profile)}
      userId={user.id}
    />
  )
}
