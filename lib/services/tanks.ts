import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tank } from '@/lib/types'

export async function getActiveTanks(supabase: SupabaseClient): Promise<Tank[]> {
  const { data, error } = await supabase
    .from('tanks')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  if (error) throw new Error(`Error al obtener tanques: ${error.message}`)
  return data ?? []
}

export async function getAllTanks(supabase: SupabaseClient): Promise<Tank[]> {
  const { data, error } = await supabase
    .from('tanks')
    .select('*')
    .order('display_order')

  if (error) throw new Error(`Error al obtener tanques: ${error.message}`)
  return data ?? []
}

export async function createTank(
  supabase: SupabaseClient,
  tank: Omit<Tank, 'id' | 'created_at'>
): Promise<Tank> {
  const { data, error } = await supabase
    .from('tanks')
    .insert(tank)
    .select()
    .single()

  if (error) throw new Error(`Error al crear tanque: ${error.message}`)
  return data
}

export async function updateTank(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<Tank, 'id' | 'created_at'>>
): Promise<Tank> {
  const { data, error } = await supabase
    .from('tanks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Error al actualizar tanque: ${error.message}`)
  return data
}

export async function deleteTank(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('tanks').delete().eq('id', id)
  if (error) throw new Error(`Error al eliminar tanque: ${error.message}`)
}
