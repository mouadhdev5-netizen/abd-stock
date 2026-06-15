import { useState, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Filter, TrendingUp, Download, Upload, Barcode, Edit } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx"
import { formatCurrency, formatNumber } from '@/lib/utils'
import { ProductForm } from '../components/ProductForm'
import { ProductVariantsModal } from '../components/ProductVariantsModal'
import { BarcodeViewer } from '@/components/ui/BarcodeViewer'

import { exportToExcel, importFromExcel } from '@/lib/export'
import { FilterOption, AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner'

import { DataTablePagination } from '@/components/ui/DataTablePagination'

export default function ProductsPage() {
  const { t } = useTranslation('common')
  const { company, hasRole } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [filterType, setFilterType] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [variantsModalProduct, setVariantsModalProduct] = useState<{ id: string, name: string } | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Pagination State
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hardware Scanner Integration
  useBarcodeScanner({
    onScan: (barcode) => {
      setSearchTerm(barcode)
      // Play a beep or show a toast could go here
    }
  })

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('v_product_stock')
        .select('*')
        .eq('company_id', company.id)
        .order('name')

      const { data: rawProducts } = await supabase
        .from('products')
        .select('id, has_variants')
        .eq('company_id', company.id)

      const variantMap = (rawProducts || []).reduce((acc: any, p: any) => {
        acc[p.id] = p.has_variants
        return acc
      }, {})

      if (error) throw error

      // Fetch top products to determine break-even status
      const { data: topProducts, error: topError } = await supabase
        .from('v_top_products')
        .select('product_id, total_revenue')
        .eq('company_id', company.id)

      if (topError) throw topError

      const revenueMap = (topProducts as any[]).reduce((acc: Record<string, number>, p) => {
        acc[p.product_id] = p.total_revenue
        return acc
      }, {})

      return (data as any[]).map(p => {
        // Break even: if total revenue exceeds total inventory cost
        const totalCost = (p.total_qty_on_hand + p.total_qty_reserved) * p.avg_cost
        const revenue = revenueMap[p.product_id] || 0
        return {
          ...p,
          isBreakEven: revenue > 0 && revenue >= totalCost,
          has_variants: variantMap[p.product_id] || false
        }
      })
    },
    enabled: !!company?.id,
  })


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">{t('status.active')}</Badge>
      case 'inactive':
        return <Badge variant="secondary">{t('status.inactive')}</Badge>
      case 'discontinued':
        return <Badge variant="destructive">{t('status.discontinued', { defaultValue: 'Discontinued' })}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStockBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge variant="success">{t('labels.in_stock', { defaultValue: 'In Stock' })}</Badge>
      case 'low_stock':
        return <Badge variant="warning">{t('labels.low_stock', { defaultValue: 'Low Stock' })}</Badge>
      case 'out_of_stock':
        return <Badge variant="destructive">{t('labels.out_of_stock', { defaultValue: 'Out of Stock' })}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filters: FilterConfig[] = [
    {
      key: 'status',
      title: 'Stock Status',
      options: [
        { label: 'Low Stock', value: 'low_stock' },
        { label: 'Out of Stock', value: 'out_of_stock' }
      ]
    },
    {
      key: 'profitability',
      title: 'Profitability',
      options: [
        { label: 'Break Even', value: 'break_even' }
      ]
    },
    {
      key: 'price',
      title: 'Sell Price',
      type: 'number_range'
    },
    {
      key: 'cost',
      title: 'Cost Price',
      type: 'number_range'
    }
  ]

  // Filtering
  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))

    let matchesStatus = true
    let matchesProfit = true
    let matchesPrice = true
    let matchesCost = true

    if (activeFilters['status']?.length > 0) {
      if (activeFilters['status'].includes('out_of_stock')) {
        matchesStatus = p.stock_levels?.[0]?.quantity === 0
      } else if (activeFilters['status'].includes('low_stock')) {
        matchesStatus = (p.stock_levels?.[0]?.quantity || 0) <= p.reorder_level && (p.stock_levels?.[0]?.quantity || 0) > 0
      }
    }

    if (activeFilters['profitability']?.includes('break_even')) {
      matchesProfit = p.sell_price === p.cost_price
    }

    if (activeFilters['price']) {
      const { min, max } = activeFilters['price']
      if (min !== undefined && p.sell_price < min) matchesPrice = false
      if (max !== undefined && p.sell_price > max) matchesPrice = false
    }

    if (activeFilters['cost']) {
      const { min, max } = activeFilters['cost']
      if (min !== undefined && p.cost_price < min) matchesCost = false
      if (max !== undefined && p.cost_price > max) matchesCost = false
    }

    return matchesSearch && matchesStatus && matchesProfit && matchesPrice && matchesCost
  })

  // Calculate paginated products
  const totalCount = filteredProducts?.length || 0
  const paginatedProducts = useMemo(() => {
    if (!filteredProducts) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredProducts.slice(start, end)
  }, [filteredProducts, pageIndex, pageSize])

  // Reset page when filters change
  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, filterType, activeFilters])

  // --- Import Logic ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !company?.id) return
    setIsImporting(true)
    try {
      const { parseExcelFile } = await import('@/lib/import')
      const data = await parseExcelFile(e.target.files[0])
      const formattedData = data.map(row => ({
        company_id: company.id,
        name: row.Name || row.name,
        sku: row.SKU || row.sku || '',
        barcode: row.Barcode || row.barcode || '',
        sell_price: parseFloat(row.SellPrice || row.sell_price || row.Price || 0),
        cost_price: parseFloat(row.CostPrice || row.cost_price || 0),
        status: 'active'
      }))

      if (formattedData.length > 0) {
        // @ts-expect-error type inference
        const { error } = await supabase.from('products').insert(formattedData)
        if (error) throw error
        alert(`Successfully imported ${formattedData.length} products!`)
        refetch() // Instead of window.location.reload()
      }
    } catch (err) {
      console.error('Import failed:', err)
      alert('Failed to import products. Ensure the excel columns match Name, SKU, Barcode, SellPrice, CostPrice.')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.products')}</h1>
          <p className="text-muted-foreground mt-1">{t('labels.products_subtitle', { defaultValue: 'Manage inventory, variants, and stock alerts.' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={handleImport}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
            <Upload className="mr-2 h-4 w-4" />
            {t('actions.import')}
          </Button>
          <Button variant="outline" onClick={() => exportToExcel(filteredProducts || [], 'Products')}>
            <Download className="mr-2 h-4 w-4" />
            {t('actions.export')}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => setSelectedProduct(null)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('actions.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{selectedProduct ? t('actions.edit') : t('actions.add')}</DialogTitle>
              <DialogDescription>
                {selectedProduct ? t('labels.update_product', { defaultValue: 'Update product details.' }) : t('labels.add_product_desc', { defaultValue: 'Fill in the details to create a new product.' })}
              </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-auto py-4">
                <ProductForm
                  initialData={selectedProduct}
                  onSuccess={() => {
                    setIsDialogOpen(false)
                    refetch()
                  }}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('labels.search_placeholder')}
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <AdvancedFilter
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={(key, values) => setActiveFilters(prev => ({ ...prev, [key]: values }))}
            onClearAll={() => setActiveFilters({})}
          />
        </div>
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>{t('labels.code', { defaultValue: 'SKU' })}</TableHead>
                <TableHead>{t('labels.name')}</TableHead>
                <TableHead>{t('labels.category', { defaultValue: 'Category' })}</TableHead>
                <TableHead className="text-right">{t('labels.price')}</TableHead>
                <TableHead className="text-right">{t('labels.quantity')}</TableHead>
                <TableHead>{t('labels.status')}</TableHead>
                <TableHead>{t('labels.stock', { defaultValue: 'Stock' })}</TableHead>
                <TableHead className="text-right">{t('labels.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    {t('labels.loading', { ns: 'common' })}
                  </TableCell>
                </TableRow>
              ) : filteredProducts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    {t('labels.no_data', { ns: 'common' })}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts?.map((product) => (
                  <TableRow key={product.product_id}>
                    <TableCell className="font-medium">{product.sku || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <div className="h-10 w-10 rounded-md border overflow-hidden bg-muted flex-shrink-0">
                            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground text-xs">
                            No Img
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium">{product.name}</span>
                          <div className="flex items-center gap-1 mt-1">
                            {product.isBreakEven && (
                              <Badge variant="outline" className="w-fit border-green-500/50 text-green-600 bg-green-50 dark:bg-green-950/20" title="Revenue has covered inventory costs!">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                ROI+
                              </Badge>
                            )}
                            {product.has_variants && (
                              <Badge
                                variant="secondary"
                                className="w-fit cursor-pointer hover:bg-secondary/80"
                                onClick={() => setVariantsModalProduct({ id: product.product_id, name: product.name })}
                              >
                                View Variants
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.category_name || '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.sell_price, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(product.total_qty_on_hand)}
                    </TableCell>
                    <TableCell>{getStatusBadge(product.status)}</TableCell>
                    <TableCell>{getStockBadge(product.stock_status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {product.barcode && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="View Barcode">
                                <Barcode className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogTitle>Product Barcode</DialogTitle>
                              <BarcodeViewer
                                value={product.barcode}
                                type="CODE128"
                                title={`${product.name} (${product.sku})`}
                              />
                            </DialogContent>
                          </Dialog>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => {
                          setSelectedProduct(product)
                          setIsDialogOpen(true)
                        }}>
                          <Edit className="h-4 w-4" />
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

      <ProductVariantsModal
        isOpen={!!variantsModalProduct}
        onClose={() => setVariantsModalProduct(null)}
        productId={variantsModalProduct?.id || null}
        productName={variantsModalProduct?.name || ''}
      />
    </div>
  )
}
