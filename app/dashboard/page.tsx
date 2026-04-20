import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Container, Scale, Droplets, Factory, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { formatNumber, MATERIAL_LABELS, type MaterialType } from '@/lib/types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(now.getDate() - 1)
  const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`

  // Fetch tanks with today's readings
  const { data: tanks } = await supabase
    .from('tanks')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  // Fetch today's stock readings
  const { data: todayReadings } = await supabase
    .from('stock_readings')
    .select('*, tank:tanks(*)')
    .eq('reading_date', today)

  // Fetch yesterday's stock readings for comparison
  const { data: yesterdayReadings } = await supabase
    .from('stock_readings')
    .select('tank_id, value, value_kg')
    .eq('reading_date', yesterday)

  // Fetch today's weighings
  const { data: todayWeighings } = await supabase
    .from('weighings')
    .select('*, product:products(*)')
    .eq('date', today)

  // Calculate summary by material type
  const stocksByMaterial: Record<string, { today: number; yesterday: number; unit: string }> = {}
  
  todayReadings?.forEach((reading) => {
    const tank = reading.tank
    if (tank) {
      const materialType = tank.material_type as MaterialType
      if (!stocksByMaterial[materialType]) {
        stocksByMaterial[materialType] = { today: 0, yesterday: 0, unit: tank.unit }
      }
      stocksByMaterial[materialType].today += reading.value_kg || (reading.value * tank.density)
    }
  })

  yesterdayReadings?.forEach((reading) => {
    const tank = tanks?.find(t => t.id === reading.tank_id)
    if (tank) {
      const materialType = tank.material_type as MaterialType
      if (!stocksByMaterial[materialType]) {
        stocksByMaterial[materialType] = { today: 0, yesterday: 0, unit: tank.unit }
      }
      stocksByMaterial[materialType].yesterday += reading.value_kg || (reading.value * tank.density)
    }
  })

  // Calculate weighing totals
  const receptionTotal = todayWeighings
    ?.filter(w => w.type === 'recepcion')
    .reduce((acc, w) => acc + w.weight_net, 0) || 0

  const dispatchTotal = todayWeighings
    ?.filter(w => w.type === 'despacho')
    .reduce((acc, w) => acc + w.weight_net, 0) || 0

  // Check completeness
  const totalTanks = tanks?.length || 0
  const recordedTanks = todayReadings?.length || 0
  const stockCompleteness = totalTanks > 0 ? Math.round((recordedTanks / totalTanks) * 100) : 0

  // Key materials for quick view
  const keyMaterials: MaterialType[] = ['aceite_crudo', 'biodiesel', 'glicerina', 'metanol']

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground">
          Resumen del día: {new Date().toLocaleDateString('es-AR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Completeness Alert */}
      {stockCompleteness < 100 && (
        <Card className="mb-6 border-accent bg-accent/10">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertCircle className="h-5 w-5 text-accent" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Stocks incompletos</p>
              <p className="text-sm text-muted-foreground">
                Se han registrado {recordedTanks} de {totalTanks} tanques ({stockCompleteness}%)
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/stocks">Completar stocks</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Tanks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tanques Registrados
            </CardTitle>
            <Container className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recordedTanks}/{totalTanks}</div>
            <p className="text-xs text-muted-foreground">
              {stockCompleteness}% completado hoy
            </p>
          </CardContent>
        </Card>

        {/* Receptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recepciones Hoy
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(receptionTotal)} Tn</div>
            <p className="text-xs text-muted-foreground">
              {todayWeighings?.filter(w => w.type === 'recepcion').length || 0} pesadas
            </p>
          </CardContent>
        </Card>

        {/* Dispatches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Despachos Hoy
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dispatchTotal)} Tn</div>
            <p className="text-xs text-muted-foreground">
              {todayWeighings?.filter(w => w.type === 'despacho').length || 0} pesadas
            </p>
          </CardContent>
        </Card>

        {/* Biodiesel Stock */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stock Biodiesel
            </CardTitle>
            <Droplets className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber((stocksByMaterial['biodiesel']?.today || 0) / 1000)} Tn
            </div>
            {stocksByMaterial['biodiesel']?.yesterday > 0 && (
              <p className="text-xs text-muted-foreground">
                vs ayer: {formatNumber((stocksByMaterial['biodiesel']?.yesterday || 0) / 1000)} Tn
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Materials */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Materiales Principales</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {keyMaterials.map((material) => {
            const data = stocksByMaterial[material]
            const todayTn = (data?.today || 0) / 1000
            const yesterdayTn = (data?.yesterday || 0) / 1000
            const diff = todayTn - yesterdayTn
            const diffPercent = yesterdayTn > 0 ? ((diff / yesterdayTn) * 100) : 0

            return (
              <Card key={material}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {MATERIAL_LABELS[material]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{formatNumber(todayTn)} Tn</div>
                  {yesterdayTn > 0 && (
                    <div className={`flex items-center gap-1 text-xs ${diff >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {diff >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {diff >= 0 ? '+' : ''}{formatNumber(diffPercent, 1)}% vs ayer
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Weighings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Receptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas Recepciones</CardTitle>
            <CardDescription>Pesadas de recepción del día</CardDescription>
          </CardHeader>
          <CardContent>
            {todayWeighings?.filter(w => w.type === 'recepcion').length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay recepciones hoy</p>
            ) : (
              <div className="space-y-3">
                {todayWeighings
                  ?.filter(w => w.type === 'recepcion')
                  .slice(0, 5)
                  .map((weighing) => (
                    <div key={weighing.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{weighing.product?.name}</p>
                        <p className="text-xs text-muted-foreground">{weighing.company || 'Sin empresa'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatNumber(weighing.weight_net)} Tn</p>
                        <p className="text-xs text-muted-foreground">{weighing.license_plate || '-'}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            <Button asChild variant="ghost" className="mt-4 w-full" size="sm">
              <Link href="/dashboard/weighings">Ver todas las pesadas</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Dispatches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimos Despachos</CardTitle>
            <CardDescription>Pesadas de despacho del día</CardDescription>
          </CardHeader>
          <CardContent>
            {todayWeighings?.filter(w => w.type === 'despacho').length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay despachos hoy</p>
            ) : (
              <div className="space-y-3">
                {todayWeighings
                  ?.filter(w => w.type === 'despacho')
                  .slice(0, 5)
                  .map((weighing) => (
                    <div key={weighing.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{weighing.product?.name}</p>
                        <p className="text-xs text-muted-foreground">{weighing.company || 'Sin empresa'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatNumber(weighing.weight_net)} Tn</p>
                        <p className="text-xs text-muted-foreground">{weighing.license_plate || '-'}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            <Button asChild variant="ghost" className="mt-4 w-full" size="sm">
              <Link href="/dashboard/weighings">Ver todas las pesadas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
