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
import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import { SalesForm } from '../components/SalesForm'
import { RelatedExpensesModal } from '@/features/accounting/components/RelatedExpensesModal'
import { Receipt } from 'lucide-react'

export default function SalesPage() {
  const { t } = useTranslation(['common', 'sales'])
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOrderForCharges, setSelectedOrderForCharges] = useState<any>(null)
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: sales, isLoading, refetch } = useQuery({
    queryKey: ['sales_orders', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customers(name)
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
        { label: 'Shipped', value: 'shipped' },
        { label: 'Delivered', value: 'delivered' },
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

  const filteredSales = (sales as any[])?.filter(s => {
    const custName = (s.customers as any)?.name?.toLowerCase() || ''
    const soNum = s.so_number.toLowerCase()
    const matchesSearch = custName.includes(searchTerm.toLowerCase()) || 
                          soNum.includes(searchTerm.toLowerCase())
    
    let matchesStatus = true
    let matchesPayment = true
    let matchesTotal = true
    let matchesDue = true

    if (activeFilters['status']?.length > 0) matchesStatus = activeFilters['status'].includes(s.status)
    if (activeFilters['payment_status']?.length > 0) matchesPayment = activeFilters['payment_status'].includes(s.payment_status)

    if (activeFilters['total']) {
      const { min, max } = activeFilters['total']
      if (min !== undefined && s.total < min) matchesTotal = false
      if (max !== undefined && s.total > max) matchesTotal = false
    }

    if (activeFilters['due']) {
      const { min, max } = activeFilters['due']
      if (min !== undefined && s.due_amount < min) matchesDue = false
      if (max !== undefined && s.due_amount > max) matchesDue = false
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesTotal && matchesDue
  })

  const totalCount = filteredSales?.length || 0
  const paginatedSales = useMemo(() => {
    if (!filteredSales) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredSales.slice(start, end)
  }, [filteredSales, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return <Badge variant="success">Completed</Badge>
      case 'processing':
      case 'confirmed':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Processing</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Orders</h1>
          <p className="text-muted-foreground mt-1">Manage orders, invoices, and payment statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredSales || [], 'SalesOrders')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
              <div className="flex-1 overflow-auto p-6">
                <SalesForm 
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
            placeholder="Search by order # or customer..."
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
                <TableHead>{t('labels.invoice', { defaultValue: 'Order #' })}</TableHead>
                <TableHead>{t('labels.date')}</TableHead>
                <TableHead>{t('labels.customer')}</TableHead>
                <TableHead>{t('labels.status')}</TableHead>
                <TableHead className="text-right">{t('labels.total')}</TableHead>
                <TableHead className="text-right">{t('labels.paid')}</TableHead>
                <TableHead className="text-right">{t('labels.due')}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredSales?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    No sales orders found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSales?.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium text-primary">
                      {sale.so_number}
                    </TableCell>
                    <TableCell>{formatDate(sale.order_date)}</TableCell>
                    <TableCell>
                      {(sale.customers as any)?.name || 'Walk-in Customer'}
                    </TableCell>
                    <TableCell>{getStatusBadge(sale.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell className="text-right text-success">
                      {formatCurrency(sale.paid_amount, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(sale.due_amount, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedOrderForCharges(sale)} title="View Charges">
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => generateInvoicePDF(sale, company, 'Sale')} title="Export PDF">
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
          relatedToType="sales_order"
          relatedToId={selectedOrderForCharges.id}
          referenceNumber={selectedOrderForCharges.so_number}
        />
      )}
    </div>
  )
}
