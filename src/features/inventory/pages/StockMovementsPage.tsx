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
import { formatCurrency } from '@/lib/utils'
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

      <div className="flex-1 overflow-auto rounded-xl border bg-card/50 shadow-sm relative">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground animate-pulse">Loading ledger...</div>
          ) : filteredMovements?.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground bg-card rounded-lg border border-dashed">No movements found.</div>
          ) : (
            paginatedMovements?.map((m) => {
              const isPositive = m.quantity > 0
              const isSale = m.movement_type === 'sale'
              const isPurchase = m.movement_type === 'purchase'
              const isAdjust = m.movement_type.includes('adjust')
              
              let typeColor = "bg-muted text-foreground"
              if (isSale) typeColor = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              if (isPurchase) typeColor = "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
              if (isAdjust) typeColor = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"

              return (
                <div key={m.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl bg-card hover:border-primary/30 transition-colors group relative overflow-hidden">
                  {/* Color Accent Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPositive ? 'bg-success' : 'bg-destructive'} opacity-70`}></div>
                  
                  {/* Header / Date */}
                  <div className="w-full sm:w-32 flex-shrink-0 flex flex-col justify-center pl-2">
                    <span className="text-sm font-medium">{format(new Date(m.created_at), 'MMM dd, yyyy')}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(m.created_at), 'HH:mm')}</span>
                  </div>
                  
                  {/* Main Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate text-base">{(m.products as any)?.name}</span>
                      {(m.products as any)?.sku && (
                        <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">{(m.products as any)?.sku}</Badge>
                      )}
                      <Badge className={`ml-auto sm:ml-0 text-[10px] border-0 ${typeColor} uppercase`}>
                        {m.movement_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {generateHumanReadableLog(m)}
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="w-full sm:w-48 flex-shrink-0 flex sm:flex-col justify-between items-center sm:items-end sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 mt-3 sm:mt-0 border-border">
                    <div className={`flex items-center gap-1.5 text-lg font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                      {isPositive ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                      <span>{Math.abs(m.quantity)}</span>
                    </div>
                    <div className="text-xs font-medium text-muted-foreground mt-1 text-right">
                      <span className="opacity-70">Value: </span>
                      <span className="text-foreground">{formatCurrency(Math.abs(m.quantity) * m.unit_cost, company?.currency || 'DZD')}</span>
                    </div>
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
