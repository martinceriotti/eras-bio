'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { CalendarIcon, Check, Save, Loader2 } from 'lucide-react'
import { 
  type Tank, 
  type StockReading, 
  type MaterialType,
  MATERIAL_LABELS, 
  UNIT_LABELS,
  formatNumber,
  litersToKg,
  kgToTn
} from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface StocksClientProps {
  tanks: Tank[]
  initialReadings: StockReading[]
  selectedDate: string
  canEdit: boolean
  userId: string
}

// Group tanks by material type
function groupTanksByMaterial(tanks: Tank[]): Record<MaterialType, Tank[]> {
  return tanks.reduce((acc, tank) => {
    const material = tank.material_type as MaterialType
    if (!acc[material]) {
      acc[material] = []
    }
    acc[material].push(tank)
    return acc
  }, {} as Record<MaterialType, Tank[]>)
}

export function StocksClient({ 
  tanks, 
  initialReadings, 
  selectedDate: initialDate,
  canEdit,
  userId 
}: StocksClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(parseISO(initialDate))
  const [readings, setReadings] = useState<Record<string, number>>({})
  const [savedReadings, setSavedReadings] = useState<Record<string, StockReading>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [isLoadingDate, setIsLoadingDate] = useState(false)

  const supabase = createClient()

  // Initialize readings from database
  useEffect(() => {
    const readingsMap: Record<string, number> = {}
    const savedMap: Record<string, StockReading> = {}
    
    initialReadings.forEach(reading => {
      readingsMap[reading.tank_id] = reading.value
      savedMap[reading.tank_id] = reading
    })
    
    setReadings(readingsMap)
    setSavedReadings(savedMap)
  }, [initialReadings])

  // Fetch readings when date changes
  const fetchReadingsForDate = useCallback(async (date: Date) => {
    setIsLoadingDate(true)
    const dateStr = format(date, 'yyyy-MM-dd')
    
    const { data } = await supabase
      .from('stock_readings')
      .select('*')
      .eq('reading_date', dateStr)

    const readingsMap: Record<string, number> = {}
    const savedMap: Record<string, StockReading> = {}
    
    data?.forEach(reading => {
      readingsMap[reading.tank_id] = reading.value
      savedMap[reading.tank_id] = reading
    })
    
    setReadings(readingsMap)
    setSavedReadings(savedMap)
    setIsLoadingDate(false)
  }, [supabase])

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      fetchReadingsForDate(date)
    }
  }

  const handleValueChange = (tankId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setReadings(prev => ({ ...prev, [tankId]: numValue }))
  }

  const saveReading = async (tank: Tank) => {
    if (!canEdit) return
    
    setSaving(tank.id)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const value = readings[tank.id] || 0
    const valueKg = tank.unit === 'liters' ? litersToKg(value, tank.density) : value

    try {
      const existingReading = savedReadings[tank.id]

      if (existingReading) {
        // Update existing
        const { data, error } = await supabase
          .from('stock_readings')
          .update({ 
            value, 
            value_kg: valueKg,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReading.id)
          .select()
          .single()

        if (!error && data) {
          setSavedReadings(prev => ({ ...prev, [tank.id]: data }))
        }
      } else {
        // Create new
        const { data, error } = await supabase
          .from('stock_readings')
          .insert({
            tank_id: tank.id,
            reading_date: dateStr,
            value,
            value_kg: valueKg,
            user_id: userId,
          })
          .select()
          .single()

        if (!error && data) {
          setSavedReadings(prev => ({ ...prev, [tank.id]: data }))
        }
      }
    } catch (error) {
      console.error('Error saving reading:', error)
    } finally {
      setSaving(null)
    }
  }

  const groupedTanks = groupTanksByMaterial(tanks)
  const materialTypes = Object.keys(groupedTanks) as MaterialType[]

  // Calculate totals per material
  const calculateMaterialTotal = (material: MaterialType) => {
    const materialTanks = groupedTanks[material] || []
    let totalKg = 0

    materialTanks.forEach(tank => {
      const value = readings[tank.id] || 0
      if (material === 'glp') {
        totalKg += (tank.capacity_liters || 0) * value * tank.density / 100000
      } else if (tank.unit === 'liters') {
        totalKg += litersToKg(value, tank.density)
       } else if (tank.unit === 'bags') {
        totalKg += litersToKg(value, tank.density)
      } else {
        totalKg += value
      }
    })
    
    return totalKg
  }

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  const completedCount = Object.keys(savedReadings).length
  const totalCount = tanks.length
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registro de Stocks</h1>
          <p className="text-muted-foreground">
            Registra los niveles de los tanques
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                disabled={(date) => date > new Date()}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          {/* Completion Badge */}
          <Badge variant={completionPercent === 100 ? "default" : "secondary"} className="text-sm">
            {completedCount}/{totalCount} ({completionPercent}%)
          </Badge>
        </div>
      </div>

      {isLoadingDate ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue={materialTypes[0]} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-2">
            {materialTypes.map(material => (
              <TabsTrigger key={material} value={material} className="text-xs lg:text-sm">
                {MATERIAL_LABELS[material]}
                <Badge variant="outline" className="ml-2 text-xs">
                  {groupedTanks[material]?.filter(t => savedReadings[t.id]).length || 0}/{groupedTanks[material]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {materialTypes.map(material => (
            <TabsContent key={material} value={material}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{MATERIAL_LABELS[material]}</CardTitle>
                      <CardDescription>
                        Total: {formatNumber(kgToTn(calculateMaterialTotal(material)))} Tn ({formatNumber(calculateMaterialTotal(material))} Kg)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {groupedTanks[material]?.map(tank => {
                      const value = readings[tank.id] || 0
                      const isSaved = !!savedReadings[tank.id]
                      const valueKg = tank.unit === 'liters' ? litersToKg(value, tank.density) : value
                      const isSaving = saving === tank.id

                      return (
                        <div 
                          key={tank.id} 
                          className={cn(
                            "rounded-lg border p-4 transition-colors",
                            isSaved ? "border-primary/50 bg-primary/5" : "border-border"
                          )}
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{tank.code}</p>
                              <p className="text-xs text-muted-foreground">{tank.name}</p>
                            </div>
                            {isSaved && (
                              <Check className="h-5 w-5 text-primary" />
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={value ?? ''}
                                onChange={(e) => handleValueChange(tank.id, e.target.value)}
                                disabled={!canEdit || !isToday}
                                className="flex-1"
                              />
                              <span className="flex items-center text-sm text-muted-foreground min-w-[50px]">
                                {UNIT_LABELS[tank.unit]}
                              </span>
                            </div>

                            {tank.unit === 'liters' && value > 0 && (
                              <p className="text-xs text-muted-foreground">
                                = {formatNumber(valueKg)} Kg ({formatNumber(kgToTn(valueKg))} Tn)
                              </p>
                            )}

                            {canEdit && isToday && (
                              <Button 
                                onClick={() => saveReading(tank)}
                                disabled={isSaving || value === undefined || value === null}
                                size="sm"
                                className="w-full"
                                variant={isSaved ? "outline" : "default"}
                              >
                                {isSaving ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="mr-2 h-4 w-4" />
                                )}
                                {isSaved ? 'Actualizar' : 'Guardar'}
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
