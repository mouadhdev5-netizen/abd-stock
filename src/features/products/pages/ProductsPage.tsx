import React, { useState, useRef, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Download, Upload, Barcode, Edit, ChevronDown, ChevronUp, MoreHorizontal, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

import { Button } from '@/components/ui/button'
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
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatNumber } from '@/lib/utils'
import { ProductForm } from '../components/ProductForm'
import { ProductVariantRow } from '../components/ProductVariantRow'
import { BarcodeViewer } from '@/components/ui/BarcodeViewer'
import { exportToExcel } from '@/lib/export'
import { InlineSearch } from '@/components/ui/InlineSearch'
import { StatusToggle } from '@/components/ui/StatusToggle'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

export default function ProductsPage() {
  const { t } = useTranslation('commerce')
  const { company } = useAuthStore()
  const currency = company?.currency || 'DZD'
  const queryClient = useQueryClient()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all')
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [expandedVariants, setExpandedVariants] = useState<any[]>([])
  const [isLoadingVariants, setIsLoadingVariants] = useState(false)
  
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pagination
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  // ─── Query Products ──────────────────────────────────────────────────────────
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('v_product_stock')
        .select('*')
        .eq('company_id', company.id)
        .order('name')

      if (error) throw error
      
      const { data: rawProducts } = await supabase
        .from('products')
        .select('id, has_variants, name_ar, name_fr, status')
        .eq('company_id', company.id)

      const productMap = (rawProducts || []).reduce((acc: any, p: any) => {
        acc[p.id] = p
        return acc
      }, {})

      return (data as any[]).map(p => ({
        ...p,
        has_variants: productMap[p.product_id]?.has_variants || false,
        name_ar: productMap[p.product_id]?.name_ar || '',
        name_fr: productMap[p.product_id]?.name_fr || '',
        status: productMap[p.product_id]?.status || 'active',
      }))
    },
    enabled: !!company?.id,
  })

  // ─── Load Variants Inline ───────────────────────────────────────────────────
  const toggleVariants = async (productId: string) => {
    if (expandedProductId === productId) {
      setExpandedProductId(null)
      return
    }
    
    setExpandedProductId(productId)
    setIsLoadingVariants(true)
    
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('name')
        
      if (error) throw error
      setExpandedVariants(data || [])
    } catch (err: any) {
      console.error(err)
      alert('Failed to load variants')
    } finally {
      setIsLoadingVariants(false)
    }
  }

  // ─── Filters ─────────────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!products) return []
    return products.filter(p => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchName = p.name?.toLowerCase().includes(q)
        const matchSKU = p.sku?.toLowerCase().includes(q)
        const matchBarcode = p.barcode?.toLowerCase().includes(q)
        if (!matchName && !matchSKU && !matchBarcode) return false
      }
      
      // Status
      if (statusFilter !== 'all') {
        if (p.status !== statusFilter) return false
      }
      
      // Stock
      if (stockFilter === 'out_of_stock') {
        if (p.total_qty_on_hand > 0) return false
      } else if (stockFilter === 'low_stock') {
        if (p.total_qty_on_hand === 0 || p.total_qty_on_hand > (p.reorder_level || 5)) return false
      }
      
      return true
    })
  }, [products, searchTerm, statusFilter, stockFilter])

  const totalCount = filteredProducts.length
  const paginatedProducts = useMemo(() => {
    const start = pageIndex * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, statusFilter, stockFilter])

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleStatusToggle = async (productId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus } as never)
        .eq('id', productId)
      if (error) throw error
      
      alert(t('products.status_updated', { defaultValue: 'Status updated' }))
      refetch()
    } catch (err) {
      alert(t('common.error', { defaultValue: 'An error occurred' }))
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm(t('products.delete_confirm_hard', { defaultValue: 'Are you sure you want to permanently delete this product? This action cannot be undone.' }))) return
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        
      if (error) {
        if (error.code === '23503') { // Foreign key violation
          throw new Error('This product cannot be deleted because it is already used in a sales order, purchase order, or other records.')
        }
        throw error
      }
      
      queryClient.invalidateQueries({ queryKey: ['products'] })
    } catch (err: any) {
      alert(`Failed to delete product: ${err.message}`)
    }
  }
  
  const handleVariantStatusToggle = async (variantId: string, newStatus: string) => {
    try {
      const newIsActive = newStatus === 'active'
      const { error } = await supabase
        .from('product_variants')
        .update({ is_active: newIsActive } as never)
        .eq('id', variantId)
      if (error) throw error
      
      setExpandedVariants(prev => prev.map(v => v.id === variantId ? { ...v, is_active: newIsActive } : v))
    } catch (err: any) {
      alert(err.message || 'An error occurred')
    }
  }

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
        const { error } = await supabase.from('products').insert(formattedData as any)
        if (error) throw error
        alert(`Imported ${formattedData.length} products`)
        refetch()
      }
    } catch (err) {
      alert('Failed to import products')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleEditClick = async (product: any) => {
    // If it has variants, fetch them so the form has them
    let fullProduct = { ...product }
    
    if (product.has_variants) {
      const { data } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.product_id)
      fullProduct.variants = data || []
    }
    
    setSelectedProduct({ ...fullProduct, id: product.product_id, image_url: product.thumbnail_url })
    setIsDialogOpen(true)
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('products.title', { defaultValue: 'Products' })}</h1>
          <p className="text-sm text-muted-foreground">{t('products.subtitle', { defaultValue: 'Manage your product catalog' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={handleImport}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                <Upload className="me-2 h-4 w-4" />
                {t('common.import', { defaultValue: 'Import' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel(filteredProducts || [], 'Products')}>
                <Download className="me-2 h-4 w-4" />
                {t('common.export', { defaultValue: 'Export' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => {
            setSelectedProduct(null)
            setIsDialogOpen(true)
          }}>
            <Plus className="me-2 h-4 w-4" />
            {t('products.add_product', { defaultValue: 'Add Product' })}
          </Button>

          {/* ADD/EDIT MODAL */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>{selectedProduct ? t('products.edit_product', { defaultValue: 'Edit Product' }) : t('products.add_product', { defaultValue: 'Add Product' })}</DialogTitle>
              </DialogHeader>
              <ProductForm
                initialData={selectedProduct}
                onSuccess={() => {
                  setIsDialogOpen(false)
                  queryClient.invalidateQueries({ queryKey: ['products'] })
                  if (expandedProductId) {
                    toggleVariants(expandedProductId) // reload variants if expanded
                    toggleVariants(expandedProductId) 
                  }
                }}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
        <div className="w-full sm:max-w-md">
          <InlineSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder={t('products.search', { defaultValue: 'Search name or SKU...' })}
            onBarcodeScan={(code) => setSearchTerm(code)}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Status Filters */}
          <div className="flex items-center rounded-md border bg-muted/20 p-1">
            <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-xs rounded-sm ${statusFilter === 'all' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>All</button>
            <button onClick={() => setStatusFilter('active')} className={`px-3 py-1 text-xs rounded-sm ${statusFilter === 'active' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>{t('products.active', { defaultValue: 'Active' })}</button>
            <button onClick={() => setStatusFilter('inactive')} className={`px-3 py-1 text-xs rounded-sm ${statusFilter === 'inactive' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>{t('products.inactive', { defaultValue: 'Inactive' })}</button>
          </div>
          {/* Stock Filters */}
          <div className="flex items-center rounded-md border bg-muted/20 p-1">
            <button onClick={() => setStockFilter('all')} className={`px-3 py-1 text-xs rounded-sm ${stockFilter === 'all' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>All Stock</button>
            <button onClick={() => setStockFilter('low_stock')} className={`px-3 py-1 text-xs rounded-sm ${stockFilter === 'low_stock' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>Low Stock</button>
            <button onClick={() => setStockFilter('out_of_stock')} className={`px-3 py-1 text-xs rounded-sm ${stockFilter === 'out_of_stock' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>Out of Stock</button>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 border-b">
              <TableRow>
                <TableHead className="w-[60px]"></TableHead>
                <TableHead>{t('products.name', { defaultValue: 'Product Name' })}</TableHead>
                <TableHead>{t('products.sku', { defaultValue: 'SKU' })}</TableHead>
                <TableHead className="text-end">{t('products.sell_price', { defaultValue: 'Sell Price' })}</TableHead>
                <TableHead className="text-end">{t('products.cost_price', { defaultValue: 'Cost Price' })}</TableHead>
                <TableHead className="text-end">{t('products.stock', { defaultValue: 'Stock' })}</TableHead>
                <TableHead className="text-center">{t('products.status', { defaultValue: 'Status' })}</TableHead>
                <TableHead className="text-end w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    {t('common.loading', { defaultValue: 'Loading...' })}
                  </TableCell>
                </TableRow>
              ) : paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    {t('common.no_data', { defaultValue: 'No products found' })}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <React.Fragment key={product.product_id}>
                    <TableRow className={expandedProductId === product.product_id ? 'bg-muted/10' : ''}>
                      <TableCell>
                        {product.thumbnail_url ? (
                          <img src={product.thumbnail_url} alt="" className="w-10 h-10 rounded-md object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded-md border bg-muted flex items-center justify-center text-[10px] text-muted-foreground">Img</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        {(product.name_ar || product.name_fr) && (
                          <div className="text-[11px] text-muted-foreground flex gap-2 mt-0.5">
                            {product.name_fr && <span>{product.name_fr}</span>}
                            {product.name_ar && <span dir="rtl">{product.name_ar}</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {product.sku || '-'}
                        {product.barcode && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Barcode className="h-4 w-4 ms-2 inline cursor-pointer text-muted-foreground hover:text-foreground" />
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogTitle>{product.name} Barcode</DialogTitle>
                              <BarcodeViewer value={product.barcode} type="CODE128" />
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                      <TableCell className="text-end font-medium text-primary">
                        {formatCurrency(product.sell_price, currency)}
                      </TableCell>
                      <TableCell className="text-end text-muted-foreground text-sm">
                        {formatCurrency(product.cost_price, currency)}
                      </TableCell>
                      <TableCell className="text-end">
                        <span className={`font-semibold ${product.total_qty_on_hand <= (product.reorder_level || 5) ? 'text-destructive' : ''}`}>
                          {formatNumber(product.total_qty_on_hand)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusToggle 
                          checked={product.status === 'active'} 
                          onToggle={() => handleStatusToggle(product.product_id, product.status === 'active' ? 'inactive' : 'active')} 
                        />
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProduct(product.product_id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {product.has_variants ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleVariants(product.product_id)}>
                              {expandedProductId === product.product_id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          ) : <div className="w-8" />}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Inline Variants */}
                    {expandedProductId === product.product_id && (
                      <TableRow className="bg-muted/5 border-b-2 border-primary/20">
                        <TableCell colSpan={8} className="p-0">
                          <div className="pl-[60px] pe-4 py-2">
                            <div className="rounded-lg border bg-background shadow-inner overflow-hidden">
                              {isLoadingVariants ? (
                                <div className="p-4 text-sm text-muted-foreground text-center animate-pulse">Loading variants...</div>
                              ) : expandedVariants.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground text-center">No variants found.</div>
                              ) : (
                                <div>
                                  {expandedVariants.map(variant => (
                                    <ProductVariantRow 
                                      key={variant.id} 
                                      variant={variant} 
                                      onStatusToggle={handleVariantStatusToggle}
                                      onUpdate={() => {
                                        // Re-fetch variants to reflect changes immediately
                                        toggleVariants(product.product_id)
                                        setTimeout(() => toggleVariants(product.product_id), 10)
                                      }}
                                    />
                                  ))}
                                  <div className="p-2 border-t bg-muted/10 flex justify-center">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleEditClick(product)}>
                                      <Plus className="h-3 w-3 me-1" />
                                      {t('products.add_variant', { defaultValue: 'Add Variant' })}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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
    </div>
  )
}
