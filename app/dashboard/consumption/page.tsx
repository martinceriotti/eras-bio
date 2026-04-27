'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarIcon, Loader2, AlertCircle, FlaskConical, Fuel } from 'lucide-react'
import { format, eachDayOfInterval, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatNumber, litersToKg, kgToTn, formatDate, type MaterialType } from '@/lib/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DailyData {
  date: string
  // Refinado
  aceite_crudo_consumido_kg: number
  aceite_neutro_producido_kg: number
  merma: number | null                  // %
  soda_kg: number
  acido_fosforico_kg: number
  ce_soda: number | null                // kg / Tn AN
  ce_acido_fosforico: number | null     // kg / Tn AN
  // Biodiesel
  biodiesel_kg: number
  metanol_kg: number
  acido_citrico_kg: number
  acido_clorhidrico_kg: number
  metilato_kg: number
  antioxidante_kg: number
  ce_metanol: number | null             // kg / Tn biodiesel
  ce_acido_citrico: number | null
  ce_acido_clorhidrico: number | null
  ce_metilato: number | null
  ce_antioxidante: number | null
  // General
  glp_kg: number
  ce_glp: number | null                 // kg / Tn biodiesel
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ConsumptionPage() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [dailyData, setDailyData]         = useState<DailyData[]>([])
  const [isLoading, setIsLoading]         = useState(true)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    const startDate = startOfMonth(selectedMonth)
    const endDate   = endOfMonth(selectedMonth)
    const days      = eachDayOfInterval({ start: startDate, end: endDate })

    const [
      { data: stockReadings },
      { data: weighings },
      { data: flowmeterReadings },
    ] = await Promise.all([
      supabase
        .from('stock_readings')
        .select('*, tank:tanks(*)')
        .gte('reading_date', format(subDays(startDate, 1), 'yyyy-MM-dd'))
        .lte('reading_date', format(endDate, 'yyyy-MM-dd')),
      supabase
        .from('weighings')
        .select('*, product:products(*)')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd')),
      supabase
        .from('flowmeter_readings')
        .select('*')
        .gte('reading_date', format(subDays(startDate, 40), 'yyyy-MM-dd'))
        .lte('reading_date', format(endDate, 'yyyy-MM-dd'))
        .order('reading_date', { ascending: true }),
    ])

    // ── helpers ──────────────────────────────────────────────────────────────

    /** Suma stocks de un material en kg, manejando density=null */
    const materialKg = (readings: NonNullable<typeof stockReadings>, material: MaterialType) =>
      readings
        .filter(r => r.tank?.material_type === material)
        .reduce((acc, r) => {
          const tank = r.tank
          let kg: number
          if (r.value_kg != null && r.value_kg > 0) {
            kg = r.value_kg
          } else if (tank?.density) {
            kg = litersToKg(r.value, tank.density)
          } else {
            kg = r.value ?? 0
          }
          return acc + kg
        }, 0)

    /** Suma peso_net de pesadas filtradas por tipo y fragmento de nombre */
    const weighKg = (
      wList: NonNullable<typeof weighings>,
      type: 'recepcion' | 'despacho',
      ...hints: string[]
    ) =>
      wList
        .filter(w =>
          w.type === type &&
          hints.some(h => w.product?.name?.toLowerCase().includes(h))
        )
        .reduce((acc, w) => acc + w.weight_net * 1000, 0)

    /** Consumo = Stock Inicial − Stock Final + Ingresos − Despachos */
    const consumed = (ini: number, fin: number, ingresos: number, despachos = 0) =>
      ini - fin + ingresos - despachos

    // ── procesar cada día ─────────────────────────────────────────────────────

    const result: DailyData[] = []

    for (let i = 0; i < days.length; i++) {
      const dateStr     = format(days[i],                               'yyyy-MM-dd')
      const prevDateStr = format(i > 0 ? days[i - 1] : subDays(days[i], 1), 'yyyy-MM-dd')

      const cur  = stockReadings?.filter(r => r.reading_date === dateStr)     ?? []
      const prev = stockReadings?.filter(r => r.reading_date === prevDateStr) ?? []
      const dw   = weighings?.filter(w => w.date === dateStr)                 ?? []

      // ── Caudalímetro ─────────────────────────────────────────────────────
      const curFlow  = flowmeterReadings?.find(f => f.reading_date === dateStr)
      const prevFlow = flowmeterReadings?.filter(f => f.reading_date < dateStr).at(-1)
      const caudalTn = curFlow && prevFlow
        ? Math.max(0, curFlow.accumulated_value - prevFlow.accumulated_value)
        : 0

      // ── Aceite crudo consumido ────────────────────────────────────────────
      const acIni = materialKg(prev, 'aceite_crudo')
      const acFin = materialKg(cur,  'aceite_crudo')
      const acIngr = weighKg(dw, 'recepcion', 'crudo')
      const acDesp = weighKg(dw, 'despacho',  'crudo')
      const aceiteCrudoConsumidoKg = consumed(acIni, acFin, acIngr, acDesp)

      // ── Aceite neutro producido ───────────────────────────────────────────
      const anIni  = materialKg(prev, 'aceite_neutro')
      const anFin  = materialKg(cur,  'aceite_neutro')
      const anIngr = weighKg(dw, 'recepcion', 'neutro')
      const anDesp = weighKg(dw, 'despacho',  'neutro')
      const aceiteNeutroProducidoKg = (anFin - anIni) + anDesp - anIngr + caudalTn * 1000

      // Merma proceso refinado
      const merma = aceiteCrudoConsumidoKg > 0
        ? (1 - aceiteNeutroProducidoKg / aceiteCrudoConsumidoKg) * 100
        : null

      // Aceite neutro producido en Tn (base para consumos específicos de refinado)
      const anTn = kgToTn(aceiteNeutroProducidoKg)

      // ── Insumos Planta Refinado ───────────────────────────────────────────
      const sodaIni  = materialKg(prev, 'soda')
      const sodaFin  = materialKg(cur,  'soda')
      const sodaIngr = weighKg(dw, 'recepcion', 'soda')
      const sodaKg   = Math.max(0, consumed(sodaIni, sodaFin, sodaIngr))

      const afIni  = materialKg(prev, 'acido_fosforico')
      const afFin  = materialKg(cur,  'acido_fosforico')
      const afIngr = weighKg(dw, 'recepcion', 'fosfórico', 'fosforico')
      const afKg   = Math.max(0, consumed(afIni, afFin, afIngr))

      // ── Biodiesel producido ───────────────────────────────────────────────
      const bioIni  = materialKg(prev, 'biodiesel')
      const bioFin  = materialKg(cur,  'biodiesel')
      const bioDesp = weighKg(dw, 'despacho',  'biodiesel')
      const bioIngr = weighKg(dw, 'recepcion', 'biodiesel')
      const biodieselKg = Math.max(0, (bioFin - bioIni) + bioDesp - bioIngr)
      const bioTn = kgToTn(biodieselKg)

      // ── Insumos Planta Biodiesel ──────────────────────────────────────────
      const metIni  = materialKg(prev, 'metanol')
      const metFin  = materialKg(cur,  'metanol')
      const metIngr = weighKg(dw, 'recepcion', 'metanol')
      const metKg   = Math.max(0, consumed(metIni, metFin, metIngr))

      const acitIni  = materialKg(prev, 'acido_citrico')
      const acitFin  = materialKg(cur,  'acido_citrico')
      const acitIngr = weighKg(dw, 'recepcion', 'cítrico', 'citrico')
      const acitKg   = Math.max(0, consumed(acitIni, acitFin, acitIngr))

      const aclIni  = materialKg(prev, 'acido_clorhidrico')
      const aclFin  = materialKg(cur,  'acido_clorhidrico')
      const aclIngr = weighKg(dw, 'recepcion', 'clorhídrico', 'clorhidrico')
      const aclKg   = Math.max(0, consumed(aclIni, aclFin, aclIngr))

      const metilIni  = materialKg(prev, 'metilato')
      const metilFin  = materialKg(cur,  'metilato')
      const metilIngr = weighKg(dw, 'recepcion', 'metilato')
      const metilKg   = Math.max(0, consumed(metilIni, metilFin, metilIngr))

      const antIni  = materialKg(prev, 'antioxidante')
      const antFin  = materialKg(cur,  'antioxidante')
      const antIngr = weighKg(dw, 'recepcion', 'antioxidante')
      const antKg   = Math.max(0, consumed(antIni, antFin, antIngr))

      // ── GLP (general) ─────────────────────────────────────────────────────
      const glpIni  = materialKg(prev, 'glp')
      const glpFin  = materialKg(cur,  'glp')
      const glpIngr = weighKg(dw, 'recepcion', 'glp')
      const glpKg   = Math.max(0, consumed(glpIni, glpFin, glpIngr))

      // ── Consumos específicos ───────────────────────────────────────────────
      const ce = (kg: number, base: number) => base > 0 ? kg / base : null

      result.push({
        date: dateStr,
        // Refinado
        aceite_crudo_consumido_kg:  aceiteCrudoConsumidoKg,
        aceite_neutro_producido_kg: aceiteNeutroProducidoKg,
        merma,
        soda_kg:           sodaKg,
        acido_fosforico_kg: afKg,
        ce_soda:            ce(sodaKg, anTn),
        ce_acido_fosforico: ce(afKg,   anTn),
        // Biodiesel
        biodiesel_kg:         biodieselKg,
        metanol_kg:           metKg,
        acido_citrico_kg:     acitKg,
        acido_clorhidrico_kg: aclKg,
        metilato_kg:          metilKg,
        antioxidante_kg:      antKg,
        ce_metanol:           ce(metKg,   bioTn),
        ce_acido_citrico:     ce(acitKg,  bioTn),
        ce_acido_clorhidrico: ce(aclKg,   bioTn),
        ce_metilato:          ce(metilKg, bioTn),
        ce_antioxidante:      ce(antKg,   bioTn),
        // General
        glp_kg:  glpKg,
        ce_glp:  ce(glpKg, bioTn),
      })
    }

    setDailyData(result)
    setIsLoading(false)
  }, [selectedMonth, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Acumulados mensuales ───────────────────────────────────────────────────

  const refinadoDays  = dailyData.filter(d => d.aceite_neutro_producido_kg > 0)
  const biodieselDays = dailyData.filter(d => d.biodiesel_kg > 0)

  const accAN  = refinadoDays.reduce((s, d) => s + d.aceite_neutro_producido_kg, 0)
  const accBio = biodieselDays.reduce((s, d) => s + d.biodiesel_kg, 0)

  const accSoda  = refinadoDays.reduce((s, d) => s + d.soda_kg,            0)
  const accAF    = refinadoDays.reduce((s, d) => s + d.acido_fosforico_kg, 0)
  const accMerma = refinadoDays.length > 0
    ? refinadoDays.reduce((s, d) => s + (d.merma ?? 0), 0) / refinadoDays.length
    : null

  const accMetanol   = biodieselDays.reduce((s, d) => s + d.metanol_kg,           0)
  const accAcitrico  = biodieselDays.reduce((s, d) => s + d.acido_citrico_kg,     0)
  const accAclorh    = biodieselDays.reduce((s, d) => s + d.acido_clorhidrico_kg, 0)
  const accMetilato  = biodieselDays.reduce((s, d) => s + d.metilato_kg,          0)
  const accAntioxid  = biodieselDays.reduce((s, d) => s + d.antioxidante_kg,      0)
  const accGlp       = biodieselDays.reduce((s, d) => s + d.glp_kg,               0)

  const anTnAcc  = kgToTn(accAN)
  const bioTnAcc = kgToTn(accBio)

  const ceAcc = (kg: number, baseTn: number) =>
    baseTn > 0 ? formatNumber(kg / baseTn, 1) : '-'

  // ── helpers de celda ──────────────────────────────────────────────────────

  const ceCell = (val: number | null) =>
    val !== null ? formatNumber(val, 1) : '-'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consumos Específicos</h1>
          <p className="text-muted-foreground">Insumos por tonelada producida — refinado y biodiesel</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedMonth, 'MMMM yyyy', { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedMonth}
              onSelect={(d) => d && setSelectedMonth(d)}
              disabled={(d) => d > new Date()}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="refinado">
          <TabsList className="mb-6">
            <TabsTrigger value="refinado" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Planta Refinado
            </TabsTrigger>
            <TabsTrigger value="biodiesel" className="gap-2">
              <Fuel className="h-4 w-4" />
              Planta Biodiesel
            </TabsTrigger>
            <TabsTrigger value="general">
              General
            </TabsTrigger>
          </TabsList>

          {/* ══ TAB REFINADO ══════════════════════════════════════════════════ */}
          <TabsContent value="refinado" className="space-y-6">

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Merma Proceso (promedio)
                  </CardTitle>
                  <CardDescription>Acumulado mensual</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {accMerma !== null ? formatNumber(accMerma, 2) + ' %' : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    (1 − AN producido / AC consumido) × 100
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Soda
                  </CardTitle>
                  <CardDescription>Acumulado mensual kg / Tn AN</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ceAcc(accSoda, anTnAcc)} kg/Tn</div>
                  <p className="text-xs text-muted-foreground">{formatNumber(accSoda, 0)} kg totales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ácido Fosfórico
                  </CardTitle>
                  <CardDescription>Acumulado mensual kg / Tn AN</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ceAcc(accAF, anTnAcc)} kg/Tn</div>
                  <p className="text-xs text-muted-foreground">{formatNumber(accAF, 0)} kg totales</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle Diario — Refinado</CardTitle>
                <CardDescription>
                  Merma = (1 − AN producido / AC consumido) × 100 — Consumos en kg / Tn AN producido
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">AC Consumido (Tn)</TableHead>
                        <TableHead className="text-right">AN Producido (Tn)</TableHead>
                        <TableHead className="text-right">Merma (%)</TableHead>
                        <TableHead className="text-right">Soda (kg/Tn)</TableHead>
                        <TableHead className="text-right">Ác. Fosfórico (kg/Tn)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refinadoDays.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                            <AlertCircle className="mx-auto mb-2 h-5 w-5" />
                            No hay datos de refinado para este mes
                          </TableCell>
                        </TableRow>
                      ) : refinadoDays.map(d => (
                        <TableRow key={d.date}>
                          <TableCell>{formatDate(d.date)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(kgToTn(d.aceite_crudo_consumido_kg))}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(kgToTn(d.aceite_neutro_producido_kg))}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {d.merma !== null ? formatNumber(d.merma, 2) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">{ceCell(d.ce_soda)}</TableCell>
                          <TableCell className="text-right font-mono">{ceCell(d.ce_acido_fosforico)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ TAB BIODIESEL ═════════════════════════════════════════════════ */}
          <TabsContent value="biodiesel" className="space-y-6">

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Metanol',              kg: accMetanol,  unit: bioTnAcc },
                { label: 'Ácido Cítrico',        kg: accAcitrico, unit: bioTnAcc },
                { label: 'Ácido Clorhídrico',    kg: accAclorh,   unit: bioTnAcc },
                { label: 'Metilato de Sodio',    kg: accMetilato, unit: bioTnAcc },
                { label: 'Antioxidante',         kg: accAntioxid, unit: bioTnAcc },
              ].map(({ label, kg, unit }) => (
                <Card key={label}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                    <CardDescription>Acumulado mensual kg / Tn biodiesel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{ceAcc(kg, unit)} kg/Tn</div>
                    <p className="text-xs text-muted-foreground">{formatNumber(kg, 0)} kg totales</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Daily table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle Diario — Biodiesel</CardTitle>
                <CardDescription>Consumos en kg / Tn biodiesel producido</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Biodiesel (Tn)</TableHead>
                        <TableHead className="text-right">Metanol (kg/Tn)</TableHead>
                        <TableHead className="text-right">Ác. Cítrico (kg/Tn)</TableHead>
                        <TableHead className="text-right">Ác. Clorhídrico (kg/Tn)</TableHead>
                        <TableHead className="text-right">Metilato (kg/Tn)</TableHead>
                        <TableHead className="text-right">Antioxidante (kg/Tn)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {biodieselDays.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                            <AlertCircle className="mx-auto mb-2 h-5 w-5" />
                            No hay datos de biodiesel para este mes
                          </TableCell>
                        </TableRow>
                      ) : biodieselDays.map(d => (
                        <TableRow key={d.date}>
                          <TableCell>{formatDate(d.date)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(kgToTn(d.biodiesel_kg))}
                          </TableCell>
                          <TableCell className="text-right font-mono">{ceCell(d.ce_metanol)}</TableCell>
                          <TableCell className="text-right font-mono">{ceCell(d.ce_acido_citrico)}</TableCell>
                          <TableCell className="text-right font-mono">{ceCell(d.ce_acido_clorhidrico)}</TableCell>
                          <TableCell className="text-right font-mono">{ceCell(d.ce_metilato)}</TableCell>
                          <TableCell className="text-right font-mono">{ceCell(d.ce_antioxidante)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══ TAB GENERAL ═══════════════════════════════════════════════════ */}
          <TabsContent value="general" className="space-y-6">

            {/* Summary card */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">GLP</CardTitle>
                  <CardDescription>Acumulado mensual kg / Tn biodiesel</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ceAcc(accGlp, bioTnAcc)} kg/Tn</div>
                  <p className="text-xs text-muted-foreground">{formatNumber(accGlp, 0)} kg totales</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalle Diario — GLP</CardTitle>
                <CardDescription>kg de GLP por Tn de biodiesel producido</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Biodiesel (Tn)</TableHead>
                        <TableHead className="text-right">GLP consumido (kg)</TableHead>
                        <TableHead className="text-right">GLP (kg/Tn)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {biodieselDays.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                            <AlertCircle className="mx-auto mb-2 h-5 w-5" />
                            No hay datos para este mes
                          </TableCell>
                        </TableRow>
                      ) : biodieselDays.map(d => (
                        <TableRow key={d.date}>
                          <TableCell>{formatDate(d.date)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(kgToTn(d.biodiesel_kg))}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(d.glp_kg, 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {ceCell(d.ce_glp)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
