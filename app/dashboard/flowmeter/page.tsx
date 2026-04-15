'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CalendarIcon, Save, Loader2, Gauge } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatNumber, formatDate } from '@/lib/types'

interface FlowmeterReading {
  id: string
  reading_date: string
  accumulated_value: number
  user_id: string
  created_at: string
  updated_at?: string
}

export default function FlowmeterPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [accumulatedValue, setAccumulatedValue] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [recentReadings, setRecentReadings] = useState<FlowmeterReading[]>([])
  const [currentReading, setCurrentReading] = useState<FlowmeterReading | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [userId, setUserId] = useState<string>('')
  
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUserId(user.id)
        // Para el MVP, cualquier usuario autenticado puede editar
        setCanEdit(true)
      }

      // Fetch recent readings (last 30 days)
      const { data: readings } = await supabase
        .from('flowmeter_readings')
        .select('*')
        .gte('reading_date', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
        .order('reading_date', { ascending: false })

      setRecentReadings(readings || [])
    }

    init()
  }, [supabase])

  useEffect(() => {
    const fetchCurrentReading = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const { data } = await supabase
        .from('flowmeter_readings')
        .select('*')
        .eq('reading_date', dateStr)
        .single()

      if (data) {
        setCurrentReading(data)
        setAccumulatedValue(data.accumulated_value.toString())
      } else {
        setCurrentReading(null)
        setAccumulatedValue('')
      }
    }

    fetchCurrentReading()
  }, [selectedDate, supabase])

  const handleSave = async () => {
    if (!canEdit || !accumulatedValue) return

    setSaving(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const value = parseInt(accumulatedValue, 10)

    try {
      if (currentReading) {
        // Update
        const { data, error } = await supabase
          .from('flowmeter_readings')
          .update({ 
            accumulated_value: value,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentReading.id)
          .select()
          .single()

        if (error) {
          alert('Error al actualizar: ' + error.message)
        } else if (data) {
          setCurrentReading(data)
          setRecentReadings(prev => 
            prev.map(r => r.id === data.id ? data : r)
          )
        }
      } else {
        // Insert
        const { data, error } = await supabase
          .from('flowmeter_readings')
          .insert({
            reading_date: dateStr,
            accumulated_value: value,
            user_id: userId,
          })
          .select()
          .single()

        if (error) {
          alert('Error al guardar: ' + error.message)
        } else if (data) {
          setCurrentReading(data)
          setRecentReadings(prev => [data, ...prev])
        }
      }
    } catch (error) {
      alert('Error inesperado al guardar')
    } finally {
      setSaving(false)
    }
  }

  // Calculate daily production from consecutive readings
  const getDailyProduction = (reading: FlowmeterReading, index: number): number | null => {
    if (index >= recentReadings.length - 1) return null
    const previousReading = recentReadings[index + 1]
    return reading.accumulated_value - previousReading.accumulated_value
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Caudalímetro</h1>
        <p className="text-muted-foreground">
          Registro de lecturas del caudalímetro de biodiesel
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Nueva Lectura
            </CardTitle>
            <CardDescription>
              Ingresa la lectura acumulada del caudalímetro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accumulated">Valor Acumulado (Toneladas)</Label>
              <Input
                id="accumulated"
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={accumulatedValue}
                onChange={(e) => setAccumulatedValue(Math.round(Number(e.target.value)).toString())}
                disabled={!canEdit}
              />
            </div>

            {currentReading && (
              <p className="text-sm text-muted-foreground">
                Última actualización: {format(new Date(currentReading.updated_at || currentReading.created_at), "PPp", { locale: es })}
              </p>
            )}

            {canEdit && (
              <Button 
                onClick={handleSave}
                disabled={saving || !accumulatedValue}
                className="w-full"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {currentReading ? 'Actualizar' : 'Guardar'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* History Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Historial de Lecturas</CardTitle>
            <CardDescription>Últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acumulado (Tn)</TableHead>
                  <TableHead className="text-right">Producción Diaria (Tn)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReadings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hay lecturas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  recentReadings.map((reading, index) => {
                    const dailyProduction = getDailyProduction(reading, index)

                    return (
                      <TableRow key={reading.id}>
                        <TableCell>
                          {formatDate(reading.reading_date)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(reading.accumulated_value, 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {dailyProduction !== null ? formatNumber(dailyProduction, 0) : '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
