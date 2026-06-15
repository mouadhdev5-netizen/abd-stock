import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, FileText, Download } from 'lucide-react'
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToExcel, generateInvoicePDF } from '@/lib/export'
import { PurchaseForm } from '../components/PurchaseForm'
import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import { RelatedExpensesModal } from '@/features/accounting/components/RelatedExpensesModal'
import { Receipt } from 'lucide-react'

export default function PurchasesPage() {
  const { t } = useTranslation(['common'])
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOrderForCharges, setSelectedOrderForCharges] = useState<any>(null)
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: purchases, isLoading, refetch } = useQuery({
    queryKey: ['purchase_orders', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(name)
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
      key: 'status',
      title: 'Order Status',
      options: [
        { label: 'Completed', value: 'completed' },
        { label: 'Processing', value: 'processing' },
        { label: 'Received', value: 'received' },
        { label: 'Cancelled', value: 'cancelled' },
      ]
    },
    {
      key: 'payment_status',
      title: 'Payment',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Partial', value: 'partial' },
        { label: 'Pending (Credit)', value: 'pending' },
      ]
    },
    {
      key: 'total',
      title: 'Total Amount',
      type: 'number_range'
    },
    {
      key: 'due',
      title: 'Due Amount',
      type: 'number_range'
    }
  ]

  // Filtering
  const filteredPurchases = (purchases as any[])?.filter(p => {
    const suppName = (p.suppliers as any)?.name?.toLowerCase() || ''
    const poNumber = p.po_number.toLowerCase()
    const matchesSearch = suppName.includes(searchTerm.toLowerCase()) || 
                          poNumber.includes(searchTerm.toLowerCase())
    
    let matchesStatus = true
    let matchesPayment = true
    let matchesTotal = true
    let matchesDue = true

    if (activeFilters['status']?.length > 0) matchesStatus = activeFilters['status'].includes(p.status)
    if (activeFilters['payment_status']?.length > 0) matchesPayment = activeFilters['payment_status'].includes(p.payment_status)

    if (activeFilters['total']) {
      const { min, max } = activeFilters['total']
      if (min !== undefined && p.total < min) matchesTotal = false
      if (max !== undefined && p.total > max) matchesTotal = false
    }

    if (activeFilters['due']) {
      const { min, max } = activeFilters['due']
      if (min !== undefined && p.due_amount < min) matchesDue = false
      if (max !== undefined && p.due_amount > max) matchesDue = false
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesTotal && matchesDue
  })

  const totalCount = filteredPurchases?.length || 0
  const paginatedPurchases = useMemo(() => {
    if (!filteredPurchases) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredPurchases.slice(start, end)
  }, [filteredPurchases, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'received':
        return <Badge variant="success">{t('status.completed')}</Badge>
      case 'processing':
      case 'approved':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">{t('status.processing')}</Badge>
      case 'pending':
        return <Badge variant="warning">{t('status.pending')}</Badge>
      case 'cancelled':
        return <Badge variant="destructive">{t('status.cancelled')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.purchases')}</h1>
          <p className="text-muted-foreground mt-1">{t('labels.purchases_subtitle', { defaultValue: 'Manage vendor orders and stock intake.' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredPurchases || [], 'Purchases')}>
            <Download className="mr-2 h-4 w-4" />
            {t('actions.export')}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('actions.create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
              <div className="flex-1 overflow-auto p-6">
                <PurchaseForm 
                  onSuccess={() => {
                    setIsDialogOpen(false);
                    refetch();
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
            placeholder={t('labels.search_placeholder', { defaultValue: 'Search...' })}
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
                <TableHead>{t('labels.po_number', { defaultValue: 'PO #' })}</TableHead>
                <TableHead>{t('labels.date')}</TableHead>
                <TableHead>{t('labels.supplier')}</TableHead>
                <TableHead>{t('labels.status')}</TableHead>
                <TableHead className="text-right">{t('labels.total')}</TableHead>
                <TableHead className="text-right">{t('labels.paid', { defaultValue: 'Paid' })}</TableHead>
                <TableHead className="text-right">{t('labels.due', { defaultValue: 'Due' })}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    {t('labels.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredPurchases?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    {t('labels.no_data')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPurchases?.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium text-primary">
                      {po.po_number}
                    </TableCell>
                    <TableCell>{formatDate(po.order_date)}</TableCell>
                    <TableCell>
                      {(po.suppliers as any)?.name || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(po.total, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(po.paid_amount, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(po.due_amount, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrderForCharges(po)} title="View Charges">
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => generateInvoicePDF(po, company, 'Purchase')} title="Export PDF">
                          <FileText className="h-4 w-4" />
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

      {selectedOrderForCharges && (
        <RelatedExpensesModal
          isOpen={!!selectedOrderForCharges}
          onClose={() => setSelectedOrderForCharges(null)}
          relatedToType="purchase_order"
          relatedToId={selectedOrderForCharges.id}
          referenceNumber={selectedOrderForCharges.po_number}
        />
      )}
    </div>
  )
}
