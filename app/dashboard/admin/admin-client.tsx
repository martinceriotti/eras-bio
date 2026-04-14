'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Settings, Users, Container, Package, Edit2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatDate, ROLE_LABELS, MATERIAL_LABELS } from '@/lib/types'
import type { Profile, Tank, Product, UserRole } from '@/lib/types'

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
            <CardHeader>
              <CardTitle>Tanques Configurados</CardTitle>
              <CardDescription>
                Lista de tanques del sistema ({tanks.length} tanques)
              </CardDescription>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tanks.map((tank) => (
                      <TableRow key={tank.id}>
                        <TableCell className="font-mono text-sm">{tank.code}</TableCell>
                        <TableCell className="font-medium">{tank.name}</TableCell>
                        <TableCell>{MATERIAL_LABELS[tank.material_type] || tank.material_type}</TableCell>
                        <TableCell className="text-right">
                          {tank.capacity_liters ? `${(tank.capacity_liters / 1000).toLocaleString()} m³` : '-'}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Productos Configurados</CardTitle>
              <CardDescription>
                Lista de productos para pesajes ({products.length} productos)
              </CardDescription>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
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
                        <TableCell>{product.unit}</TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
