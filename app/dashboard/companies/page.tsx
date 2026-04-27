'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Plus, Pencil, Loader2, Building2, Search, PowerOff } from 'lucide-react'
import type { Company } from '@/lib/types'

const emptyForm = {
  name: '',
  cuit: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  is_supplier: false,
  is_client: false,
}

type FormData = typeof emptyForm

export default function CompaniesPage() {
  const [companies, setCompanies]       = useState<Company[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [canEdit, setCanEdit]           = useState(false)
  const [isAdmin, setIsAdmin]           = useState(false)
  const [userId, setUserId]             = useState('')
  const [search, setSearch]             = useState('')
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [saving, setSaving]             = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null)
  const [form, setForm]                 = useState<FormData>(emptyForm)

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', user.id).single()
        const role = profile?.role
        setCanEdit(role === 'operador' || role === 'admin')
        setIsAdmin(role === 'admin')
      }
      await loadCompanies()
    }
    init()
  }, [supabase])

  const loadCompanies = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('companies')
      .select('*')
      .order('name')
    setCompanies(data || [])
    setIsLoading(false)
  }

  const openNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (c: Company) => {
    setEditingId(c.id)
    setForm({
      name:        c.name,
      cuit:        c.cuit        ?? '',
      email:       c.email       ?? '',
      phone:       c.phone       ?? '',
      address:     c.address     ?? '',
      notes:       c.notes       ?? '',
      is_supplier: c.is_supplier,
      is_client:   c.is_client,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      name:        form.name.trim(),
      cuit:        form.cuit.trim()    || null,
      email:       form.email.trim()   || null,
      phone:       form.phone.trim()   || null,
      address:     form.address.trim() || null,
      notes:       form.notes.trim()   || null,
      is_supplier: form.is_supplier,
      is_client:   form.is_client,
    }

    if (editingId) {
      const { data, error } = await supabase
        .from('companies')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingId)
        .select().single()
      if (!error && data) {
        setCompanies(prev => prev.map(c => c.id === editingId ? data : c))
      }
    } else {
      const { data, error } = await supabase
        .from('companies')
        .insert({ ...payload, user_id: userId })
        .select().single()
      if (!error && data) {
        setCompanies(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      }
    }

    setSaving(false)
    setDialogOpen(false)
  }

  const handleToggleActive = async (c: Company) => {
    const { data, error } = await supabase
      .from('companies')
      .update({ is_active: !c.is_active, updated_at: new Date().toISOString() })
      .eq('id', c.id)
      .select().single()
    if (!error && data) {
      setCompanies(prev => prev.map(x => x.id === c.id ? data : x))
    }
    setConfirmToggleId(null)
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.cuit ?? '').includes(search)
  )

  const companyToToggle = companies.find(c => c.id === confirmToggleId)

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes y Proveedores</h1>
          <p className="text-muted-foreground">Empresas vinculadas a recepciones y despachos</p>
        </div>
        {canEdit && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Empresa
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o CUIT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>CUIT</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    {canEdit && <TableHead className="w-[100px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        <Building2 className="mx-auto mb-2 h-6 w-6" />
                        No hay empresas registradas
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(c => (
                    <TableRow key={c.id} className={!c.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="font-mono text-sm">{c.cuit || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {c.email && <div>{c.email}</div>}
                        {c.phone && <div className="text-muted-foreground">{c.phone}</div>}
                        {!c.email && !c.phone && '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {c.is_supplier && <Badge variant="secondary">Proveedor</Badge>}
                          {c.is_client   && <Badge variant="outline">Cliente</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.is_active ? 'default' : 'secondary'}>
                          {c.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => openEdit(c)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => setConfirmToggleId(c.id)}
                                className="text-muted-foreground"
                                title={c.is_active ? 'Desactivar' : 'Activar'}
                              >
                                <PowerOff className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog alta/edición */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) setDialogOpen(false) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Empresa' : 'Nueva Empresa'}</DialogTitle>
            <DialogDescription>
              Una empresa puede ser proveedor, cliente o ambas.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Razón social o nombre comercial"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CUIT</Label>
                <Input
                  value={form.cuit}
                  onChange={e => setForm(p => ({ ...p, cuit: e.target.value }))}
                  placeholder="30-12345678-9"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+54 9 11 0000-0000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="contacto@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Calle 123, Ciudad"
              />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_supplier"
                  checked={form.is_supplier}
                  onCheckedChange={v => setForm(p => ({ ...p, is_supplier: !!v }))}
                />
                <Label htmlFor="is_supplier">Proveedor</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_client"
                  checked={form.is_client}
                  onCheckedChange={v => setForm(p => ({ ...p, is_client: !!v }))}
                />
                <Label htmlFor="is_client">Cliente</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Observaciones adicionales..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? 'Guardar Cambios' : 'Crear Empresa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm toggle active */}
      <AlertDialog open={!!confirmToggleId} onOpenChange={open => !open && setConfirmToggleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {companyToToggle?.is_active ? '¿Desactivar empresa?' : '¿Activar empresa?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {companyToToggle?.is_active
                ? `"${companyToToggle?.name}" no aparecerá en el selector de pesadas.`
                : `"${companyToToggle?.name}" volverá a estar disponible.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => companyToToggle && handleToggleActive(companyToToggle)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
