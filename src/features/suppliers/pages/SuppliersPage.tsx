import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Download, Pencil, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import { exportToExcel } from '@/lib/export'
import { SupplierForm } from '../components/SupplierForm'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

type Filter = 'all' | 'active' | 'inactive' | 'balance'

export default function SuppliersPage() {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any>(null)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', company.id)
        .order('name')
      if (error) throw error
      return data as any[]
    },
    enabled: !!company?.id,
  })

  const filteredSuppliers = useMemo(() => {
    if (!suppliers) return []
    return suppliers.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.contact_name && s.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))

      let matchesFilter = true
      if (filter === 'active') matchesFilter = !!s.is_active
      if (filter === 'inactive') matchesFilter = !s.is_active
      if (filter === 'balance') matchesFilter = Number(s.current_balance) > 0

      return matchesSearch && matchesFilter
    })
  }, [suppliers, searchTerm, filter])

  const totalCount = filteredSuppliers.length
  const paginatedSuppliers = useMemo(() => {
    const start = pageIndex * pageSize
    return filteredSuppliers.slice(start, start + pageSize)
  }, [filteredSuppliers, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, filter])

  const handleToggleStatus = async (supplier: any) => {
    setTogglingId(supplier.id)
    const newStatus = !supplier.is_active

    // Optimistic update
    queryClient.setQueryData(['suppliers', company?.id], (old: any[]) =>
      old.map(s => s.id === supplier.id ? { ...s, is_active: newStatus } : s)
    )

    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ is_active: newStatus } as never)
        .eq('id', supplier.id)
      if (error) throw error
    } catch {
      // Revert
      queryClient.setQueryData(['suppliers', company?.id], (old: any[]) =>
        old.map(s => s.id === supplier.id ? { ...s, is_active: !newStatus } : s)
      )
    } finally {
      setTogglingId(null)
    }
  }

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingSupplier(null)
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers', company?.id] })
    handleFormClose()
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('production:suppliers.title', { defaultValue: 'Suppliers' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('production:suppliers.subtitle', { defaultValue: 'Manage your vendors and track outstanding balances.' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredSuppliers, 'Suppliers')}>
            <Download className="me-2 h-4 w-4" />
            {t('actions.export', { ns: 'common', defaultValue: 'Export' })}
          </Button>
          <Button onClick={() => { setEditingSupplier(null); setIsFormOpen(true) }}>
            <Plus className="me-2 h-4 w-4" />
            {t('production:suppliers.add_supplier', { defaultValue: 'Add Supplier' })}
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('production:suppliers.search_placeholder', { defaultValue: 'Search by name or contact...' })}
            className="ps-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex bg-muted/50 p-1 rounded-md border text-sm overflow-x-auto">
          {(['all', 'active', 'inactive', 'balance'] as Filter[]).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className="h-8 whitespace-nowrap capitalize"
            >
              {f === 'all'
                ? t('labels.all', { ns: 'common', defaultValue: 'All' })
                : f === 'active'
                ? t('status.active', { ns: 'common', defaultValue: 'Active' })
                : f === 'inactive'
                ? t('status.inactive', { ns: 'common', defaultValue: 'Inactive' })
                : t('production:suppliers.has_balance', { defaultValue: 'Has Balance' })}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>{t('production:suppliers.name', { defaultValue: 'Supplier Name' })}</TableHead>
                <TableHead>{t('production:suppliers.contact_name', { defaultValue: 'Contact Person' })}</TableHead>
                <TableHead>{t('labels.phone', { ns: 'common', defaultValue: 'Phone' })}</TableHead>
                <TableHead className="text-end">{t('production:suppliers.balance_due', { defaultValue: 'Balance Due' })}</TableHead>
                <TableHead className="text-center">{t('labels.status', { ns: 'common', defaultValue: 'Status' })}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginatedSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    {t('labels.no_data', { ns: 'common', defaultValue: 'No suppliers found.' })}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.contact_name || '-'}</TableCell>
                    <TableCell className="text-sm">{supplier.phone || supplier.mobile || '-'}</TableCell>
                    <TableCell className="text-end font-medium">
                      {Number(supplier.current_balance) > 0 ? (
                        <span className="text-destructive font-bold">
                          {formatCurrency(supplier.current_balance, company?.currency || 'DZD')}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={!!supplier.is_active}
                          onCheckedChange={() => handleToggleStatus(supplier)}
                          disabled={togglingId === supplier.id}
                        />
                        <Badge variant={supplier.is_active ? 'success' : 'secondary'} className="hidden sm:flex">
                          {supplier.is_active
                            ? t('status.active', { ns: 'common', defaultValue: 'Active' })
                            : t('status.inactive', { ns: 'common', defaultValue: 'Inactive' })}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(supplier)}
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t bg-muted/20 flex-shrink-0">
          <DataTablePagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
          />
        </div>
      </div>

      <SupplierForm
        initialData={editingSupplier}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
