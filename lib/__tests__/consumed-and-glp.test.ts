import { describe, it, expect } from 'vitest'
import {
  consumed,
  calculateValueKg,
  calculateValueTn,
  type Tank,
} from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Fixture de tanques reutilizables
// ─────────────────────────────────────────────────────────────────────────────

const glpTank: Tank = {
  id: 'glp-1',
  code: 'GLP-1',
  name: 'GLP Tanque 1',
  capacity_liters: 7600,
  material_type: 'glp',
  density: 0.51,
  unit: 'percentage',
  display_order: 1,
  is_active: true,
  created_at: '2024-01-01',
}

const sodaTank: Tank = {
  id: 'soda-1',
  code: 'TK-SODA',
  name: 'Soda Cáustica',
  capacity_liters: null,
  material_type: 'soda',
  density: 1.52,
  unit: 'liters',
  display_order: 10,
  is_active: true,
  created_at: '2024-01-01',
}

// ─────────────────────────────────────────────────────────────────────────────
// consumed()
// ─────────────────────────────────────────────────────────────────────────────

describe('consumed', () => {
  it('consumo normal: stock baja sin recepción', () => {
    // ini=1000, fin=800, ingresos=0 → consumió 200
    expect(consumed(1000, 800, 0)).toBe(200)
  })

  it('consumo con recepción: stock sube más que lo recibido', () => {
    // ini=1000, fin=1300, ingresos=500 → consumió 200
    expect(consumed(1000, 1300, 500)).toBe(200)
  })

  it('CASO SODA: lectura errónea alta sin recepción → negativo', () => {
    // ini=1000 Kg, fin=1020 Kg (leyeron de más), ingresos=0
    // ANTES: Math.max(0, ...) devolvía 0 → acumulado inflado
    // AHORA: devuelve -20 → acumulado se autocorrige
    expect(consumed(1000, 1020, 0)).toBe(-20)
  })

  it('el acumulado de días con negativos da el total correcto', () => {
    // Simulación 3 días: día 2 con lectura alta
    const dias = [
      consumed(1000, 800, 0),   // +200 (normal)
      consumed(800, 820, 0),    // -20  (lectura errónea)
      consumed(820, 600, 0),    // +220 (normal)
    ]
    // Acumulado real debe ser 400, no 420 como sería con Math.max
    expect(dias.reduce((a, b) => a + b, 0)).toBe(400)
  })

  it('consumo con despachos (aceite neutro)', () => {
    // ini=5000, fin=3000, ingresos=0, despachos=1000 → consumió 1000
    expect(consumed(5000, 3000, 0, 1000)).toBe(1000)
  })

  it('retorna 0 cuando no hubo movimiento', () => {
    expect(consumed(1000, 1000, 0)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calculateValueKg para GLP — fórmula corregida
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateValueKg — GLP (retorna Tn, no Kg)', () => {
  it('50% de tanque 7600L densidad 0.51 → 1.938 Tn', () => {
    // 7600 * 50 * 0.51 / 100 / 1000 = 1.938
    expect(calculateValueKg(glpTank, 50)).toBeCloseTo(1.938)
  })

  it('0% → 0 Tn', () => {
    expect(calculateValueKg(glpTank, 0)).toBe(0)
  })

  it('100% → 3.876 Tn (tanque lleno)', () => {
    // 7600 * 100 * 0.51 / 100 / 1000 = 3.876
    expect(calculateValueKg(glpTank, 100)).toBeCloseTo(3.876)
  })

  it('4 tanques al 70/80/85/30% → 10.27 Tn (caso real 05/05/2026)', () => {
    // Dato real: la UI mostraba 10.3 Tn ese día
    const pcts = [70, 80, 85, 30]
    const total = pcts.reduce((acc, pct) => acc + calculateValueKg(glpTank, pct), 0)
    expect(total).toBeCloseTo(10.27, 1)
  })

  it('4 tanques al 84/86/86/82% → 13.1 Tn (caso real 06/05/2026)', () => {
    const pcts = [84, 86, 86, 82]
    const total = pcts.reduce((acc, pct) => acc + calculateValueKg(glpTank, pct), 0)
    expect(total).toBeCloseTo(13.1, 1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calculateValueTn — siempre retorna Tn sin importar el tipo
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateValueTn', () => {
  it('GLP: resultado igual a calculateValueKg (ya estaba en Tn)', () => {
    expect(calculateValueTn(glpTank, 50)).toBeCloseTo(calculateValueKg(glpTank, 50))
  })

  it('liters: divide el resultado de calculateValueKg por 1000', () => {
    // 1000L * densidad 1.52 = 1520 Kg → / 1000 = 1.52 Tn
    expect(calculateValueTn(sodaTank, 1000)).toBeCloseTo(1.52)
  })

  it('resultado de liters es 1000x menor que calculateValueKg', () => {
    const kg = calculateValueKg(sodaTank, 5000)
    const tn = calculateValueTn(sodaTank, 5000)
    expect(tn).toBeCloseTo(kg / 1000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Caso integrado: consumo GLP día 06/05/2026
// ─────────────────────────────────────────────────────────────────────────────

describe('consumo GLP — caso real 06/05/2026', () => {
  it('con recepción 3.68 Tn el consumo debe ser ~0.84 Tn = 840 Kg', () => {
    // Datos reales:
    //   Stock día 5: GLP-1=70% GLP-2=80% GLP-3=85% GLP-4=30% → 10.27 Tn
    //   Stock día 6: GLP-1=84% GLP-2=86% GLP-3=86% GLP-4=82% → 13.10 Tn
    //   Recepción día 6: 3.680 Tn
    const ini = [70, 80, 85, 30].reduce((acc, pct) => acc + calculateValueKg(glpTank, pct), 0)
    const fin = [84, 86, 86, 82].reduce((acc, pct) => acc + calculateValueKg(glpTank, pct), 0)
    const ingresos = 3.680 // Tn

    const consumoTn = consumed(ini, fin, ingresos)
    const consumoKg = consumoTn * 1000

    // Resultado exacto: 850.52 Kg (la estimación de 840 usaba valores redondeados de la UI)
    expect(consumoTn).toBeCloseTo(0.85, 1)
    expect(consumoKg).toBeCloseTo(850.52, 1)
  })

  it('sin recepción registrada el consumo sería negativo (no se clampea a 0)', () => {
    const ini = [70, 80, 85, 30].reduce((acc, pct) => acc + calculateValueKg(glpTank, pct), 0)
    const fin = [84, 86, 86, 82].reduce((acc, pct) => acc + calculateValueKg(glpTank, pct), 0)

    const consumoTn = consumed(ini, fin, 0)
    // Stock subió → consumo negativo (no debería clampearse)
    expect(consumoTn).toBeLessThan(0)
  })
})
