'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Loader2, TrendingUp, AlertCircle, Info } from 'lucide-react'
import { format, eachDayOfInterval, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatNumber, litersToKg, kgToTn, type MaterialType } from '@/lib/types'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

interface DailyConsumptionData {
  date: string
  biodiesel_producido_kg: number
  aceite_consumido_kg: number
  metanol_consumido_kg: number
  soda_consumida_kg: number
  acido_fosforico_consumido_kg: number
  consumo_especifico_aceite: number | null // kg aceite / Tn biodiesel
  consumo_especifico_metanol: number | null // kg metanol / Tn biodiesel
  consumo_especifico_soda: number | null
  consumo_especifico_acido: number | null
  isComplete: boolean
}

export default function ConsumptionPage() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())
  const [consumptionData, setConsumptionData] = useState<DailyConsumptionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const supabase = createClient()

  const fetchConsumptionData = useCallback(async () => {
    setIsLoading(true)
    
    const startDate = startOfMonth(selectedMonth)
    const endDate = endOfMonth(selectedMonth)
    const days = eachDayOfInterval({ start: startDate, end: endDate })

    // Fetch all stock readings for the month
    const { data: stockReadings } = await supabase
      .from('stock_readings')
      .select('*, tank:tanks(*)')
      .gte('reading_date', format(startDate, 'yyyy-MM-dd'))
      .lte('reading_date', format(endDate, 'yyyy-MM-dd'))

    // Fetch all weighings for the month
    const { data: weighings } = await supabase
      .from('weighings')
      .select('*, product:products(*)')
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))

    // Process data for each day
    const dailyData: DailyConsumptionData[] = []
    
    for (let i = 0; i < days.length; i++) {
      const currentDate = days[i]
      const previousDate = i > 0 ? days[i - 1] : subDays(currentDate, 1)
      const dateStr = format(currentDate, 'yyyy-MM-dd')
      const prevDateStr = format(previousDate, 'yyyy-MM-dd')

      // Get readings for current and previous day
      const currentReadings = stockReadings?.filter(r => r.reading_date === dateStr) || []
      const previousReadings = stockReadings?.filter(r => r.reading_date === prevDateStr) || []

      // Calculate totals by material
      const calculateMaterialTotal = (readings: typeof currentReadings, material: MaterialType) => {
        return readings
          .filter(r => r.tank?.material_type === material)
          .reduce((acc, r) => {
            const tank = r.tank
            const valueKg = r.value_kg || (tank ? litersToKg(r.value, tank.density) : r.value)
            return acc + valueKg
          }, 0)
      }

      // Get weighings for the day
      const dayWeighings = weighings?.filter(w => w.date === dateStr) || []

      // Calculate production (same formula as production page)
      const biodieselFinal = calculateMaterialTotal(currentReadings, 'biodiesel')
      const biodieselInicial = calculateMaterialTotal(previousReadings, 'biodiesel')
      const biodieselDespachos = dayWeighings
        .filter(w => w.type === 'despacho' && w.product?.name?.toLowerCase().includes('biodiesel'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)
      const biodieselIngresos = dayWeighings
        .filter(w => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('biodiesel'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)
      const biodieselProducidoKg = Math.max(0, biodieselFinal - biodieselInicial + biodieselDespachos - biodieselIngresos)

      // Calculate consumptions
      // Aceite (crudo + neutro)
      const aceiteInicial = calculateMaterialTotal(previousReadings, 'aceite_crudo') + 
                           calculateMaterialTotal(previousReadings, 'aceite_neutro')
      const aceiteFinal = calculateMaterialTotal(currentReadings, 'aceite_crudo') + 
                         calculateMaterialTotal(currentReadings, 'aceite_neutro')
      const aceiteIngresos = dayWeighings
        .filter(w => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('aceite'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)
      const aceiteConsumidoKg = Math.max(0, aceiteInicial - aceiteFinal + aceiteIngresos)

      // Metanol
      const metanolInicial = calculateMaterialTotal(previousReadings, 'metanol')
      const metanolFinal = calculateMaterialTotal(currentReadings, 'metanol')
      const metanolIngresos = dayWeighings
        .filter(w => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('metanol'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)
      const metanolConsumidoKg = Math.max(0, metanolInicial - metanolFinal + metanolIngresos)

      // Soda
      const sodaInicial = calculateMaterialTotal(previousReadings, 'soda')
      const sodaFinal = calculateMaterialTotal(currentReadings, 'soda')
      const sodaIngresos = dayWeighings
        .filter(w => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('soda'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)
      const sodaConsumidaKg = Math.max(0, sodaInicial - sodaFinal + sodaIngresos)

      // Ácido fosfórico
      const acidoInicial = calculateMaterialTotal(previousReadings, 'acido_fosforico')
      const acidoFinal = calculateMaterialTotal(currentReadings, 'acido_fosforico')
      const acidoIngresos = dayWeighings
        .filter(w => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('fosfórico'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)
      const acidoConsumidoKg = Math.max(0, acidoInicial - acidoFinal + acidoIngresos)

      // Calculate specific consumptions (kg consumed / Tn biodiesel produced)
      const biodieselProducidoTn = kgToTn(biodieselProducidoKg)
      
      const consumoEspecificoAceite = biodieselProducidoTn > 0 ? aceiteConsumidoKg / biodieselProducidoTn : null
      const consumoEspecificoMetanol = biodieselProducidoTn > 0 ? metanolConsumidoKg / biodieselProducidoTn : null
      const consumoEspecificoSoda = biodieselProducidoTn > 0 ? sodaConsumidaKg / biodieselProducidoTn : null
      const consumoEspecificoAcido = biodieselProducidoTn > 0 ? acidoConsumidoKg / biodieselProducidoTn : null

      // Check if data is complete
      const isComplete = currentReadings.length > 0 && (i === 0 || previousReadings.length > 0) && biodieselProducidoKg > 0

      dailyData.push({
        date: dateStr,
        biodiesel_producido_kg: biodieselProducidoKg,
        aceite_consumido_kg: aceiteConsumidoKg,
        metanol_consumido_kg: metanolConsumidoKg,
        soda_consumida_kg: sodaConsumidaKg,
        acido_fosforico_consumido_kg: acidoConsumidoKg,
        consumo_especifico_aceite: consumoEspecificoAceite,
        consumo_especifico_metanol: consumoEspecificoMetanol,
        consumo_especifico_soda: consumoEspecificoSoda,
        consumo_especifico_acido: consumoEspecificoAcido,
        isComplete,
      })
    }

    setConsumptionData(dailyData)
    setIsLoading(false)
  }, [selectedMonth, supabase])

  useEffect(() => {
    fetchConsumptionData()
  }, [fetchConsumptionData])

  // Calculate monthly averages
  const completeDays = consumptionData.filter(d => d.isComplete)
  
  const avgAceite = completeDays.length > 0 
    ? completeDays.reduce((acc, d) => acc + (d.consumo_especifico_aceite || 0), 0) / completeDays.length 
    : 0
  const avgMetanol = completeDays.length > 0 
    ? completeDays.reduce((acc, d) => acc + (d.consumo_especifico_metanol || 0), 0) / completeDays.length 
    : 0
  const avgSoda = completeDays.length > 0 
    ? completeDays.reduce((acc, d) => acc + (d.consumo_especifico_soda || 0), 0) / completeDays.length 
    : 0
  const avgAcido = completeDays.length > 0 
    ? completeDays.reduce((acc, d) => acc + (d.consumo_especifico_acido || 0), 0) / completeDays.length 
    : 0

  // Expected/target values (typical for biodiesel production)
  const expectedAceite = 1020 // kg aceite / Tn biodiesel
  const expectedMetanol = 110 // kg metanol / Tn biodiesel

  // Prepare chart data
  const chartData = completeDays.map(d => ({
    date: format(new Date(d.date), 'dd/MM'),
    aceite: d.consumo_especifico_aceite,
    metanol: d.consumo_especifico_metanol,
  }))

  const chartConfig = {
    aceite: {
      label: "Aceite (kg/Tn)",
      color: "var(--chart-1)",
    },
    metanol: {
      label: "Metanol (kg/Tn)",
      color: "var(--chart-3)",
    },
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Consumos Específicos</h1>
          <p className="text-muted-foreground">
            Kilogramos de insumo por tonelada de biodiesel producido
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

      {/* Info Banner */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 text-primary mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Fórmula de Consumo Específico</p>
            <p className="text-muted-foreground">
              Consumo Específico = Kg de Insumo Consumido / Toneladas de Biodiesel Producido
            </p>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Average Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Consumo Aceite
                </CardTitle>
                <CardDescription>Promedio mensual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(avgAceite, 1)} kg/Tn</div>
                <p className={`text-xs ${avgAceite <= expectedAceite ? 'text-primary' : 'text-destructive'}`}>
                  Esperado: ~{expectedAceite} kg/Tn
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Consumo Metanol
                </CardTitle>
                <CardDescription>Promedio mensual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(avgMetanol, 1)} kg/Tn</div>
                <p className={`text-xs ${avgMetanol <= expectedMetanol ? 'text-primary' : 'text-destructive'}`}>
                  Esperado: ~{expectedMetanol} kg/Tn
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Consumo Soda
                </CardTitle>
                <CardDescription>Promedio mensual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(avgSoda, 1)} kg/Tn</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Consumo Ác. Fosfórico
                </CardTitle>
                <CardDescription>Promedio mensual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(avgAcido, 1)} kg/Tn</div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Evolución de Consumos Específicos</CardTitle>
              <CardDescription>Aceite y Metanol (kg por Tn de biodiesel)</CardDescription>
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
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ReferenceLine y={expectedAceite} stroke="var(--chart-1)" strokeDasharray="5 5" />
                      <Line 
                        type="monotone" 
                        dataKey="aceite" 
                        stroke="var(--chart-1)" 
                        strokeWidth={2}
                        dot={{ fill: "var(--chart-1)" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="metanol" 
                        stroke="var(--chart-3)" 
                        strokeWidth={2}
                        dot={{ fill: "var(--chart-3)" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Daily Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle Diario de Consumos</CardTitle>
              <CardDescription>
                Valores en kilogramos de insumo por tonelada de biodiesel producido
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Biodiesel (Tn)</TableHead>
                      <TableHead className="text-right">Aceite (kg/Tn)</TableHead>
                      <TableHead className="text-right">Metanol (kg/Tn)</TableHead>
                      <TableHead className="text-right">Soda (kg/Tn)</TableHead>
                      <TableHead className="text-right">Ác. Fosf. (kg/Tn)</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumptionData.map((day) => (
                      <TableRow key={day.date} className={!day.isComplete ? 'opacity-50' : ''}>
                        <TableCell>{format(new Date(day.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(kgToTn(day.biodiesel_producido_kg))}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {day.consumo_especifico_aceite !== null 
                            ? formatNumber(day.consumo_especifico_aceite, 1) 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {day.consumo_especifico_metanol !== null 
                            ? formatNumber(day.consumo_especifico_metanol, 1) 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {day.consumo_especifico_soda !== null 
                            ? formatNumber(day.consumo_especifico_soda, 1) 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {day.consumo_especifico_acido !== null 
                            ? formatNumber(day.consumo_especifico_acido, 1) 
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {day.isComplete ? (
                            <Badge variant="default">Completo</Badge>
                          ) : (
                            <Badge variant="secondary">Sin producción</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
