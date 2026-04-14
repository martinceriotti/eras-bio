import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminClient } from './admin-client'

export default async function AdminPage() {
  const supabase = await createClient()

  // Check if user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Fetch all users
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch all tanks
  const { data: tanks } = await supabase
    .from('tanks')
    .select('*')
    .order('display_order')

  // Fetch all products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('name')

  return (
    <AdminClient 
      users={users || []} 
      tanks={tanks || []}
      products={products || []}
    />
  )
}
