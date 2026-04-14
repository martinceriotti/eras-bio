import { createClient } from '@/lib/supabase/server'
import { ReportsClient } from './reports-client'

export default async function ReportsPage() {
  const supabase = await createClient()

  // Fetch products for filters
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Fetch tanks for filters
  const { data: tanks } = await supabase
    .from('tanks')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  return (
    <ReportsClient 
      products={products || []} 
      tanks={tanks || []}
    />
  )
}
