import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Search, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { exportToExcel } from '@/lib/export'
import { format } from 'date-fns'

export default function StockMovementsPage() {
  const { t } = useTranslation(['common', 'commerce'])
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})

  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: movements, isLoading } = useQuery({
    queryKey: ['stock_movements', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          products(name, sku),
          product_variants(name),
          profiles:created_by(full_name)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  const filters: FilterConfig[] = [
    {
      key: 'movement_type',
      title: 'Type',
      options: [
        { label: 'Purchase (IN)', value: 'purchase' },
        { label: 'Sale (OUT)', value: 'sale' },
        { label: 'Adjustment (+/-)', value: 'adjustment' },
        { label: 'Count Adjustment', value: 'count_adjustment' },
        { label: 'Transfer', value: 'transfer_in' }
      ]
    },
    {
      key: 'quantity',
      title: 'Quantity (Absolute)',
      type: 'number_range'
    }
  ]

  const filteredMovements = (movements as any[])?.filter(m => {
    const prodName = (m.products as any)?.name?.toLowerCase() || ''
    const sku = (m.products as any)?.sku?.toLowerCase() || ''
    const matchesSearch = prodName.includes(searchTerm.toLowerCase()) ||
      sku.includes(searchTerm.toLowerCase())

    const typeFilter = activeFilters['movement_type']
    const matchesType = typeFilter?.length > 0 ? typeFilter.includes(m.movement_type) : true

    let matchesQuantity = true
    if (activeFilters['quantity']) {
      const { min, max } = activeFilters['quantity']
      const absQty = Math.abs(m.quantity)
      if (min !== undefined && absQty < min) matchesQuantity = false
      if (max !== undefined && absQty > max) matchesQuantity = false
    }

    return matchesSearch && matchesType && matchesQuantity
  })

  const totalCount = filteredMovements?.length || 0
  const paginatedMovements = useMemo(() => {
    if (!filteredMovements) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredMovements.slice(start, end)
  }, [filteredMovements, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  const generateHumanReadableLog = (m: any) => {
    const user = (m.profiles as any)?.full_name || 'System'
    const qty = Math.abs(m.quantity)
    const baseProduct = (m.products as any)?.name || 'Unknown Product'
    const variantName = (m.product_variants as any)?.name
    const product = variantName ? `${baseProduct} - ${variantName}` : baseProduct
    const ref = m.ref_id || m.notes || '-'
    const isPositive = m.quantity > 0

    if (m.movement_type === 'purchase') {
      return t('commerce:inventory.log_purchase', { defaultValue: `[{{user}}] purchased +{{qty}} of [{{product}}] via {{ref}}`, user, qty, product, ref })
    }
    if (m.movement_type === 'sale') {
      return t('commerce:inventory.log_sale', { defaultValue: `Sale removed -{{qty}} of [{{product}}] via {{ref}}`, user: 'Sale', qty, product, ref })
    }
    if (m.movement_type === 'adjustment' || m.movement_type === 'count_adjustment') {
      const sign = isPositive ? '+' : '-'
      return t('commerce:inventory.log_adjust', { defaultValue: `[{{user}}] adjusted {{sign}}{{qty}} of [{{product}}] (Reason: {{ref}})`, user, sign, qty, product, ref })
    }
    if (m.movement_type === 'transfer_in' || m.movement_type === 'transfer_out') {
      const sign = isPositive ? '+' : '-'
      return t('commerce:inventory.log_transfer', { defaultValue: `[{{user}}] transferred {{sign}}{{qty}} of [{{product}}]`, user, sign, qty, product })
    }
    if (m.movement_type === 'initial') {
      return t('commerce:inventory.log_initial', { defaultValue: `[{{user}}] set initial stock of {{qty}} for [{{product}}]`, user, qty, product })
    }

    // Default fallback
    return `${user} did ${m.movement_type} of ${isPositive ? '+' : '-'}${qty} for ${product}`
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('commerce:inventory.logs_title', { defaultValue: 'Stock Logs' })}</h1>
          <p className="text-muted-foreground mt-1">{t('commerce:inventory.logs_subtitle', { defaultValue: 'Detailed ledger of all inventory IN/OUT operations.' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredMovements || [], 'StockLedger')}>
            <Download className="me-2 h-4 w-4" />
            {t('commerce:inventory.export_ledger', { defaultValue: 'Export Ledger' })}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('commerce:inventory.search_logs', { defaultValue: 'Search product or SKU...' })}
            className="ps-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <AdvancedFilter
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={(key, values) => setActiveFilters(prev => ({ ...prev, [key]: values }))}
          onClearAll={() => setActiveFilters({})}
        />
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border bg-card/50 shadow-sm relative flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Stock Interne</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Réf / Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Loading activity...</TableCell>
                </TableRow>
              ) : paginatedMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No stock movements found.</TableCell>
                </TableRow>
              ) : (
                paginatedMovements.map((m: any) => {
                  const isPositive = m.quantity > 0
                  const qtyClass = isPositive ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'
                  const bgClass = isPositive ? 'bg-green-50/50 dark:bg-green-900/5' : 'bg-red-50/50 dark:bg-red-900/5'
                  const user = (m.profiles as any)?.full_name || 'System'
                  const baseProduct = (m.products as any)?.name || 'Unknown Product'
                  const variantName = (m.product_variants as any)?.name
                  const product = variantName ? `${baseProduct} (${variantName})` : baseProduct
                  const ref = m.ref_id || m.notes || '-'
                  
                  return (
                    <TableRow key={m.id} className={`${bgClass} transition-colors`}>
                      <TableCell className="whitespace-nowrap">{format(new Date(m.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="font-medium">{product}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                          {m.movement_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right ${qtyClass}`}>
                        {isPositive ? '+' : ''}{m.quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium text-muted-foreground">
                        {m.qty_after ?? '-'}
                      </TableCell>
                      <TableCell>{user}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={ref}>
                        {ref}
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
    </div>
  )
}
