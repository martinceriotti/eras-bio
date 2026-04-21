import type { SupabaseClient } from '@supabase/supabase-js'
import type { StockReading, StockReadingWithTank } from '@/lib/types'

export async function getStockReadingsByDate(
  supabase: SupabaseClient,
  date: string
): Promise<StockReading[]> {
  const { data, error } = await supabase
    .from('stock_readings')
    .select('*')
    .eq('reading_date', date)

  if (error) throw new Error(`Error al obtener lecturas de stock: ${error.message}`)
  return data ?? []
}

export async function getStockReadingsWithTankByDate(
  supabase: SupabaseClient,
  date: string
): Promise<StockReadingWithTank[]> {
  const { data, error } = await supabase
    .from('stock_readings')
    .select('*, tank:tanks(*)')
    .eq('reading_date', date)

  if (error) throw new Error(`Error al obtener lecturas de stock con tanques: ${error.message}`)
  return (data ?? []) as StockReadingWithTank[]
}

export async function getStockReadingsWithTankByDateRange(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<StockReadingWithTank[]> {
  const { data, error } = await supabase
    .from('stock_readings')
    .select('*, tank:tanks(*)')
    .gte('reading_date', startDate)
    .lte('reading_date', endDate)

  if (error) throw new Error(`Error al obtener lecturas de stock: ${error.message}`)
  return (data ?? []) as StockReadingWithTank[]
}

export async function upsertStockReading(
  supabase: SupabaseClient,
  reading: Omit<StockReading, 'id' | 'created_at' | 'updated_at'>
): Promise<StockReading> {
  const { data, error } = await supabase
    .from('stock_readings')
    .upsert(reading, { onConflict: 'tank_id,reading_date' })
    .select()
    .single()

  if (error) throw new Error(`Error al guardar lectura de stock: ${error.message}`)
  return data
}

export async function deleteStockReading(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('stock_readings').delete().eq('id', id)
  if (error) throw new Error(`Error al eliminar lectura de stock: ${error.message}`)
}
