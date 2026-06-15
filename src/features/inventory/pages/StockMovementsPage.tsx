import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, Search, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToExcel } from '@/lib/export'

export default function StockMovementsPage() {
  const { t } = useTranslation(['common'])
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
          products(name, sku)
        `)
        .eq('company_id', company.id)
        .order('transaction_date', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  const filters: FilterConfig[] = [
    {
      key: 'transaction_type',
      title: 'Type',
      options: [
        { label: 'Purchase (IN)', value: 'purchase' },
        { label: 'Sale (OUT)', value: 'sale' },
        { label: 'Adjustment (+/-)', value: 'adjustment' },
        { label: 'Transfer', value: 'transfer' },
        { label: 'Return', value: 'return' }
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
    
    const typeFilter = activeFilters['transaction_type']
    const matchesType = typeFilter?.length > 0 ? typeFilter.includes(m.transaction_type) : true

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

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Movements</h1>
          <p className="text-muted-foreground mt-1">Detailed ledger of all inventory IN/OUT operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredMovements || [], 'StockLedger')}>
            <Download className="mr-2 h-4 w-4" />
            Export Ledger
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search product or SKU..."
            className="pl-8 w-full"
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

      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">Loading ledger...</TableCell>
                </TableRow>
              ) : filteredMovements?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">No movements found.</TableCell>
                </TableRow>
              ) : (
                paginatedMovements?.map((m) => {
                  const isPositive = m.quantity > 0
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{formatDate(m.transaction_date)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{(m.products as any)?.name}</div>
                        <div className="text-xs text-muted-foreground">{(m.products as any)?.sku}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-xs">{m.transaction_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`flex items-center justify-end gap-1 font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                          {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                          {Math.abs(m.quantity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(m.unit_cost, company?.currency || 'DZD')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Math.abs(m.quantity) * m.unit_cost, company?.currency || 'DZD')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.reference_id || '-'}</TableCell>
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
