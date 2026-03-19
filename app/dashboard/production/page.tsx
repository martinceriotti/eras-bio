'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CalendarIcon, Loader2, Factory, AlertCircle } from 'lucide-react'
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  formatNumber, 
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
  biodiesel_stock_inicial: number
  biodiesel_stock_final: number
  biodiesel_despachos: number
  biodiesel_ingresos: number
  biodiesel_producido: number
  aceite_consumido: number
  metanol_consumido: number
  glicerina_producida: number
  isComplete: boolean
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

    // Fetch all tanks
    const { data: tanks } = await supabase
      .from('tanks')
      .select('*')
      .eq('is_active', true)

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

      // Biodiesel stocks (in kg)
      const biodieselFinal = calculateMaterialTotal(currentReadings, 'biodiesel')
      const biodieselInicial = calculateMaterialTotal(previousReadings, 'biodiesel')

      // Aceite stocks
      const aceiteNeutroFinal = calculateMaterialTotal(currentReadings, 'aceite_neutro')
      const aceiteNeutroInicial = calculateMaterialTotal(previousReadings, 'aceite_neutro')
      const aceiteCrudoFinal = calculateMaterialTotal(currentReadings, 'aceite_crudo')
      const aceiteCrudoInicial = calculateMaterialTotal(previousReadings, 'aceite_crudo')

      // Metanol stocks
      const metanolFinal = calculateMaterialTotal(currentReadings, 'metanol')
      const metanolInicial = calculateMaterialTotal(previousReadings, 'metanol')

      // Glicerina stocks
      const glicerinaFinal = calculateMaterialTotal(currentReadings, 'glicerina')
      const glicerinaInicial = calculateMaterialTotal(previousReadings, 'glicerina')

      // Get weighings for the day
      const dayWeighings = weighings?.filter(w => w.date === dateStr) || []
      
      // Biodiesel dispatches (producto: Biodiesel B100)
      const biodieselDespachos = dayWeighings
        .filter(w => w.type === 'despacho' && w.product?.name?.toLowerCase().includes('biodiesel'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0) // Convert Tn to Kg

      // Biodiesel receptions (if any)
      const biodieselIngresos = dayWeighings
        .filter(w => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('biodiesel'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)

      // Aceite receptions
      const aceiteIngresos = dayWeighings
        .filter(w => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('aceite'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)

      // Metanol receptions
      const metanolIngresos = dayWeighings
        .filter(w => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('metanol'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)

      // Glicerina dispatches
      const glicerinaDespachos = dayWeighings
        .filter(w => w.type === 'despacho' && w.product?.name?.toLowerCase().includes('glicerina'))
        .reduce((acc, w) => acc + (w.weight_net * 1000), 0)

      // Calculate production using formula:
      // Producción = Stock Final - Stock Inicial + Despachos - Ingresos
      const biodieselProducido = biodieselFinal - biodieselInicial + biodieselDespachos - biodieselIngresos

      // Calculate consumption:
      // Consumo = Stock Inicial - Stock Final + Ingresos - Despachos (en caso de despachar aceite)
      const aceiteConsumido = (aceiteNeutroInicial + aceiteCrudoInicial) - (aceiteNeutroFinal + aceiteCrudoFinal) + aceiteIngresos
      const metanolConsumido = metanolInicial - metanolFinal + metanolIngresos

      // Glicerina produced
      const glicerinaProducida = glicerinaFinal - glicerinaInicial + glicerinaDespachos

      // Check if data is complete (has readings for both days)
      const isComplete = currentReadings.length > 0 && (i === 0 || previousReadings.length > 0)

      dailyData.push({
        date: dateStr,
        biodiesel_stock_inicial: kgToTn(biodieselInicial),
        biodiesel_stock_final: kgToTn(biodieselFinal),
        biodiesel_despachos: kgToTn(biodieselDespachos),
        biodiesel_ingresos: kgToTn(biodieselIngresos),
        biodiesel_producido: Math.max(0, kgToTn(biodieselProducido)),
        aceite_consumido: Math.max(0, kgToTn(aceiteConsumido)),
        metanol_consumido: Math.max(0, kgToTn(metanolConsumido)),
        glicerina_producida: Math.max(0, kgToTn(glicerinaProducida)),
        isComplete,
      })
    }

    setProductionData(dailyData)
    setIsLoading(false)
  }, [selectedMonth, supabase])

  useEffect(() => {
    fetchProductionData()
  }, [fetchProductionData])

  // Calculate monthly totals
  const monthlyTotals = productionData.reduce((acc, day) => {
    if (day.isComplete) {
      acc.biodiesel += day.biodiesel_producido
      acc.aceite += day.aceite_consumido
      acc.metanol += day.metanol_consumido
      acc.glicerina += day.glicerina_producida
      acc.completeDays++
    }
    return acc
  }, { biodiesel: 0, aceite: 0, metanol: 0, glicerina: 0, completeDays: 0 })

  // Prepare chart data
  const chartData = productionData
    .filter(d => d.isComplete)
    .map(d => ({
      date: format(new Date(d.date), 'dd/MM'),
      biodiesel: d.biodiesel_producido,
      glicerina: d.glicerina_producida,
    }))

  const chartConfig = {
    biodiesel: {
      label: "Biodiesel",
      color: "var(--chart-1)",
    },
    glicerina: {
      label: "Glicerina",
      color: "var(--chart-2)",
    },
  }

  return (
    <div className="p-6 lg:p-8">
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
          {/* Monthly Summary Cards */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  Aceite Consumido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(monthlyTotals.aceite)} Tn</div>
                <p className="text-xs text-muted-foreground">Aceite crudo + neutro</p>
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
              <CardDescription>Biodiesel y Glicerina producidos por día</CardDescription>
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
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Daily Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle Diario</CardTitle>
              <CardDescription>
                Fórmula: Producción = Stock Final - Stock Inicial + Despachos - Ingresos
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Stock Inicial</TableHead>
                      <TableHead className="text-right">Stock Final</TableHead>
                      <TableHead className="text-right">Despachos</TableHead>
                      <TableHead className="text-right">Ingresos</TableHead>
                      <TableHead className="text-right">Producción (Tn)</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionData.map((day) => (
                      <TableRow key={day.date} className={!day.isComplete ? 'opacity-50' : ''}>
                        <TableCell>{format(new Date(day.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(day.biodiesel_stock_inicial)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(day.biodiesel_stock_final)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(day.biodiesel_despachos)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(day.biodiesel_ingresos)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-primary">
                          {formatNumber(day.biodiesel_producido)}
                        </TableCell>
                        <TableCell>
                          {day.isComplete ? (
                            <Badge variant="default">Completo</Badge>
                          ) : (
                            <Badge variant="secondary">Incompleto</Badge>
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
