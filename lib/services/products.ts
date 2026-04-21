import type { SupabaseClient } from '@supabase/supabase-js'
import type { Product } from '@/lib/types'

export async function getActiveProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw new Error(`Error al obtener productos: ${error.message}`)
  return data ?? []
}

export async function getAllProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')

  if (error) throw new Error(`Error al obtener productos: ${error.message}`)
  return data ?? []
}

export async function createProduct(
  supabase: SupabaseClient,
  product: Omit<Product, 'id' | 'created_at'>
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()

  if (error) throw new Error(`Error al crear producto: ${error.message}`)
  return data
}

export async function updateProduct(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Omit<Product, 'id' | 'created_at'>>
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Error al actualizar producto: ${error.message}`)
  return data
}

export async function deleteProduct(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw new Error(`Error al eliminar producto: ${error.message}`)
}
