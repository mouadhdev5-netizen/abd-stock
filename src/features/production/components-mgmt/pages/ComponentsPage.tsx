import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Download, Pencil, Loader2, AlertTriangle } from 'lucide-react'
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
import { ComponentForm } from '../components/ComponentForm'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

type Filter = 'all' | 'low_stock' | 'inactive'

export default function ComponentsPage() {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingComponent, setEditingComponent] = useState<any>(null)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: components, isLoading } = useQuery({
    queryKey: ['components', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('company_id', company.id)
        .order('name')
      if (error) throw error
      return data as any[]
    },
    enabled: !!company?.id,
  })

  const filteredComponents = useMemo(() => {
    if (!components) return []
    return components.filter(c => {
      const sTerm = searchTerm.toLowerCase()
      const matchesSearch =
        c.name.toLowerCase().includes(sTerm) ||
        (c.name_ar && c.name_ar.toLowerCase().includes(sTerm)) ||
        (c.name_fr && c.name_fr.toLowerCase().includes(sTerm))

      let matchesFilter = true
      if (filter === 'low_stock') {
        matchesFilter = Number(c.quantity_in_stock) <= Number(c.reorder_level) * 2
      }
      if (filter === 'inactive') {
        matchesFilter = c.status === 'inactive'
      }

      return matchesSearch && matchesFilter
    })
  }, [components, searchTerm, filter])

  const totalCount = filteredComponents.length
  const paginatedComponents = useMemo(() => {
    const start = pageIndex * pageSize
    return filteredComponents.slice(start, start + pageSize)
  }, [filteredComponents, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, filter])

  const handleToggleStatus = async (component: any) => {
    setTogglingId(component.id)
    const newStatus = component.status === 'active' ? 'inactive' : 'active'

    // Optimistic update
    queryClient.setQueryData(['components', company?.id], (old: any[]) =>
      old.map(c => c.id === component.id ? { ...c, status: newStatus } : c)
    )

    try {
      const { error } = await supabase
        .from('components')
        .update({ status: newStatus } as never)
        .eq('id', component.id)
      if (error) throw error
    } catch {
      // Revert
      queryClient.setQueryData(['components', company?.id], (old: any[]) =>
        old.map(c => c.id === component.id ? { ...c, status: component.status } : c)
      )
    } finally {
      setTogglingId(null)
    }
  }

  const handleEdit = (component: any) => {
    setEditingComponent(component)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingComponent(null)
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['components', company?.id] })
    handleFormClose()
  }

  const getStockColor = (stock: number, reorder: number) => {
    if (reorder > 0) {
      if (stock <= reorder) return 'text-red-500 font-bold'
      if (stock <= reorder * 2) return 'text-yellow-600 font-medium dark:text-yellow-400'
    }
    return ''
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-purple-700 dark:text-purple-400">
            {t('production:components.title', { defaultValue: 'Components' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('production:components.subtitle', { defaultValue: 'Manage raw materials and stock levels.' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredComponents, 'Components')}>
            <Download className="me-2 h-4 w-4" />
            {t('actions.export', { ns: 'common', defaultValue: 'Export' })}
          </Button>
          <Button onClick={() => { setEditingComponent(null); setIsFormOpen(true) }} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="me-2 h-4 w-4" />
            {t('production:components.add', { defaultValue: 'Add Component' })}
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('production:components.search_placeholder', { defaultValue: 'Search by name...' })}
            className="ps-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex bg-muted/50 p-1 rounded-md border text-sm overflow-x-auto">
          {(['all', 'low_stock', 'inactive'] as Filter[]).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
              className="h-8 whitespace-nowrap capitalize"
            >
              {f === 'all'
                ? t('labels.all', { ns: 'common', defaultValue: 'All' })
                : f === 'low_stock'
                ? (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                    {t('production:components.low_stock', { defaultValue: 'Low Stock' })}
                  </span>
                )
                : t('status.inactive', { ns: 'common', defaultValue: 'Inactive' })}
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
                <TableHead>{t('production:components.name', { defaultValue: 'Name' })}</TableHead>
                <TableHead>{t('production:components.unit', { defaultValue: 'Unit' })}</TableHead>
                <TableHead className="text-end">{t('production:components.cost_price', { defaultValue: 'Cost per Unit' })}</TableHead>
                <TableHead className="text-end">{t('production:components.quantity', { defaultValue: 'Stock' })}</TableHead>
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
              ) : paginatedComponents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    {t('labels.no_data', { ns: 'common', defaultValue: 'No components found.' })}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedComponents.map((c) => {
                  const stock = Number(c.quantity_in_stock)
                  const reorder = Number(c.reorder_level)
                  const stockColorClass = getStockColor(stock, reorder)

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div>{c.name}</div>
                        {(c.name_ar || c.name_fr) && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {c.name_ar && <span>{c.name_ar}</span>}
                            {c.name_ar && c.name_fr && <span className="mx-1">•</span>}
                            {c.name_fr && <span>{c.name_fr}</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.unit}</Badge>
                      </TableCell>
                      <TableCell className="text-end">
                        {formatCurrency(c.cost_price, company?.currency || 'DZD')}
                      </TableCell>
                      <TableCell className="text-end">
                        <span className={stockColorClass}>
                          {stock.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                        </span>
                        {reorder > 0 && stock <= reorder && (
                          <AlertTriangle className="inline-block ms-2 h-4 w-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={c.status === 'active'}
                            onCheckedChange={() => handleToggleStatus(c)}
                            disabled={togglingId === c.id}
                          />
                          <Badge variant={c.status === 'active' ? 'success' : 'secondary'} className="hidden sm:flex">
                            {c.status === 'active'
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
                          onClick={() => handleEdit(c)}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
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

      <ComponentForm
        initialData={editingComponent}
        isOpen={isFormOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}
