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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { CalendarIcon, Plus, Loader2, Scale, Trash2, Pencil, TrendingDown, TrendingUp, ExternalLink } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { formatNumber, type Product, type Company, type WeighingWithProduct, type WeighingType } from '@/lib/types'

export default function WeighingsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [weighings, setWeighings] = useState<WeighingWithProduct[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [canEdit, setCanEdit] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<WeighingType>('recepcion')
  const [editingWeighing, setEditingWeighing] = useState<WeighingWithProduct | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    type: 'recepcion' as WeighingType,
    product_id: '',
    company_id: '',   // '' = sin empresa vinculada
    company: '',      // texto libre (fallback)
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

      // Fetch products y companies en paralelo
      const [{ data: productsData }, { data: companiesData }] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true).order('name'),
        supabase.from('companies').select('*').eq('is_active', true).order('name'),
      ])

      setProducts(productsData || [])
      setCompanies(companiesData || [])
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

      setWeighings((data || []) as WeighingWithProduct[])
    }

    fetchWeighings()
  }, [selectedDate, supabase])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value }
      // Al cambiar el tipo, limpiar empresa si ya no corresponde
      if (field === 'type' && prev.company_id) {
        const co = companies.find(c => c.id === prev.company_id)
        if (co) {
          const valid = value === 'recepcion' ? co.is_supplier : co.is_client
          if (!valid) next.company_id = ''
        }
      }
      return next
    })
  }

  const calculateNetWeight = () => {
    const gross = parseFloat(formData.weight_gross) || 0
    const tare = parseFloat(formData.weight_tare) || 0
    return gross - tare
  }

  const resetForm = () => {
    setEditingWeighing(null)
    setFormData({
      type: activeTab,
      product_id: '',
      company_id: '',
      company: '',
      remito_number: '',
      driver: '',
      license_plate: '',
      weight_gross: '',
      weight_tare: '',
      observations: '',
    })
  }

  const handleEdit = (weighing: WeighingWithProduct) => {
    if (!isAdmin) return
    setEditingWeighing(weighing)
    setFormData({
      type: weighing.type,
      product_id: weighing.product_id,
      company_id: weighing.company_id || '',
      company: weighing.company || '',
      remito_number: weighing.remito_number || '',
      driver: weighing.driver || '',
      license_plate: weighing.license_plate || '',
      weight_gross: weighing.weight_gross?.toString() || '',
      weight_tare: weighing.weight_tare?.toString() || '',
      observations: weighing.observations || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!canEdit || !formData.product_id) return

    setSaving(true)
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const netWeight = calculateNetWeight()

    try {
      // Nombre de empresa: preferir el de la empresa vinculada
      const selectedCompany = companies.find(c => c.id === formData.company_id)
      const companyName = selectedCompany?.name || formData.company || null
      const companyId   = formData.company_id || null

      if (editingWeighing) {
        // UPDATE
        const { data, error } = await supabase
          .from('weighings')
          .update({
            type: formData.type,
            product_id: formData.product_id,
            company_id: companyId,
            company: companyName,
            remito_number: formData.remito_number || null,
            driver: formData.driver || null,
            license_plate: formData.license_plate || null,
            weight_gross: parseFloat(formData.weight_gross) || null,
            weight_tare: parseFloat(formData.weight_tare) || null,
            weight_net: netWeight,
            observations: formData.observations || null,
          })
          .eq('id', editingWeighing.id)
          .select('*, product:products(*)')
          .single()

        if (!error && data) {
          setWeighings(prev => prev.map(w => w.id === editingWeighing.id ? data as WeighingWithProduct : w))
          resetForm()
          setDialogOpen(false)
        }
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('weighings')
          .insert({
            date: dateStr,
            type: formData.type,
            product_id: formData.product_id,
            company_id: companyId,
            company: companyName,
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
          setWeighings(prev => [data as WeighingWithProduct, ...prev])
          resetForm()
          setDialogOpen(false)
        }
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
    p.category === formData.type || p.category === 'ambos'
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
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Balanza</h1>
          <p className="text-muted-foreground">
            Registro de pesadas de recepción y despacho
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
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

          {canEdit && (isToday || isAdmin) && (
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              if (!open) resetForm()
              setDialogOpen(open)
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingWeighing(null)
                  setFormData(prev => ({ ...prev, type: activeTab }))
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Pesada
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingWeighing ? 'Editar Pesada' : 'Nueva Pesada'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingWeighing
                      ? 'Modificá los datos del ticket de pesaje'
                      : 'Completa los datos del ticket de pesaje'}
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
                      <div className="flex items-center justify-between">
                        <Label>Empresa / Proveedor</Label>
                        <Link
                          href="/dashboard/companies"
                          target="_blank"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Nueva empresa
                        </Link>
                      </div>
                      <Select
                        value={formData.company_id || '__blank__'}
                        onValueChange={(v) => handleInputChange('company_id', v === '__blank__' ? '' : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sin empresa (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__blank__">— Sin empresa —</SelectItem>
                          {companies
                            .filter(c =>
                              formData.type === 'recepcion' ? c.is_supplier : c.is_client
                            )
                            .map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                                {c.is_supplier && c.is_client && ' · Prov./Cliente'}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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
                      <div className={`flex h-10 items-center rounded-md border px-3 font-mono font-semibold ${calculateNetWeight() <= 0 ? 'border-destructive bg-destructive/10 text-destructive' : 'bg-muted'}`}>
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
                    {editingWeighing ? 'Guardar Cambios' : 'Guardar Pesada'}
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
            onEdit={handleEdit}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="despacho">
          <WeighingsTable
            weighings={dispatches}
            onDelete={handleDelete}
            onEdit={handleEdit}
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
  onEdit,
  isAdmin,
}: {
  weighings: WeighingWithProduct[]
  onDelete: (id: string) => void
  onEdit: (weighing: WeighingWithProduct) => void
  isAdmin: boolean
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const confirmingWeighing = weighings.find(w => w.id === confirmDeleteId)

  if (weighings.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No hay pesadas registradas para esta fecha
        </CardContent>
      </Card>
    )
  }

  const showActions = isAdmin

  return (
    <>
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
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
              {showActions && <TableHead className="w-[90px]"></TableHead>}
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
                {showActions && (
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(weighing)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Editar pesada"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDeleteId(weighing.id)}
                        className="text-destructive hover:text-destructive"
                        title="Eliminar pesada"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar pesada?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás por eliminar la pesada de{' '}
            <span className="font-semibold text-foreground">
              {confirmingWeighing?.product?.name}
            </span>
            {confirmingWeighing?.weight_net != null && (
              <> — {confirmingWeighing.weight_net.toFixed(3)} Tn</>
            )}
            . Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (confirmDeleteId) onDelete(confirmDeleteId)
              setConfirmDeleteId(null)
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
