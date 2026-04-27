'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon, Download, FileText, Filter, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatNumber, formatDate, calculateValueKg, kgToTn, litersToKg } from '@/lib/types'
import type { Product, Tank, WeighingWithProduct, StockReading, MaterialType, Company } from '@/lib/types'

interface ReportsClientProps {
  products: Product[]
  tanks: Tank[]
}

type ReportType = 'weighings' | 'stocks' | 'production' | 'company'

interface DailyProductionData {
  date: string
  biodiesel_producido: number
  biodiesel_despachos: number
  aceite_consumido: number
  metanol_consumido: number
  glicerina_producida: number
  isComplete: boolean
}

export function ReportsClient({ products, tanks }: ReportsClientProps) {
  const supabase = createClient()
  const [reportType, setReportType] = useState<ReportType>('weighings')
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()))
  const [dateTo, setDateTo] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [weighingsData, setWeighingsData] = useState<WeighingWithProduct[]>([])
  const [stocksData, setStocksData] = useState<(StockReading & { tank: Tank })[]>([])
  const [productionData, setProductionData] = useState<DailyProductionData[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [companyWeighingsData, setCompanyWeighingsData] = useState<WeighingWithProduct[]>([])

  useEffect(() => {
    supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setCompanies(data || []))
  }, [supabase])

  const handleGenerateReport = async () => {
    setLoading(true)
    const fromStr = format(dateFrom, 'yyyy-MM-dd')
    const toStr = format(dateTo, 'yyyy-MM-dd')

    try {
      if (reportType === 'weighings') {
        const { data } = await supabase
          .from('weighings')
          .select('*, product:products(*)')
          .gte('date', fromStr)
          .lte('date', toStr)
          .order('date', { ascending: false })

        setWeighingsData(data || [])
        setStocksData([])
      } else if (reportType === 'stocks') {
        const { data } = await supabase
          .from('stock_readings')
          .select('*, tank:tanks(*)')
          .gte('reading_date', fromStr)
          .lte('reading_date', toStr)
          .order('reading_date', { ascending: false })

        setStocksData(data || [])
        setWeighingsData([])
        setProductionData([])
      } else if (reportType === 'production') {
        // Fetch one day before dateFrom to calculate the first day's delta
        const prevDay = format(new Date(dateFrom.getTime() - 86400000), 'yyyy-MM-dd')

        const [{ data: stockReadings }, { data: weighings }, { data: allTanks }] = await Promise.all([
          supabase
            .from('stock_readings')
            .select('*, tank:tanks(*)')
            .gte('reading_date', prevDay)
            .lte('reading_date', toStr),
          supabase
            .from('weighings')
            .select('*, product:products(*)')
            .gte('date', fromStr)
            .lte('date', toStr),
          supabase
            .from('tanks')
            .select('*')
            .eq('is_active', true),
        ])

        const days = eachDayOfInterval({ start: dateFrom, end: dateTo })
        const dailyData: DailyProductionData[] = []

        const calcMaterial = (readings: typeof stockReadings, material: MaterialType) =>
          (readings || [])
            .filter((r: any) => r.tank?.material_type === material)
            .reduce((acc: number, r: any) => {
              const valueKg = r.value_kg || (r.tank ? litersToKg(r.value, r.tank.density) : r.value)
              return acc + valueKg
            }, 0)

        for (let i = 0; i < days.length; i++) {
          const dateStr = format(days[i], 'yyyy-MM-dd')
          const prevDateStr = i > 0
            ? format(days[i - 1], 'yyyy-MM-dd')
            : prevDay

          const curr = (stockReadings || []).filter((r: any) => r.reading_date === dateStr)
          const prev = (stockReadings || []).filter((r: any) => r.reading_date === prevDateStr)
          const dayW = (weighings || []).filter((w: any) => w.date === dateStr)

          const biodieselFinal = calcMaterial(curr, 'biodiesel')
          const biodieselInicial = calcMaterial(prev, 'biodiesel')
          const aceiteNeutroFinal = calcMaterial(curr, 'aceite_neutro')
          const aceiteNeutroInicial = calcMaterial(prev, 'aceite_neutro')
          const aceiteCrudoFinal = calcMaterial(curr, 'aceite_crudo')
          const aceiteCrudoInicial = calcMaterial(prev, 'aceite_crudo')
          const metanolFinal = calcMaterial(curr, 'metanol')
          const metanolInicial = calcMaterial(prev, 'metanol')
          const glicerinaFinal = calcMaterial(curr, 'glicerina')
          const glicerinaInicial = calcMaterial(prev, 'glicerina')

          const biodieselDespachos = dayW
            .filter((w: any) => w.type === 'despacho' && w.product?.name?.toLowerCase().includes('biodiesel'))
            .reduce((acc: number, w: any) => acc + (w.weight_net * 1000), 0)
          const biodieselIngresos = dayW
            .filter((w: any) => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('biodiesel'))
            .reduce((acc: number, w: any) => acc + (w.weight_net * 1000), 0)
          const aceiteIngresos = dayW
            .filter((w: any) => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('aceite'))
            .reduce((acc: number, w: any) => acc + (w.weight_net * 1000), 0)
          const metanolIngresos = dayW
            .filter((w: any) => w.type === 'recepcion' && w.product?.name?.toLowerCase().includes('metanol'))
            .reduce((acc: number, w: any) => acc + (w.weight_net * 1000), 0)
          const glicerinaDespachos = dayW
            .filter((w: any) => w.type === 'despacho' && w.product?.name?.toLowerCase().includes('glicerina'))
            .reduce((acc: number, w: any) => acc + (w.weight_net * 1000), 0)

          dailyData.push({
            date: dateStr,
            biodiesel_producido: Math.max(0, kgToTn(biodieselFinal - biodieselInicial + biodieselDespachos - biodieselIngresos)),
            biodiesel_despachos: kgToTn(biodieselDespachos),
            aceite_consumido: Math.max(0, kgToTn((aceiteNeutroInicial + aceiteCrudoInicial) - (aceiteNeutroFinal + aceiteCrudoFinal) + aceiteIngresos)),
            metanol_consumido: Math.max(0, kgToTn(metanolInicial - metanolFinal + metanolIngresos)),
            glicerina_producida: Math.max(0, kgToTn(glicerinaFinal - glicerinaInicial + glicerinaDespachos)),
            isComplete: curr.length > 0 && prev.length > 0,
          })
        }

        setProductionData(dailyData)
        setWeighingsData([])
        setStocksData([])
        setCompanyWeighingsData([])
      } else if (reportType === 'company') {
        if (!selectedCompanyId) { setLoading(false); return }
        const { data } = await supabase
          .from('weighings')
          .select('*, product:products(*)')
          .eq('company_id', selectedCompanyId)
          .gte('date', fromStr)
          .lte('date', toStr)
          .order('date', { ascending: false })
        setCompanyWeighingsData(data || [])
        setWeighingsData([])
        setStocksData([])
        setProductionData([])
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    const SEP = ';'
    const n   = (v: number) => v.toFixed(3)
    let csvContent = ''
    let filename = ''

    if (reportType === 'production' && productionData.length > 0) {
      filename = `produccion_${format(dateFrom, 'yyyyMMdd')}_${format(dateTo, 'yyyyMMdd')}.csv`
      csvContent = ['Fecha','Biodiesel Producido (Tn)','Biodiesel Despachado (Tn)','Aceite Consumido (Tn)','Metanol Consumido (Tn)','Glicerina Producida (Tn)','Completo'].join(SEP) + '\n'
      productionData.forEach(d => {
        csvContent += [formatDate(d.date), n(d.biodiesel_producido), n(d.biodiesel_despachos), n(d.aceite_consumido), n(d.metanol_consumido), n(d.glicerina_producida), d.isComplete ? 'Si' : 'No'].join(SEP) + '\n'
      })
    } else if (reportType === 'weighings' && weighingsData.length > 0) {
      filename = `pesajes_${format(dateFrom, 'yyyyMMdd')}_${format(dateTo, 'yyyyMMdd')}.csv`
      csvContent = ['Fecha','Tipo','Producto','Empresa','Remito','Peso Bruto (kg)','Peso Tara (kg)','Peso Neto (Tn)'].join(SEP) + '\n'
      weighingsData.forEach(w => {
        csvContent += [formatDate(w.date), w.type === 'recepcion' ? 'Recepcion' : 'Despacho', w.product?.name || '', w.company || '', w.remito_number || '', w.weight_gross ?? '', w.weight_tare ?? '', (w.weight_net / 1000).toFixed(3)].join(SEP) + '\n'
      })
    } else if (reportType === 'stocks' && stocksData.length > 0) {
      filename = `stocks_${format(dateFrom, 'yyyyMMdd')}_${format(dateTo, 'yyyyMMdd')}.csv`
      csvContent = ['Fecha','Tanque','Codigo','Valor','Unidad','Kg'].join(SEP) + '\n'
      stocksData.forEach(s => {
        const valueKg = s.tank ? calculateValueKg(s.tank, s.value) : (s.value_kg || 0)
        csvContent += [formatDate(s.reading_date), s.tank?.name || '', s.tank?.code || '', s.value.toFixed(2), s.tank?.unit || '', valueKg.toFixed(2)].join(SEP) + '\n'
      })
    } else if (reportType === 'company' && companyWeighingsData.length > 0) {
      const companyName = companies.find(c => c.id === selectedCompanyId)?.name || 'empresa'
      filename = `empresa_${companyName.replace(/\s+/g, '_')}_${format(dateFrom, 'yyyyMMdd')}_${format(dateTo, 'yyyyMMdd')}.csv`
      csvContent = ['Fecha','Tipo','Producto','Remito','Chofer','Patente','Peso Bruto (kg)','Peso Tara (kg)','Peso Neto (Tn)'].join(SEP) + '\n'
      companyWeighingsData.forEach(w => {
        csvContent += [formatDate(w.date), w.type === 'recepcion' ? 'Recepcion' : 'Despacho', w.product?.name || '', w.remito_number || '', w.driver || '', w.license_plate || '', w.weight_gross ?? '', w.weight_tare ?? '', (w.weight_net / 1000).toFixed(3)].join(SEP) + '\n'
      })
    }

    if (csvContent) {
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Genera reportes de pesajes, stocks y producción</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>Selecciona el tipo de reporte y el rango de fechas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Tipo de Reporte</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weighings">Pesajes (Balanza)</SelectItem>
                  <SelectItem value="stocks">Stocks de Tanques</SelectItem>
                  <SelectItem value="production">Producción</SelectItem>
                  <SelectItem value="company">Por Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'company' && (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          {c.name}
                          {c.is_supplier && !c.is_client && <span className="text-xs text-muted-foreground">· Prov.</span>}
                          {c.is_client && !c.is_supplier && <span className="text-xs text-muted-foreground">· Cliente</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Desde</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateFrom, "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(d) => d && setDateFrom(d)}
                    disabled={(date) => date > new Date()}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Hasta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateTo, "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(d) => d && setDateTo(d)}
                    disabled={(date) => date > new Date() || date < dateFrom}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleGenerateReport} disabled={loading} className="flex-1">
                <FileText className="mr-2 h-4 w-4" />
                {loading ? 'Generando...' : 'Generar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {(weighingsData.length > 0 || stocksData.length > 0 || productionData.length > 0 || companyWeighingsData.length > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Resultados</CardTitle>
              <CardDescription>
                {reportType === 'weighings' && `${weighingsData.length} pesajes encontrados`}
                {reportType === 'stocks' && `${stocksData.length} lecturas encontradas`}
                {reportType === 'production' && `${productionData.length} días`}
                {reportType === 'company' && (() => {
                  const co = companies.find(c => c.id === selectedCompanyId)
                  const recepciones = companyWeighingsData.filter(w => w.type === 'recepcion').length
                  const despachos = companyWeighingsData.filter(w => w.type === 'despacho').length
                  return `${co?.name || 'Empresa'} · ${recepciones} recepciones, ${despachos} despachos`
                })()}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </CardHeader>
          <CardContent>
            {reportType === 'weighings' && weighingsData.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Remito</TableHead>
                      <TableHead className="text-right">Peso Neto (Tn)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weighingsData.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>{formatDate(w.date)}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                            w.type === 'recepcion' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          )}>
                            {w.type === 'recepcion' ? 'Recepción' : 'Despacho'}
                          </span>
                        </TableCell>
                        <TableCell>{w.product?.name}</TableCell>
                        <TableCell>{w.company || '-'}</TableCell>
                        <TableCell>{w.remito_number || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(w.weight_net / 1000, 3)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {reportType === 'stocks' && stocksData.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tanque</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Kg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocksData.map((s) => {
                      const valueKg = s.tank ? calculateValueKg(s.tank, s.value) : (s.value_kg || 0)
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{formatDate(s.reading_date)}</TableCell>
                          <TableCell>{s.tank?.name}</TableCell>
                          <TableCell className="font-mono text-sm">{s.tank?.code}</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(s.value)} {s.tank?.unit === 'liters' ? 'Lt' : s.tank?.unit === 'percentage' ? '%' : 'bolsas'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNumber(valueKg)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {reportType === 'production' && productionData.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Biodiesel Prod. (Tn)</TableHead>
                      <TableHead className="text-right">Biodiesel Desp. (Tn)</TableHead>
                      <TableHead className="text-right">Aceite Cons. (Tn)</TableHead>
                      <TableHead className="text-right">Metanol Cons. (Tn)</TableHead>
                      <TableHead className="text-right">Glicerina Prod. (Tn)</TableHead>
                      <TableHead className="text-center">Datos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionData.map((d) => (
                      <TableRow key={d.date} className={!d.isComplete ? 'opacity-50' : ''}>
                        <TableCell>{formatDate(d.date)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatNumber(d.biodiesel_producido, 3)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(d.biodiesel_despachos, 3)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(d.aceite_consumido, 3)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(d.metanol_consumido, 3)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(d.glicerina_producida, 3)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                            d.isComplete ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          )}>
                            {d.isComplete ? 'Completo' : 'Incompleto'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {reportType === 'company' && companyWeighingsData.length > 0 && (() => {
              const recepciones = companyWeighingsData.filter(w => w.type === 'recepcion')
              const despachos   = companyWeighingsData.filter(w => w.type === 'despacho')
              const totalRecTn  = recepciones.reduce((s, w) => s + w.weight_net / 1000, 0)
              const totalDespTn = despachos.reduce((s, w) => s + w.weight_net / 1000, 0)

              return (
                <div className="space-y-6">
                  {/* Totales resumen */}
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Recepciones</p>
                      <p className="text-2xl font-bold text-green-600">{recepciones.length}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Recibido (Tn)</p>
                      <p className="text-2xl font-bold text-green-600">{formatNumber(totalRecTn, 3)}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Despachos</p>
                      <p className="text-2xl font-bold text-blue-600">{despachos.length}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Despachado (Tn)</p>
                      <p className="text-2xl font-bold text-blue-600">{formatNumber(totalDespTn, 3)}</p>
                    </div>
                  </div>

                  {/* Tabla detalle */}
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Remito</TableHead>
                          <TableHead>Chofer</TableHead>
                          <TableHead>Patente</TableHead>
                          <TableHead className="text-right">Peso Neto (Tn)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companyWeighingsData.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>{formatDate(w.date)}</TableCell>
                            <TableCell>
                              <Badge variant={w.type === 'recepcion' ? 'default' : 'secondary'}>
                                {w.type === 'recepcion' ? 'Recepción' : 'Despacho'}
                              </Badge>
                            </TableCell>
                            <TableCell>{w.product?.name || '-'}</TableCell>
                            <TableCell className="font-mono text-sm">{w.remito_number || '-'}</TableCell>
                            <TableCell>{w.driver || '-'}</TableCell>
                            <TableCell className="font-mono text-sm">{w.license_plate || '-'}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatNumber(w.weight_net / 1000, 3)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {weighingsData.length === 0 && stocksData.length === 0 && productionData.length === 0 && companyWeighingsData.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Selecciona los filtros y genera un reporte</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}