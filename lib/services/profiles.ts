import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/lib/types'

export async function getProfileById(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data as Profile
}

export async function getAllProfiles(supabase: SupabaseClient): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Error al obtener usuarios: ${error.message}`)
  return (data ?? []) as Profile[]
}

export async function updateProfileRole(
  supabase: SupabaseClient,
  userId: string,
  role: UserRole
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(`Error al actualizar rol: ${error.message}`)
  return data as Profile
}
