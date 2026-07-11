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

      <div className="flex-1 overflow-auto rounded-xl border bg-card/50 shadow-sm relative flex flex-col">
        <div className="overflow-auto flex-1 p-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">Loading activity...</div>
          ) : paginatedMovements.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No stock movements found.</div>
          ) : (
            paginatedMovements.map((m: any) => {
              const isPositive = m.quantity > 0
              const qtyClass = isPositive ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'
              const bgClass = isPositive ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30'
              const icon = isPositive ? <ArrowUpRight className="h-5 w-5 text-green-600" /> : <ArrowDownRight className="h-5 w-5 text-red-600" />
              const user = (m.profiles as any)?.full_name || 'System'
              const baseProduct = (m.products as any)?.name || 'Unknown Product'
              const variantName = (m.product_variants as any)?.name
              const product = variantName ? `${baseProduct} (${variantName})` : baseProduct
              const ref = m.ref_id || m.notes
              
              let actionWord = isPositive ? 'added' : 'removed'
              if (m.movement_type === 'sale') actionWord = 'sold'
              if (m.movement_type === 'purchase') actionWord = 'received from purchase'
              if (m.movement_type === 'return') actionWord = 'returned'

              return (
                <div key={m.id} className={`flex items-start gap-4 p-4 rounded-lg border ${bgClass}`}>
                  <div className="mt-1 bg-background p-2 rounded-full border shadow-sm">
                    {icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-base text-foreground">
                      <span className="font-semibold">{user}</span> {actionWord}{' '}
                      <span className={qtyClass}>{Math.abs(m.quantity)} units</span> of{' '}
                      <span className="font-semibold">{product}</span>.
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{format(new Date(m.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      <span>•</span>
                      <span className="uppercase text-xs tracking-wider font-semibold opacity-70">
                        {m.movement_type.replace('_', ' ')}
                      </span>
                    </div>
                    {ref && (
                      <p className="text-sm text-muted-foreground mt-2 italic bg-background/50 inline-block px-2 py-1 rounded">
                        " {ref} "
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
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
