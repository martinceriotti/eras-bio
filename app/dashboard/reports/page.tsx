import { createClient } from '@/lib/supabase/server'
import { getActiveProducts } from '@/lib/services/products'
import { getActiveTanks } from '@/lib/services/tanks'
import { ReportsClient } from './reports-client'

export default async function ReportsPage() {
  const supabase = await createClient()

  const [products, tanks] = await Promise.all([
    getActiveProducts(supabase),
    getActiveTanks(supabase),
  ])

  return (
    <ReportsClient
      products={products}
      tanks={tanks}
    />
  )
}
