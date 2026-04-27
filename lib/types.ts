// =====================================================
// Sistema de Control de Inventarios - Tipos TypeScript
// =====================================================

export type UserRole = 'operador' | 'general' | 'admin'

export type MaterialType =
  | 'aceite_crudo'
  | 'aceite_neutro'
  | 'biodiesel'
  | 'glicerina'
  | 'metanol'
  | 'soda'
  | 'acido_clorhidrico'
  | 'acido_fosforico'
  | 'metilato'
  | 'antioxidante'
  | 'acido_citrico'
  | 'gomas'
  | 'glp'
  | 'repro'
  | 'efluentes'
  | 'otros'

export type TankUnit = 'liters' | 'bags' | 'percentage'

export type WeighingType = 'recepcion' | 'despacho'

export type ProductCategory = 'recepcion' | 'despacho' | 'ambos'

export type ProductUnit = 'tn' | 'bags' | 'kg'

// =====================================================
// Interfaces de Base de Datos
// =====================================================

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Tank {
  id: string
  code: string
  name: string
  capacity_liters: number | null
  material_type: MaterialType
  density: number
  unit: TankUnit
  display_order: number
  is_active: boolean
  created_at: string
}

export interface StockReading {
  id: string
  tank_id: string
  reading_date: string
  value: number
  value_kg: number | null
  user_id: string
  created_at: string
  updated_at: string
}

/** StockReading con el tanque cargado (resultado de queries con join) */
export interface StockReadingWithTank extends StockReading {
  tank: Tank
}

export interface FlowmeterReading {
  id: string
  reading_date: string
  accumulated_value: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  category: ProductCategory
  unit: ProductUnit
  is_active: boolean
  created_at: string
}

export interface Weighing {
  id: string
  date: string
  type: WeighingType
  product_id: string
  company: string | null
  remito_number: string | null
  driver: string | null
  license_plate: string | null
  weight_gross: number | null
  weight_tare: number | null
  weight_net: number
  observations: string | null
  user_id: string
  created_at: string
  updated_at: string
}

/** Weighing con el producto cargado (resultado de queries con join) */
export interface WeighingWithProduct extends Weighing {
  product: Product
}

export interface DailyClosure {
  id: string
  date: string
  stocks_complete: boolean
  weighings_complete: boolean
  closed_by: string | null
  closed_at: string | null
  created_at: string
}

export interface Density {
  id: string
  material_type: string
  density_value: number
  description: string | null
  updated_by: string | null
  updated_at: string
}

// =====================================================
// Tipos para Cálculos de Producción
// =====================================================

export interface DailyStockSummary {
  date: string
  material_type: MaterialType
  total_liters: number
  total_kg: number
  total_tn: number
}

export interface ProductionCalculation {
  date: string
  biodiesel_produced_tn: number
  aceite_consumed_tn: number
  metanol_consumed_tn: number
  glicerina_produced_tn: number
  specific_consumption_aceite: number // kg aceite / tn biodiesel
  specific_consumption_metanol: number // kg metanol / tn biodiesel
}

export interface WeighingSummary {
  date: string
  type: WeighingType
  product_name: string
  total_weight_tn: number
  count: number
}

// =====================================================
// Utilidades de Formato
// =====================================================

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  aceite_crudo: 'Aceite Crudo',
  aceite_neutro: 'Aceite Neutro',
  biodiesel: 'Biodiesel',
  glicerina: 'Glicerina',
  metanol: 'Metanol',
  soda: 'Soda',
  acido_clorhidrico: 'Ácido Clorhídrico',
  acido_fosforico: 'Ácido Fosfórico',
  metilato: 'Metilato',
  antioxidante: 'Antioxidante',
  acido_citrico: 'Ácido Cítrico',
  gomas: 'Gomas',
  glp: 'GLP',
  repro: 'Repro',
  efluentes: 'Efluentes',
  otros: 'Otros',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  operador: 'Operador',
  general: 'Usuario General',
  admin: 'Administrador',
}

export const UNIT_LABELS: Record<TankUnit, string> = {
  liters: 'Litros',
  bags: 'Bolsas',
  percentage: '%',
}

// Función helper para convertir litros a kg
export function litersToKg(liters: number, density: number): number {
  return liters * density
}

// Función helper para convertir kg a toneladas
export function kgToTn(kg: number): number {
  return kg / 1000
}

// Función helper para calcular value_kg según el tipo de tanque
export function calculateValueKg(tank: Tank, value: number): number {
  if (tank.material_type === 'glp') {
    return (tank.capacity_liters || 0) * value * tank.density / 100000
  } else if (tank.unit === 'liters') {
    return litersToKg(value, tank.density)
  } else if (tank.unit === 'bags') {
    return litersToKg(value, tank.density)
  }
  return value
}

// Función helper para formatear números
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// Función helper para formatear fechas
// Parsea manualmente para evitar conversión UTC que resta un día en zonas UTC-X
export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('T')[0].split('-')
  return `${day}/${month}/${year}`
}
