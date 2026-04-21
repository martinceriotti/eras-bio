import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { getAllTanks } from '@/lib/services/tanks'
import { getAllProducts } from '@/lib/services/products'
import { getAllProfiles } from '@/lib/services/profiles'
import { AdminClient } from './admin-client'

export default async function AdminPage() {
  const supabase = await createClient()
  await requireRole(supabase, 'admin')

  const [users, tanks, products] = await Promise.all([
    getAllProfiles(supabase),
    getAllTanks(supabase),
    getAllProducts(supabase),
  ])

  return (
    <AdminClient
      users={users}
      tanks={tanks}
      products={products}
    />
  )
}
