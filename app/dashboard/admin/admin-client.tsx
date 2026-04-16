'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Settings, Users, Container, Package, Edit2, Save, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { formatDate, ROLE_LABELS, MATERIAL_LABELS } from '@/lib/types'
import type { Profile, Tank, Product, UserRole, ProductCategory, ProductUnit } from '@/lib/types'

interface AdminClientProps {
  users: Profile[]
  tanks: Tank[]
  products: Product[]
}

export function AdminClient({ users: initialUsers, tanks, products }: AdminClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<UserRole>('general')
  const [saving, setSaving] = useState(false)

  // Estado ABM tanques
  const [tanksList, setTanksList] = useState<Tank[]>(tanks)
  const [tankDialog, setTankDialog] = useState(false)
  const [editingTank, setEditingTank] = useState<Tank | null>(null)
  const [tankForm, setTankForm] = useState({
    code: '',
    name: '',
    material_type: 'biodiesel' as Tank['material_type'],
    capacity_liters: '',
    density: '',
    unit: 'liters' as Tank['unit'],
    display_order: '0',
    is_active: true,
  })
  const [savingTank, setSavingTank] = useState(false)

  const openNewTank = () => {
    setEditingTank(null)
    setTankForm({ code: '', name: '', material_type: 'biodiesel', capacity_liters: '', density: '', unit: 'liters', display_order: '0', is_active: true })
    setTankDialog(true)
  }

  const openEditTank = (tank: Tank) => {
    setEditingTank(tank)
    setTankForm({
      code: tank.code,
      name: tank.name,
      material_type: tank.material_type,
      capacity_liters: tank.capacity_liters?.toString() || '',
      density: tank.density.toString(),
      unit: tank.unit,
      display_order: tank.display_order.toString(),
      is_active: tank.is_active,
    })
    setTankDialog(true)
  }

  const handleSaveTank = async () => {
    if (!tankForm.code.trim()) return alert('El código es requerido')
    if (!tankForm.name.trim()) return alert('El nombre es requerido')
    setSavingTank(true)
    const payload = {
      code: tankForm.code.trim(),
      name: tankForm.name.trim(),
      material_type: tankForm.material_type,
      capacity_liters: tankForm.capacity_liters ? parseFloat(tankForm.capacity_liters) : null,
      density: parseFloat(tankForm.density) || 0,
      unit: tankForm.unit,
      display_order: parseInt(tankForm.display_order) || 0,
      is_active: tankForm.is_active,
    }
    try {
      if (editingTank) {
        const { error } = await supabase.from('tanks').update(payload).eq('id', editingTank.id)
        if (error) return alert('Error al actualizar: ' + error.message)
        setTanksList(tanksList.map(t => t.id === editingTank.id ? { ...t, ...payload } : t))
      } else {
        const { data, error } = await supabase.from('tanks').insert(payload).select().single()
        if (error) return alert('Error al crear: ' + error.message)
        if (data) setTanksList([...tanksList, data])
      }
      setTankDialog(false)
      router.refresh()
    } catch {
      alert('Error inesperado')
    } finally {
      setSavingTank(false)
    }
  }

  // Estado ABM productos
  const [productsList, setProductsList] = useState<Product[]>(products)
  const [productDialog, setProductDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'recepcion' as ProductCategory,
    unit: 'tn' as ProductUnit,
    is_active: true,
  })
  const [savingProduct, setSavingProduct] = useState(false)

  const openNewProduct = () => {
    setEditingProduct(null)
    setProductForm({ name: '', category: 'recepcion', unit: 'tn', is_active: true })
    setProductDialog(true)
  }

  const openEditProduct = (product: Product) => {
    setEditingProduct(product)
    setProductForm({
      name: product.name,
      category: product.category,
      unit: product.unit,
      is_active: product.is_active,
    })
    setProductDialog(true)
  }

  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) return alert('El nombre es requerido')
    setSavingProduct(true)
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productForm)
          .eq('id', editingProduct.id)
        if (error) return alert('Error al actualizar: ' + error.message)
        setProductsList(productsList.map(p => p.id === editingProduct.id ? { ...p, ...productForm } : p))
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(productForm)
          .select()
          .single()
        if (error) return alert('Error al crear: ' + error.message)
        if (data) setProductsList([...productsList, data])
      }
      setProductDialog(false)
      router.refresh()
    } catch {
      alert('Error inesperado')
    } finally {
      setSavingProduct(false)
    }
  }

  const handleEditUser = (user: Profile) => {
    setEditingUserId(user.id)
    setEditingRole(user.role)
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
  }

  const handleSaveRole = async (userId: string) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: editingRole })
        .eq('id', userId)

      if (error) {
        alert('Error al actualizar rol: ' + error.message)
      } else {
        setUsers(users.map(u => u.id === userId ? { ...u, role: editingRole } : u))
        setEditingUserId(null)
        router.refresh()
      }
    } catch (error) {
      alert('Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'operador':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Administra usuarios, tanques y productos del sistema</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="tanks" className="gap-2">
            <Container className="h-4 w-4" />
            Tanques
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Productos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>
                Administra los roles y permisos de los usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || 'Sin nombre'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {editingUserId === user.id ? (
                            <Select value={editingRole} onValueChange={(v) => setEditingRole(v as UserRole)}>
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="general">Usuario General</SelectItem>
                                <SelectItem value="operador">Operador</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                              {ROLE_LABELS[user.role]}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell className="text-right">
                          {editingUserId === user.id ? (
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleSaveRole(user.id)}
                                disabled={saving}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 rounded-lg bg-muted/50 p-4">
                <h4 className="font-medium mb-2">Roles del Sistema</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li><strong>Administrador:</strong> Acceso total, puede gestionar usuarios y configuración</li>
                  <li><strong>Operador:</strong> Puede cargar datos de stocks, pesajes y lecturas</li>
                  <li><strong>Usuario General:</strong> Solo puede ver datos, sin permisos de edición</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tanks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tanques Configurados</CardTitle>
                <CardDescription>
                  Lista de tanques del sistema ({tanksList.length} tanques)
                </CardDescription>
              </div>
              <Button onClick={openNewTank} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Tanque
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo Material</TableHead>
                      <TableHead className="text-right">Capacidad</TableHead>
                      <TableHead className="text-right">Densidad</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tanksList.map((tank) => (
                      <TableRow key={tank.id}>
                        <TableCell className="font-mono text-sm">{tank.code}</TableCell>
                        <TableCell className="font-medium">{tank.name}</TableCell>
                        <TableCell>{MATERIAL_LABELS[tank.material_type] || tank.material_type}</TableCell>
                        <TableCell className="text-right">
                          {tank.capacity_liters ? `${tank.capacity_liters.toLocaleString()} Lt` : '-'}
                        </TableCell>
                        <TableCell className="text-right">{tank.density}</TableCell>
                        <TableCell>
                          {tank.unit === 'liters' ? 'Litros' : tank.unit === 'percentage' ? '%' : 'Bolsas'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tank.is_active ? "default" : "secondary"}>
                            {tank.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditTank(tank)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Dialog ABM Tanque */}
          <Dialog open={tankDialog} onOpenChange={setTankDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTank ? 'Editar Tanque' : 'Nuevo Tanque'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <Input
                      value={tankForm.code}
                      onChange={(e) => setTankForm({ ...tankForm, code: e.target.value })}
                      placeholder="Ej: TKB01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Orden visualización</Label>
                    <Input
                      type="number"
                      value={tankForm.display_order}
                      onChange={(e) => setTankForm({ ...tankForm, display_order: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={tankForm.name}
                    onChange={(e) => setTankForm({ ...tankForm, name: e.target.value })}
                    placeholder="Ej: Biodiesel TPT01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Material</Label>
                  <Select
                    value={tankForm.material_type}
                    onValueChange={(v) => setTankForm({ ...tankForm, material_type: v as Tank['material_type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MATERIAL_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capacidad (Litros)</Label>
                    <Input
                      type="number"
                      value={tankForm.capacity_liters}
                      onChange={(e) => setTankForm({ ...tankForm, capacity_liters: e.target.value })}
                      placeholder="Ej: 60000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Densidad</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={tankForm.density}
                      onChange={(e) => setTankForm({ ...tankForm, density: e.target.value })}
                      placeholder="Ej: 0.885"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Unidad de medida</Label>
                  <Select
                    value={tankForm.unit}
                    onValueChange={(v) => setTankForm({ ...tankForm, unit: v as Tank['unit'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liters">Litros</SelectItem>
                      <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                      <SelectItem value="bags">Bolsas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={tankForm.is_active ? 'true' : 'false'}
                    onValueChange={(v) => setTankForm(prev => ({ ...prev, is_active: v === 'true' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Activo</SelectItem>
                      <SelectItem value="false">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTankDialog(false)}>Cancelar</Button>
                <Button onClick={handleSaveTank} disabled={savingTank}>
                  {savingTank ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Productos Configurados</CardTitle>
                <CardDescription>
                  Lista de productos para pesajes ({productsList.length} productos)
                </CardDescription>
              </div>
              <Button onClick={openNewProduct} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Producto
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Unidad</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsList.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            product.category === 'recepcion'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : product.category === 'despacho'
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : 'bg-purple-100 text-purple-700 border-purple-200'
                          }>
                            {product.category === 'recepcion' ? 'Recepción' :
                             product.category === 'despacho' ? 'Despacho' : 'Ambos'}
                          </Badge>
                        </TableCell>
                        <TableCell className="uppercase">{product.unit}</TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditProduct(product)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Dialog ABM Producto */}
          <Dialog open={productDialog} onOpenChange={setProductDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Nombre</Label>
                  <Input
                    id="product-name"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Nombre del producto"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select
                    value={productForm.category}
                    onValueChange={(v) => setProductForm({ ...productForm, category: v as ProductCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recepcion">Recepción</SelectItem>
                      <SelectItem value="despacho">Despacho</SelectItem>
                      <SelectItem value="ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidad</Label>
                  <Select
                    value={productForm.unit}
                    onValueChange={(v) => setProductForm({ ...productForm, unit: v as ProductUnit })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tn">Toneladas (tn)</SelectItem>
                      <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                      <SelectItem value="bags">Bolsas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={productForm.is_active ? 'true' : 'false'}
                    onValueChange={(v) => setProductForm(prev => ({ ...prev, is_active: v === 'true' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Activo</SelectItem>
                      <SelectItem value="false">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setProductDialog(false)}>Cancelar</Button>
                <Button onClick={handleSaveProduct} disabled={savingProduct}>
                  {savingProduct ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}
