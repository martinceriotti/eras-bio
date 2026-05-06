'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Loader2, Factory, AlertCircle, Download } from 'lucide-react'
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  formatNumber,
  formatDate,
  type MaterialType,
  MATERIAL_LABELS,
  litersToKg,
  kgToTn
} from '@/lib/types'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts'

interface DailyProductionData {
  date: string
  // Biodiesel
  biodiesel_stock_inicial: number
  biodiesel_stock_final: number
  biodiesel_despachos: number
  biodiesel_ingresos: number
  biodiesel_producido: number
  // Aceite Neutro
  aceite_neutro_stock_inicial: number
  aceite_neutro_stock_final: number
  aceite_neutro_despachos: number
  aceite_neutro_ingresos: number
  caudalimetro_consumo: number
  aceite_neutro_producido: number
  // Gomas
  gomas_stock_inicial: number
  gomas_stock_final: number
  gomas_despachos: number
  gomas_producida: number
  // Otros
  metanol_consumido: number
  glicerina_producida: number
  isComplete: boolean
  hasCaudalimetro: boolean
}

export default function ProductionPage() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [productionData, setProductionData] = useState<DailyProductionData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const fetchProductionData = useCallback(async () => {
    setIsLoading(true)

    const startDate = startOfMonth(selectedMonth)
    const endDate = endOfMonth(selectedMonth)
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    // Fetch all stock readings for the month (+ previous day for first day)
    const [
      { data: stockReadings },
      { data: weighings },
      { data: tanks },
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
        .from('tanks')
        .select('*')
        .eq('is_active', true),
      supabase
        .from('flowmeter_readings')
        .select('*')
        // Extendemos 40 días hacia atrás para encontrar la lectura previa
        // aunque no haya habido lecturas en días consecutivos
        .gte('reading_date', format(subDays(startDate, 40), 'yyyy-MM-dd'))
        .lte('reading_date', format(endDate, 'yyyy-MM-dd'))
        .order('reading_date', { ascending: true }),
    ])

    // Process data for each day
    const dailyData: DailyProductionData[] = []

    for (let i = 0; i < days.length; i++) {
      const currentDate = days[i]
      const previousDate = i > 0 ? days[i - 1] : subDays(currentDate, 1)
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const prevDateStr = format(previousDate, 'yyyy-MM-dd')

      // Get readings for current and previous day
      const currentReadings = stockReadings?.filter(r => r.reading_date === dateStr) || []
      const previousReadings = stockReadings?.filter(r => r.reading_date === prevDateStr) || []

      // Helper: sum material stocks in kg for a set of readings
      const calculateMaterialTotal = (readings: typeof currentReadings, material: MaterialType) => {
        return readings
          .filter(r => r.tank?.material_type === material)
          .reduce((acc, r) => {
            const tank = r.tank
            let valueKg: number
            if (r.value_kg != null && r.value_kg > 0) {
              // value_kg guardado correctamente
              valueKg = r.value_kg
            } else if (tank && tank.density) {
              // calcular desde value + density
              valueKg = litersToKg(r.value, tank.density)
            } else {
              // density no configurada: asumir que value ya está en kg
              valueKg = r.value ?? 0
            }
            return acc + valueKg
          }, 0)
      }

      // ── Biodiesel ──────────────────────────────────────────────
      const biodieselFinal = calculateMaterialTotal(currentReadings, 'biodiesel')
      const biodieselInicial = calculateMaterialTotal(previousReadings, 'biodiesel')

      // ── Aceite Neutro ──────────────────────────────────────────
      const aceiteNeutroFinal = calculateMaterialTotal(currentReadings, 'aceite_neutro')
      const aceiteNeutroInicial = calculateMaterialTotal(previousReadings, 'aceite_neutro')

      // ── Gomas ─────────────────────────────────────────────────
      const gomasFinal = calculateMaterialTotal(currentReadings, 'gomas')
      const gomasInicial = calculateMaterialTotal(previousReadings, 'gomas')

      // ── Metanol / Glicerina ────────────────────────────────────
      const metanolFinal = calculateMaterialTotal(currentReadings, 'metanol')
      const metanolInicial = calculateMaterialTotal(previousReadings, 'metanol')
      const glicerinaFinal = calculateMaterialTotal(currentReadings, 'glicerina')
      const glicerinaInicial = calculateMaterialTotal(previousReadings, 'glicerina')

      // ── Weighings del día ──────────────────────────────────────
      const dayWeighings = weighings?.filter(w => w.date === dateStr) || []

      const filterWeighings = (type: 'recepcion' | 'despacho', nameHint: string) =>
        dayWeighings
          .filter(w => w.type === type && w.product?.name?.toLowerCase().includes(nameHint))
          .reduce((acc, w) => acc + (w.weight_net * 1000), 0) // → kg

      // Biodiesel
      const biodieselDespachos = filterWeighings('despacho', 'biodiesel')
      const biodieselIngresos  = filterWeighings('recepcion', 'biodiesel')

      // Aceite Neutro (despachos e ingresos)
      const aceiteNeutroDespachos = filterWeighings('despacho', 'neutro')
      const aceiteNeutroIngresos  = filterWeighings('recepcion', 'neutro')

      // Gomas: buscar por 'goma' O 'borra' en el nombre del producto
      const gomasDespachos = dayWeighings
        .filter(w => w.type === 'despacho' && (
          w.product?.name?.toLowerCase().includes('goma') ||
          w.product?.name?.toLowerCase().includes('borra')
        ))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)

      // Metanol / Glicerina
      const metanolIngresos      = filterWeighings('recepcion', 'metanol')
      const glicerinaDespachos   = filterWeighings('despacho', 'glicerina')

      // ── Caudalímetro ──────────────────────────────────────────
      // Solo se calcula si existe lectura para este día.
      // La lectura previa es la más reciente disponible ANTES de esta fecha
      // (no necesariamente el día calendario anterior).
      const currentFlowmeter = flowmeterReadings?.find(f => f.reading_date === dateStr)
      const prevFlowmeter = flowmeterReadings
        ?.filter(f => f.reading_date < dateStr)
        .at(-1) // el array ya viene ordenado ASC, el último es el más reciente
      // accumulated_value está en Tn
      const caudalimetroConsumo = (currentFlowmeter && prevFlowmeter)
        ? Math.max(0, currentFlowmeter.accumulated_value - prevFlowmeter.accumulated_value)
        : 0

      // ── Producciones / Consumos ────────────────────────────────
      // Biodiesel: Stock Final – Stock Inicial + Despachos – Ingresos
      const biodieselProducido = biodieselFinal - biodieselInicial + biodieselDespachos - biodieselIngresos

      // Aceite Neutro Producido: Stock Final – Stock Inicial + Despachos – Ingresos + Consumo Caudalímetro
      // (todos los stocks están en kg → convertir a Tn; caudalímetro ya está en Tn)
      const aceiteNeutroProducido =
        kgToTn(aceiteNeutroFinal - aceiteNeutroInicial + aceiteNeutroDespachos - aceiteNeutroIngresos)
        + caudalimetroConsumo

      // Gomas Producidas: Stock Final – Stock Inicial + Despachos
      const gomasProducida = kgToTn(gomasFinal - gomasInicial + gomasDespachos)

      // Metanol consumido: Stock Inicial – Stock Final + Ingresos
      const metanolConsumido = metanolInicial - metanolFinal + metanolIngresos

      // Glicerina producida: Stock Final – Stock Inicial + Despachos
      const glicerinaProducida = glicerinaFinal - glicerinaInicial + glicerinaDespachos

      // ── Completitud ───────────────────────────────────────────
      const isComplete = currentReadings.length > 0 && (i === 0 || previousReadings.length > 0)
      const hasCaudalimetro = !!currentFlowmeter

      dailyData.push({
        date: dateStr,
        biodiesel_stock_inicial: kgToTn(biodieselInicial),
        biodiesel_stock_final:   kgToTn(biodieselFinal),
        biodiesel_despachos:     kgToTn(biodieselDespachos),
        biodiesel_ingresos:      kgToTn(biodieselIngresos),
        biodiesel_producido:     Math.max(0, kgToTn(biodieselProducido)),
        aceite_neutro_stock_inicial: kgToTn(aceiteNeutroInicial),
        aceite_neutro_stock_final:   kgToTn(aceiteNeutroFinal),
        aceite_neutro_despachos:     kgToTn(aceiteNeutroDespachos),
        aceite_neutro_ingresos:      kgToTn(aceiteNeutroIngresos),
        caudalimetro_consumo:        caudalimetroConsumo,
        aceite_neutro_producido:     aceiteNeutroProducido,
        gomas_stock_inicial: kgToTn(gomasInicial),
        gomas_stock_final:   kgToTn(gomasFinal),
        gomas_despachos:     kgToTn(gomasDespachos),
        gomas_producida:     gomasProducida,
        metanol_consumido:   Math.max(0, kgToTn(metanolConsumido)),
        glicerina_producida: Math.max(0, kgToTn(glicerinaProducida)),
        isComplete,
        hasCaudalimetro,
      })
    }

    setProductionData(dailyData)
    setIsLoading(false)
  }, [selectedMonth, supabase])

  useEffect(() => {
    fetchProductionData()
  }, [fetchProductionData])

  const SEP = ';'
  const n = (v: number) => v.toFixed(2).replace('.', ',')

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  const exportBiodieselCSV = () => {
    if (biodieselRows.length === 0) return
    const header = ['Fecha','Stock Ini (Tn)','Stock Fin (Tn)','Despachos (Tn)','Ingresos (Tn)','Biodiesel Prod (Tn)','Estado'].join(SEP)
    const rows = biodieselRows.map(d => [
      formatDate(d.date), n(d.biodiesel_stock_inicial), n(d.biodiesel_stock_final),
      n(d.biodiesel_despachos), n(d.biodiesel_ingresos), n(d.biodiesel_producido),
      d.isComplete ? 'Completo' : 'Incompleto',
    ].join(SEP))
    downloadCSV(header + '\n' + rows.join('\n'), `biodiesel_${format(selectedMonth, 'yyyyMM')}.csv`)
  }

  const exportAceiteNeutroCSV = () => {
    if (aceiteNeutroRows.length === 0) return
    const header = ['Fecha','Stock Ini (Tn)','Stock Fin (Tn)','Despachos (Tn)','Ingresos (Tn)','Caudalimetro (Tn)','AN Producido (Tn)'].join(SEP)
    const rows = aceiteNeutroRows.map(d => [
      formatDate(d.date), n(d.aceite_neutro_stock_inicial), n(d.aceite_neutro_stock_final),
      n(d.aceite_neutro_despachos), n(d.aceite_neutro_ingresos),
      n(d.caudalimetro_consumo), n(d.aceite_neutro_producido),
    ].join(SEP))
    downloadCSV(header + '\n' + rows.join('\n'), `aceite_neutro_${format(selectedMonth, 'yyyyMM')}.csv`)
  }

  const exportGomasCSV = () => {
    if (gomasRows.length === 0) return
    const header = ['Fecha','Stock Ini (Tn)','Stock Fin (Tn)','Despachos (Tn)','Gomas Producidas (Tn)'].join(SEP)
    const rows = gomasRows.map(d => [
      formatDate(d.date), n(d.gomas_stock_inicial), n(d.gomas_stock_final),
      n(d.gomas_despachos), n(d.gomas_producida),
    ].join(SEP))
    downloadCSV(header + '\n' + rows.join('\n'), `gomas_${format(selectedMonth, 'yyyyMM')}.csv`)
  }

  // Monthly totals
  const monthlyTotals = productionData.reduce((acc, day) => {
    if (day.isComplete) {
      acc.biodiesel           += day.biodiesel_producido
      acc.aceiteNeutro        += day.aceite_neutro_producido
      acc.gomas               += day.gomas_producida
      acc.metanol             += day.metanol_consumido
      acc.glicerina           += day.glicerina_producida
      acc.completeDays++
    }
    return acc
  }, { biodiesel: 0, aceiteNeutro: 0, gomas: 0, metanol: 0, glicerina: 0, completeDays: 0 })

  // Chart data — solo días con stock completo Y lectura de caudalímetro
  const chartData = productionData
    .filter(d => d.isComplete && d.hasCaudalimetro)
    .map(d => ({
      date:         formatDate(d.date).slice(0, 5),
      biodiesel:    d.biodiesel_producido,
      glicerina:    d.glicerina_producida,
      aceite_neutro: d.aceite_neutro_producido,
    }))

  const chartConfig = {
    biodiesel:    { label: 'Biodiesel',     color: 'var(--chart-1)' },
    glicerina:    { label: 'Glicerina',     color: 'var(--chart-2)' },
    aceite_neutro: { label: 'Aceite Neutro', color: 'var(--chart-3)' },
  }

  // Filtros independientes por material
  const biodieselRows = productionData.filter(day =>
    day.biodiesel_stock_inicial > 0 ||
    day.biodiesel_stock_final > 0   ||
    day.biodiesel_despachos > 0     ||
    day.biodiesel_ingresos > 0
  )

  const aceiteNeutroRows = productionData.filter(day =>
    day.aceite_neutro_stock_inicial > 0 ||
    day.aceite_neutro_stock_final > 0   ||
    day.aceite_neutro_despachos > 0     ||
    day.aceite_neutro_ingresos > 0      ||
    day.caudalimetro_consumo > 0
  )

  const gomasRows = productionData.filter(day =>
    day.gomas_stock_inicial > 0 ||
    day.gomas_stock_final > 0   ||
    day.gomas_despachos > 0
  )

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Producción</h1>
          <p className="text-muted-foreground">
            Cálculo de producción diaria de biodiesel
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedMonth, "MMMM yyyy", { locale: es })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedMonth}
              onSelect={(date) => date && setSelectedMonth(date)}
              disabled={(date) => date > new Date()}
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
        <>
          {/* Summary Cards */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Biodiesel Producido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{formatNumber(monthlyTotals.biodiesel)} Tn</div>
                <p className="text-xs text-muted-foreground">{monthlyTotals.completeDays} días con datos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Aceite Neutro Producido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(monthlyTotals.aceiteNeutro)} Tn</div>
                <p className="text-xs text-muted-foreground">Incluye consumo caudalímetro</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Gomas Producidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(monthlyTotals.gomas)} Tn</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Metanol Consumido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(monthlyTotals.metanol)} Tn</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Glicerina Producida
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(monthlyTotals.glicerina)} Tn</div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Producción Diaria</CardTitle>
              <CardDescription>Biodiesel, Glicerina y Aceite Neutro producidos por día</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  No hay datos suficientes para mostrar el gráfico
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="biodiesel"
                        stackId="1"
                        stroke="var(--chart-1)"
                        fill="var(--chart-1)"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="glicerina"
                        stackId="2"
                        stroke="var(--chart-2)"
                        fill="var(--chart-2)"
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="aceite_neutro"
                        stackId="3"
                        stroke="var(--chart-3)"
                        fill="var(--chart-3)"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Biodiesel table */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Detalle Diario — Biodiesel</CardTitle>
                <CardDescription>
                  Producción = Stock Final − Stock Inicial + Despachos − Ingresos
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportBiodieselCSV} disabled={biodieselRows.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Stock Ini (Tn)</TableHead>
                      <TableHead className="text-right">Stock Fin (Tn)</TableHead>
                      <TableHead className="text-right">Despachos (Tn)</TableHead>
                      <TableHead className="text-right">Ingresos (Tn)</TableHead>
                      <TableHead className="text-right">Producción (Tn)</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {biodieselRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No hay datos para este mes
                        </TableCell>
                      </TableRow>
                    ) : biodieselRows.map((day) => (
                      <TableRow key={day.date} className={!day.isComplete ? 'opacity-50' : ''}>
                        <TableCell>{formatDate(day.date)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.biodiesel_stock_inicial)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.biodiesel_stock_final)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.biodiesel_despachos)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.biodiesel_ingresos)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold text-primary">
                          {formatNumber(day.biodiesel_producido)}
                        </TableCell>
                        <TableCell>
                          {day.isComplete
                            ? <Badge variant="default">Completo</Badge>
                            : <Badge variant="secondary">Incompleto</Badge>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {biodieselRows.length > 0 && (() => {
                    const tot = biodieselRows.filter(d => d.isComplete).reduce(
                      (a, d) => ({ desp: a.desp + d.biodiesel_despachos, ingr: a.ingr + d.biodiesel_ingresos, prod: a.prod + d.biodiesel_producido }),
                      { desp: 0, ingr: 0, prod: 0 }
                    )
                    return (
                      <TableFooter>
                        <TableRow className="font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(tot.desp)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(tot.ingr)}</TableCell>
                          <TableCell className="text-right font-mono text-primary">{formatNumber(tot.prod)}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableFooter>
                    )
                  })()}
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Aceite Neutro table */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Detalle Diario — Aceite Neutro</CardTitle>
                <CardDescription>
                  Producido = Stock Final − Stock Inicial + Despachos − Ingresos + Consumo Caudalímetro
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportAceiteNeutroCSV} disabled={aceiteNeutroRows.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Stock Ini (Tn)</TableHead>
                      <TableHead className="text-right">Stock Fin (Tn)</TableHead>
                      <TableHead className="text-right">Despachos (Tn)</TableHead>
                      <TableHead className="text-right">Ingresos (Tn)</TableHead>
                      <TableHead className="text-right">Caudalímetro (Tn)</TableHead>
                      <TableHead className="text-right">AN Producido (Tn)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aceiteNeutroRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No hay datos para este mes
                        </TableCell>
                      </TableRow>
                    ) : aceiteNeutroRows.map((day) => (
                      <TableRow key={day.date} className={!day.isComplete ? 'opacity-50' : ''}>
                        <TableCell>{formatDate(day.date)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.aceite_neutro_stock_inicial)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.aceite_neutro_stock_final)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.aceite_neutro_despachos)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.aceite_neutro_ingresos)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.caudalimetro_consumo)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatNumber(day.aceite_neutro_producido)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {aceiteNeutroRows.length > 0 && (() => {
                    const tot = aceiteNeutroRows.filter(d => d.isComplete).reduce(
                      (a, d) => ({ desp: a.desp + d.aceite_neutro_despachos, ingr: a.ingr + d.aceite_neutro_ingresos, caud: a.caud + d.caudalimetro_consumo, prod: a.prod + d.aceite_neutro_producido }),
                      { desp: 0, ingr: 0, caud: 0, prod: 0 }
                    )
                    return (
                      <TableFooter>
                        <TableRow className="font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(tot.desp)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(tot.ingr)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(tot.caud)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(tot.prod)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    )
                  })()}
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Gomas table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Detalle Diario — Gomas</CardTitle>
                <CardDescription>
                  Producidas = Stock Final − Stock Inicial + Despachos
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportGomasCSV} disabled={gomasRows.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Stock Ini (Tn)</TableHead>
                      <TableHead className="text-right">Stock Fin (Tn)</TableHead>
                      <TableHead className="text-right">Despachos (Tn)</TableHead>
                      <TableHead className="text-right">Gomas Producidas (Tn)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gomasRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          No hay datos para este mes
                        </TableCell>
                      </TableRow>
                    ) : gomasRows.map((day) => (
                      <TableRow key={day.date} className={!day.isComplete ? 'opacity-50' : ''}>
                        <TableCell>{formatDate(day.date)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.gomas_stock_inicial)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.gomas_stock_final)}</TableCell>
                        <TableCell className="text-right font-mono">{formatNumber(day.gomas_despachos)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatNumber(day.gomas_producida)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {gomasRows.length > 0 && (() => {
                    const tot = gomasRows.filter(d => d.isComplete).reduce(
                      (a, d) => ({ desp: a.desp + d.gomas_despachos, prod: a.prod + d.gomas_producida }),
                      { desp: 0, prod: 0 }
                    )
                    return (
                      <TableFooter>
                        <TableRow className="font-semibold">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(tot.desp)}</TableCell>
                          <TableCell className="text-right font-mono">{formatNumber(tot.prod)}</TableCell>
                        </TableRow>
                      </TableFooter>
                    )
                  })()}
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
                      