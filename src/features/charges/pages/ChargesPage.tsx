import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Download } from 'lucide-react'
import { format, subDays, startOfDay } from 'date-fns'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import { exportToExcel } from '@/lib/export'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import { ChargeForm } from '../components/ChargeForm'

type DateRange = '7' | '30' | '90' | 'all'

export default function ChargesPage() {
  const { t } = useTranslation(['commerce', 'common'])
  const { company } = useAuthStore()
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<string>('all')
  const [dateRange, setDateRange] = useState<DateRange>('30')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [isFormOpen, setIsFormOpen] = useState(false)

  const { data: products } = useQuery({
    queryKey: ['products_for_filter', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('company_id', company.id)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id,
  })

  const { data: charges, isLoading, refetch } = useQuery({
    queryKey: ['product_charges', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      
      // JIT generate any missing interval charges
      try {
        // @ts-ignore - Supabase type definitions might not have this RPC yet
        await supabase.rpc('generate_recurring_charges', { p_company_id: company.id })
      } catch (err) {
        console.warn('Failed to generate recurring charges (RPC might not exist yet)', err)
      }

      const { data, error } = await supabase
        .from('product_charges')
        .select(`
          *,
          products(name, sku),
          profiles:created_by(full_name)
        `)
        .eq('company_id', company.id)
        .order('charge_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!company?.id,
  })

  const filteredCharges = useMemo(() => {
    if (!charges) return []

    const cutoffDate = dateRange !== 'all' 
      ? startOfDay(subDays(new Date(), parseInt(dateRange)))
      : null

    return (charges as any[]).filter(c => {
      const matchSearch = c.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchProduct = selectedProduct === 'all' || c.product_id === selectedProduct
      
      let matchDate = true
      if (cutoffDate) {
        const chargeDate = new Date(c.charge_date)
        matchDate = chargeDate >= cutoffDate
      }

      return matchSearch && matchProduct && matchDate
    })
  }, [charges, searchTerm, selectedProduct, dateRange])

  const totalAmount = useMemo(() => {
    return filteredCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0)
  }, [filteredCharges])

  const paginatedCharges = useMemo(() => {
    const start = pageIndex * pageSize
    return filteredCharges.slice(start, start + pageSize)
  }, [filteredCharges, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, selectedProduct, dateRange])

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('commerce:charges.title', { defaultValue: 'Charges' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('commerce:charges.subtitle', { defaultValue: 'Track product-linked costs and expenses.' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredCharges, 'Charges')}>
            <Download className="me-2 h-4 w-4" />
            {t('actions.export', { ns: 'common', defaultValue: 'Export' })}
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t('commerce:charges.add_charge', { defaultValue: 'Add Charge' })}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('commerce:charges.search_desc', { defaultValue: 'Search by description...' })}
            className="ps-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by product" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t('commerce:charges.all_products', { defaultValue: 'All Products' })}
            </SelectItem>
            {(products as any[])?.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t('labels.last_7_days', { ns: 'common', defaultValue: 'Last 7 days' })}</SelectItem>
            <SelectItem value="30">{t('labels.last_30_days', { ns: 'common', defaultValue: 'Last 30 days' })}</SelectItem>
            <SelectItem value="90">{t('labels.last_90_days', { ns: 'common', defaultValue: 'Last 90 days' })}</SelectItem>
            <SelectItem value="all">{t('labels.all_time', { ns: 'common', defaultValue: 'All time' })}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>{t('commerce:charges.date', { defaultValue: 'Date' })}</TableHead>
                <TableHead>{t('commerce:charges.product', { defaultValue: 'Product' })}</TableHead>
                <TableHead>{t('commerce:charges.description', { defaultValue: 'Description' })}</TableHead>
                <TableHead className="text-end">{t('commerce:charges.amount', { defaultValue: 'Amount' })}</TableHead>
                <TableHead>{t('commerce:charges.added_by', { defaultValue: 'Added By' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">Loading charges...</TableCell>
                </TableRow>
              ) : paginatedCharges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    {t('labels.no_data', { ns: 'common', defaultValue: 'No charges found.' })}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCharges.map((charge: any) => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {format(new Date(charge.charge_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{charge.products?.name || '-'}</div>
                      {charge.products?.sku && (
                        <div className="text-xs text-muted-foreground font-mono">{charge.products.sku}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{charge.description}</div>
                      {charge.notes && (
                        <div className="text-xs text-muted-foreground mt-0.5">{charge.notes}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <span className="font-bold text-destructive">
                        {formatCurrency(charge.amount, company?.currency || 'DZD')}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {charge.profiles?.full_name || 'System'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer with pagination + total */}
        <div className="p-3 border-t bg-muted/20 flex-shrink-0 flex items-center justify-between">
          <DataTablePagination
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalCount={filteredCharges.length}
            onPageChange={setPageIndex}
            onPageSizeChange={setPageSize}
          />
          <div className="text-sm font-semibold text-destructive ms-4 whitespace-nowrap">
            {t('commerce:charges.total', { defaultValue: 'Total' })}: {formatCurrency(totalAmount, company?.currency || 'DZD')}
          </div>
        </div>
      </div>

      <ChargeForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          setIsFormOpen(false)
          queryClient.invalidateQueries({ queryKey: ['product_charges'] })
        }}
      />
    </div>
  )
}
