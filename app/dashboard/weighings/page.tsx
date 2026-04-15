'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CalendarIcon, Plus, Loader2, Scale, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatNumber, type Product, type Weighing, type WeighingType } from '@/lib/types'

export default function WeighingsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [weighings, setWeighings] = useState<Weighing[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<WeighingType>('recepcion')

  // Form state
  const [formData, setFormData] = useState({
    type: 'recepcion' as WeighingType,
    product_id: '',
    company: '',
    remito_number: '',
    driver: '',
    license_plate: '',
    weight_gross: '',
    weight_tare: '',
    observations: '',
  })

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Check role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        const role = profile?.role
        setCanEdit(role === 'operador' || role === 'admin')
        setIsAdmin(role === 'admin')
      }

      // Fetch products
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')

      setProducts(productsData || [])
      setIsLoading(false)
    }

    init()
  }, [supabase])

  useEffect(() => {
    const fetchWeighings = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const { data } = await supabase
        .from('weighings')
        .select('*, product:products(*)')
        .eq('date', dateStr)
        .order('created_at', { ascending: false })

      setWeighings((data || []) as Weighing[])
    }

    fetchWeighings()
  }, [selectedDate, supabase])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const calculateNetWeight = () => {
    const gross = parseFloat(formData.weight_gross) || 0
    const tare = parseFloat(formData.weight_tare) || 0
    return gross - tare
  }

  const resetForm = () => {
    setFormData({
      type: activeTab,
      product_id: '',
      company: '',
      remito_number: '',
      driver: '',
      license_plate: '',
      weight_gross: '',
      weight_tare: '',
      observations: '',
    })
  }

  const handleSave = async () => {
    if (!canEdit || !formData.product_id) return

    setSaving(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const netWeight = calculateNetWeight()

    try {
      const { data, error } = await supabase
        .from('weighings')
        .insert({
          date: dateStr,
          type: formData.type,
          product_id: formData.product_id,
          company: formData.company || null,
          remito_number: formData.remito_number || null,
          driver: formData.driver || null,
          license_plate: formData.license_plate || null,
          weight_gross: parseFloat(formData.weight_gross) || null,
          weight_tare: parseFloat(formData.weight_tare) || null,
          weight_net: netWeight,
          observations: formData.observations || null,
          user_id: userId,
        })
        .select('*, product:products(*)')
        .single()

      if (!error && data) {
        setWeighings(prev => [data as Weighing, ...prev])
        resetForm()
        setDialogOpen(false)
      }
    } catch (error) {
      console.error('Error saving weighing:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!isAdmin) return
    
    const { error } = await supabase
      .from('weighings')
      .delete()
      .eq('id', id)

    if (!error) {
      setWeighings(prev => prev.filter(w => w.id !== id))
    }
  }

  const filteredProducts = products.filter(p => 
    p.category === activeTab || p.category === 'ambos'
  )

  const receptions = weighings.filter(w => w.type === 'recepcion')
  const dispatches = weighings.filter(w => w.type === 'despacho')

  const totalReception = receptions.reduce((acc, w) => acc + w.weight_net, 0)
  const totalDispatch = dispatches.reduce((acc, w) => acc + w.weight_net, 0)

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Balanza</h1>
          <p className="text-muted-foreground">
            Registro de pesadas de recepción y despacho
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
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date > new Date()}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          {canEdit && isToday && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setFormData(prev => ({ ...prev, type: activeTab }))
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Pesada
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    Nueva Pesada 
                  </DialogTitle>
                  <DialogDescription>
                    Completa los datos del ticket de pesaje
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => handleInputChange('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recepcion">Recepción</SelectItem>
                          <SelectItem value="despacho">Despacho</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Producto *</Label>
                      <Select
                        value={formData.product_id}
                        onValueChange={(value) => handleInputChange('product_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredProducts.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Empresa / Proveedor</Label>
                      <Input
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        placeholder="Nombre de la empresa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>N° Remito</Label>
                      <Input
                        value={formData.remito_number}
                        onChange={(e) => handleInputChange('remito_number', e.target.value)}
                        placeholder="0001-00000123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Chofer</Label>
                      <Input
                        value={formData.driver}
                        onChange={(e) => handleInputChange('driver', e.target.value)}
                        placeholder="Nombre del chofer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Patente</Label>
                      <Input
                        value={formData.license_plate}
                        onChange={(e) => handleInputChange('license_plate', e.target.value.toUpperCase())}
                        placeholder="ABC123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Peso Bruto (Tn)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={formData.weight_gross}
                        onChange={(e) => handleInputChange('weight_gross', e.target.value)}
                        placeholder="0.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tara (Tn)</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={formData.weight_tare}
                        onChange={(e) => handleInputChange('weight_tare', e.target.value)}
                        placeholder="0.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Peso Neto (Tn)</Label>
                      <div className="flex h-10 items-center rounded-md border bg-muted px-3 font-mono font-semibold">
                        {formatNumber(calculateNetWeight(), 3)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observaciones</Label>
                    <Textarea
                      value={formData.observations}
                      onChange={(e) => handleInputChange('observations', e.target.value)}
                      placeholder="Notas adicionales..."
                      rows={2}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving || !formData.product_id || calculateNetWeight() <= 0}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Pesada
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recepción
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalReception)} Tn</div>
            <p className="text-xs text-muted-foreground">{receptions.length} pesadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Despacho
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalDispatch)} Tn</div>
            <p className="text-xs text-muted-foreground">{dispatches.length} pesadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WeighingType)}>
        <TabsList>
          <TabsTrigger value="recepcion" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            Recepciones ({receptions.length})
          </TabsTrigger>
          <TabsTrigger value="despacho" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Despachos ({dispatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recepcion">
          <WeighingsTable 
            weighings={receptions} 
            onDelete={handleDelete} 
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="despacho">
          <WeighingsTable 
            weighings={dispatches} 
            onDelete={handleDelete} 
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function WeighingsTable({ 
  weighings, 
  onDelete, 
  isAdmin 
}: { 
  weighings: Weighing[]
  onDelete: (id: string) => void
  isAdmin: boolean
}) {
  if (weighings.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No hay pesadas registradas para esta fecha
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Patente</TableHead>
              <TableHead>Remito</TableHead>
              <TableHead className="text-right">Bruto (Tn)</TableHead>
              <TableHead className="text-right">Tara (Tn)</TableHead>
              <TableHead className="text-right">Neto (Tn)</TableHead>
              {isAdmin && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {weighings.map((weighing) => (
              <TableRow key={weighing.id}>
                <TableCell className="font-medium">{weighing.product?.name}</TableCell>
                <TableCell>{weighing.company || '-'}</TableCell>
                <TableCell className="font-mono">{weighing.license_plate || '-'}</TableCell>
                <TableCell>{weighing.remito_number || '-'}</TableCell>
                <TableCell className="text-right font-mono">
                  {weighing.weight_gross ? formatNumber(weighing.weight_gross, 3) : '-'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {weighing.weight_tare ? formatNumber(weighing.weight_tare, 3) : '-'}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatNumber(weighing.weight_net, 3)}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onDelete(weighing.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
