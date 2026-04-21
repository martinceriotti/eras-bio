import type { SupabaseClient } from '@supabase/supabase-js'
import type { Weighing, WeighingWithProduct } from '@/lib/types'

export async function getWeighingsByDate(
  supabase: SupabaseClient,
  date: string
): Promise<WeighingWithProduct[]> {
  const { data, error } = await supabase
    .from('weighings')
    .select('*, product:products(*)')
    .eq('date', date)

  if (error) throw new Error(`Error al obtener pesadas: ${error.message}`)
  return (data ?? []) as WeighingWithProduct[]
}

export async function getWeighingsByDateRange(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<WeighingWithProduct[]> {
  const { data, error } = await supabase
    .from('weighings')
    .select('*, product:products(*)')
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) throw new Error(`Error al obtener pesadas: ${error.message}`)
  return (data ?? []) as WeighingWithProduct[]
}

export async function createWeighing(
  supabase: SupabaseClient,
  weighing: Omit<Weighing, 'id' | 'created_at' | 'updated_at' | 'product'>
): Promise<Weighing> {
  const { data, error } = await supabase
    .from('weighings')
    .insert(weighing)
    .select()
    .single()

  if (error) throw new Error(`Error al crear pesada: ${error.message}`)
  return data
}

export async function updateWeighing(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<Weighing, 'id' | 'created_at' | 'updated_at' | 'product'>>
): Promise<Weighing> {
  const { data, error } = await supabase
    .from('weighings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Error al actualizar pesada: ${error.message}`)
  return data
}

export async function deleteWeighing(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('weighings').delete().eq('id', id)
  if (error) throw new Error(`Error al eliminar pesada: ${error.message}`)
}
