import { createClient } from '@/lib/supabase/server'
import { StocksClient } from './stocks-client'
import type { Tank, StockReading } from '@/lib/types'

export default async function StocksPage() {
  const supabase = await createClient()
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // Fetch current user profile
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  // Fetch all active tanks
  const { data: tanks } = await supabase
    .from('tanks')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  // Fetch today's stock readings
  const { data: todayReadings } = await supabase
    .from('stock_readings')
    .select('*')
    .eq('reading_date', today)

  const canEdit = profile?.role === 'operador' || profile?.role === 'admin'
  const isAdmin = profile?.role === 'admin'

  return (
    <StocksClient
      tanks={(tanks || []) as Tank[]}
      initialReadings={(todayReadings || []) as StockReading[]}
      selectedDate={today}
      canEdit={canEdit}
      isAdmin={isAdmin}
      userId={user?.id || ''}
    />
  )
}
