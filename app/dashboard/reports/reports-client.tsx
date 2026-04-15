'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon, Download, FileText, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatNumber, formatDate, calculateValueKg, kgToTn } from '@/lib/types'
import type { Product, Tank, Weighing, StockReading } from '@/lib/types'

interface ReportsClientProps {
  products: Product[]
  tanks: Tank[]
}

type ReportType = 'weighings' | 'stocks' | 'production'

export function ReportsClient({ products, tanks }: ReportsClientProps) {
  const supabase = createClient()
  const [reportType, setReportType] = useState<ReportType>('weighings')
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()))
  const [dateTo, setDateTo] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [weighingsData, setWeighingsData] = useState<Weighing[]>([])
  const [stocksData, setStocksData] = useState<(StockReading & { tank: Tank })[]>([])

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
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    let csvContent = ''
    let filename = ''

    if (reportType === 'weighings' && weighingsData.length > 0) {
      filename = `pesajes_${format(dateFrom, 'yyyyMMdd')}_${format(dateTo, 'yyyyMMdd')}.csv`
      csvContent = 'Fecha,Tipo,Producto,Empresa,Remito,Peso Bruto,Peso Tara,Peso Neto\n'
      weighingsData.forEach(w => {
        csvContent += `${formatDate(w.date)},${w.type},${w.product?.name || ''},${w.company || ''},${w.remito_number || ''},${w.weight_gross || ''},${w.weight_tare || ''},${w.weight_net}\n`
      })
    } else if (reportType === 'stocks' && stocksData.length > 0) {
      filename = `stocks_${format(dateFrom, 'yyyyMMdd')}_${format(dateTo, 'yyyyMMdd')}.csv`
      csvContent = 'Fecha,Tanque,Codigo,Valor,Unidad,Kg\n'
      stocksData.forEach(s => {
        const valueKg = s.tank ? calculateValueKg(s.tank, s.value) : (s.value_kg || 0)
        csvContent += `${formatDate(s.reading_date)},${s.tank?.name || ''},${s.tank?.code || ''},${s.value},${s.tank?.unit || ''},${formatNumber(valueKg)}\n`
      })
    }

    if (csvContent) {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
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
          <div className="grid gap-4 md:grid-cols-4">
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
                </SelectContent>
              </Select>
            </div>

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
      {(weighingsData.length > 0 || stocksData.length > 0) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Resultados</CardTitle>
              <CardDescription>
                {reportType === 'weighings' && `${weighingsData.length} pesajes encontrados`}
                {reportType === 'stocks' && `${stocksData.length} lecturas encontradas`}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </CardHeader>
          <CardContent>
            {reportType === 'weighings' && weighingsData.length > 0 && (
              <div className="rounded-md border">
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
              <div className="rounded-md border">
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
          </CardContent>
        </Card>
      )}

      {weighingsData.length === 0 && stocksData.length === 0 && !loading && (
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