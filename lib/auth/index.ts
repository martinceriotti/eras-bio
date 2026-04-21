/**
 * Helpers centralizados de autenticación y autorización (RBAC).
 *
 * Uso en Server Components / page.tsx:
 *
 *   const { user, profile } = await requireAuth(supabase)
 *   const { user, profile } = await requireRole(supabase, 'admin')
 */

import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/lib/types'

// -------------------------------------------------------
// Verificar sesión activa — redirige a /auth/login si no
// -------------------------------------------------------
export async function requireAuth(supabase: SupabaseClient) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/auth/login')
  }

  return { user, profile: profile as Profile }
}

// -------------------------------------------------------
// Verificar sesión + rol mínimo requerido
// Redirige a /dashboard si el rol no alcanza
// -------------------------------------------------------
export async function requireRole(supabase: SupabaseClient, role: UserRole) {
  const { user, profile } = await requireAuth(supabase)

  if (profile.role !== role) {
    redirect('/dashboard')
  }

  return { user, profile }
}

// -------------------------------------------------------
// Verificar si el usuario puede editar (operador o admin)
// -------------------------------------------------------
export function canEdit(profile: Profile): boolean {
  return profile.role === 'operador' || profile.role === 'admin'
}

export function isAdmin(profile: Profile): boolean {
  return profile.role === 'admin'
}
