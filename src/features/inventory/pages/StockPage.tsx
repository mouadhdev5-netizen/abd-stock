import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, SlidersHorizontal, Settings2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import { InlineSearch } from '@/components/ui/InlineSearch'
import { StockAdjustDialog } from '../components/StockAdjustDialog'

export default function StockPage() {
  const { t } = useTranslation(['commerce', 'common'])
  const { company } = useAuthStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')

  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)

  // Adjust Dialog state
  const [adjustTarget, setAdjustTarget] = useState<{ product: any, variant?: any } | null>(null)

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['stock_products', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('v_product_variants_stock')
        .select('*')
        .eq('company_id', company.id)
        .order('full_name')

      if (error) throw error
      return data || []
    },
    enabled: !!company?.id,
  })

  const filteredProducts = useMemo(() => {
    return products?.filter((p: any) => {
      const nameStr = p.full_name || p.name || ''
      const matchSearch = nameStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))

      let matchFilter = true
      if (filter === 'low') {
        matchFilter = p.total_qty_on_hand > 0 && p.total_qty_on_hand <= (p.reorder_level || 5)
      } else if (filter === 'out') {
        matchFilter = p.total_qty_on_hand <= 0
      }

      return matchSearch && matchFilter
    }) || []
  }, [products, searchTerm, filter])

  const totalCount = filteredProducts.length
  const paginatedProducts = useMemo(() => {
    const start = pageIndex * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, pageIndex, pageSize])

  const toggleVariants = (id: string) => {
    if (expandedProductId === id) {
      setExpandedProductId(null)
    } else {
      setExpandedProductId(id)
    }
  }

  const getStockBadge = (qty: number, reorder: number = 5) => {
    if (qty <= 0) return <Badge variant="destructive">{t('commerce:inventory.out_of_stock', { defaultValue: 'Out of Stock' })}</Badge>
    if (qty <= reorder) return <Badge variant="warning" className="bg-yellow-500 hover:bg-yellow-600">{t('commerce:inventory.low_stock', { defaultValue: 'Low Stock' })}</Badge>
    return <Badge variant="success">{t('commerce:inventory.in_stock', { defaultValue: 'In Stock' })}</Badge>
  }

  const getQtyColorClass = (qty: number, reorder: number = 5) => {
    if (qty <= reorder) return 'text-destructive font-bold'
    if (qty <= reorder * 2) return 'text-yellow-600 font-semibold dark:text-yellow-500'
    return 'text-green-600 font-semibold dark:text-green-500'
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('commerce:inventory.stock_title', { defaultValue: 'Stock Management' })}</h1>
          <p className="text-muted-foreground mt-1">{t('commerce:inventory.stock_subtitle', { defaultValue: 'View and adjust inventory levels across your catalog.' })}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
        <div className="w-full sm:max-w-sm">
          <InlineSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t('commerce:inventory.search_stock', { defaultValue: 'Search by product name or SKU...' })}
          />
        </div>

        <div className="flex bg-muted/50 p-1 rounded-md border">
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            {t('commerce:inventory.all_stock', { defaultValue: 'All Stock' })}
          </Button>
          <Button
            variant={filter === 'low' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('low')}
          >
            {t('commerce:inventory.low_stock', { defaultValue: 'Low Stock' })}
          </Button>
          <Button
            variant={filter === 'out' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('out')}
          >
            {t('commerce:inventory.out_of_stock', { defaultValue: 'Out of Stock' })}
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>{t('commerce:products.product_name', { defaultValue: 'Product Name' })}</TableHead>
                <TableHead className="text-end">{t('commerce:inventory.unit_cost', { defaultValue: 'Unit Cost' })}</TableHead>
                <TableHead className="text-end">{t('commerce:inventory.qty_on_hand', { defaultValue: 'Qty On Hand' })}</TableHead>
                <TableHead className="text-center">{t('commerce:inventory.status', { defaultValue: 'Stock Status' })}</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">Loading inventory...</TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">No products found matching your criteria.</TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product: any) => (
                  <TableRow key={product.variant_id ? `${product.product_id}-${product.variant_id}` : product.product_id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-base">{product.full_name}</div>
                      {product.sku && <div className="text-sm text-muted-foreground font-mono">{product.sku}</div>}
                    </TableCell>
                    <TableCell className="text-end text-muted-foreground font-mono">
                      {formatCurrency(product.cost_price, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell className={`text-end font-semibold text-base ${getQtyColorClass(product.total_qty_on_hand, product.reorder_level)}`}>
                      {formatNumber(product.total_qty_on_hand)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStockBadge(product.total_qty_on_hand, product.reorder_level)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => setAdjustTarget({ product, variant: product.is_variant ? product : undefined })}
                        >
                          <Settings2 className="h-4 w-4 me-1" />
                          <span className="hidden sm:inline">{t('commerce:inventory.adjust', { defaultValue: 'Adjust' })}</span>
                        </Button>
                      </div>
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

      {adjustTarget && (
        <StockAdjustDialog
          isOpen={!!adjustTarget}
          product={adjustTarget.product}
          variant={adjustTarget.variant}
          onClose={() => setAdjustTarget(null)}
          onSuccess={() => {
            setAdjustTarget(null)
            refetch()
          }}
        />
      )}
    </div>
  )
}
