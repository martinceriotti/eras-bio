import { describe, it, expect } from 'vitest'
import {
  litersToKg,
  kgToTn,
  calculateValueKg,
  formatNumber,
  formatDate,
  type Tank,
} from '../types'

// -------------------------------------------------------
// litersToKg
// -------------------------------------------------------
describe('litersToKg', () => {
  it('convierte litros a kg multiplicando por la densidad', () => {
    expect(litersToKg(1000, 0.88)).toBeCloseTo(880)
  })

  it('retorna 0 si los litros son 0', () => {
    expect(litersToKg(0, 0.88)).toBe(0)
  })

  it('maneja densidad 1 (agua)', () => {
    expect(litersToKg(500, 1)).toBe(500)
  })
})

// -------------------------------------------------------
// kgToTn
// -------------------------------------------------------
describe('kgToTn', () => {
  it('convierte kg a toneladas dividiendo por 1000', () => {
    expect(kgToTn(5000)).toBe(5)
  })

  it('retorna 0 si los kg son 0', () => {
    expect(kgToTn(0)).toBe(0)
  })

  it('maneja fracciones de tonelada', () => {
    expect(kgToTn(750)).toBe(0.75)
  })
})

// -------------------------------------------------------
// calculateValueKg
// -------------------------------------------------------
describe('calculateValueKg', () => {
  const baseTank: Tank = {
    id: 'test-id',
    code: 'T01',
    name: 'Tanque Test',
    capacity_liters: 10000,
    material_type: 'biodiesel',
    density: 0.88,
    unit: 'liters',
    display_order: 1,
    is_active: true,
    created_at: '2024-01-01',
  }

  it('convierte litros a kg para tanques de tipo liters', () => {
    const tank = { ...baseTank, unit: 'liters' as const }
    expect(calculateValueKg(tank, 1000)).toBeCloseTo(880)
  })

  it('convierte bolsas a kg usando la misma densidad', () => {
    const tank = { ...baseTank, unit: 'bags' as const }
    // bags usa litersToKg internamente (conversión específica del negocio)
    expect(calculateValueKg(tank, 100)).toBeCloseTo(88)
  })

  it('retorna el valor directo para porcentaje (sin conversión)', () => {
    const tank = { ...baseTank, unit: 'percentage' as const }
    expect(calculateValueKg(tank, 75)).toBe(75)
  })

  it('calcula correctamente para GLP (capacidad × porcentaje × densidad / 100000)', () => {
    const glpTank: Tank = {
      ...baseTank,
      material_type: 'glp',
      unit: 'percentage',
      capacity_liters: 10000,
      density: 0.55,
    }
    // Formula: capacity_liters * value * density / 100000
    // 10000 * 50 * 0.55 / 100000 = 2.75
    expect(calculateValueKg(glpTank, 50)).toBeCloseTo(2.75)
  })

  it('GLP con capacity_liters null retorna 0', () => {
    const glpTank: Tank = {
      ...baseTank,
      material_type: 'glp',
      unit: 'percentage',
      capacity_liters: null,
      density: 0.55,
    }
    expect(calculateValueKg(glpTank, 50)).toBe(0)
  })
})

// -------------------------------------------------------
// formatNumber
// -------------------------------------------------------
describe('formatNumber', () => {
  it('formatea con 2 decimales por defecto', () => {
    expect(formatNumber(1234.567)).toBe('1.234,57') // locale es-AR
  })

  it('respeta el parámetro de decimales', () => {
    expect(formatNumber(1000, 0)).toBe('1.000')
  })

  it('formatea 0 correctamente', () => {
    expect(formatNumber(0)).toBe('0,00')
  })
})

// -------------------------------------------------------
// formatDate
// -------------------------------------------------------
describe('formatDate', () => {
  it('convierte formato ISO a DD/MM/YYYY', () => {
    expect(formatDate('2024-03-15')).toBe('15/03/2024')
  })

  it('también acepta strings con sufijo T (datetime)', () => {
    expect(formatDate('2024-03-15T00:00:00.000Z')).toBe('15/03/2024')
  })

  it('evita el problema de UTC offset que resta un día', () => {
    // Sin el parseo manual, new Date('2024-03-15') en UTC-3 daría 14/03/2024
    expect(formatDate('2024-03-15')).toBe('15/03/2024')
  })
})
