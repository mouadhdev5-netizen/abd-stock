import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Receipt, Search, FileText, Download, CheckCircle, Clock } from 'lucide-react'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToExcel } from '@/lib/export'
import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

export default function InvoicesPage() {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          sales_orders (
            order_number,
            customers (name)
          )
        `)
        .eq('company_id', company.id)
        .order('issue_date', { ascending: false })

      if (error) throw error
      return data as any[]
    },
    enabled: !!company?.id,
  })

  const filters: FilterConfig[] = [
    {
      key: 'status',
      title: 'Invoice Status',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Partial', value: 'partial' },
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Overdue', value: 'overdue' },
      ]
    },
    {
      key: 'total',
      title: 'Total Amount',
      type: 'number_range'
    },
    {
      key: 'due',
      title: 'Balance Due',
      type: 'number_range'
    }
  ]

  // Filtering
  const filteredInvoices = invoices?.filter(i => {
    const searchString = `${i.invoice_number} ${i.sales_orders?.customers?.name || ''}`.toLowerCase()
    const matchesSearch = searchString.includes(searchTerm.toLowerCase())
    
    let matchesStatus = true
    let matchesTotal = true
    let matchesDue = true

    if (activeFilters['status']?.length > 0) matchesStatus = activeFilters['status'].includes(i.status)

    if (activeFilters['total']) {
      const { min, max } = activeFilters['total']
      if (min !== undefined && i.total_amount < min) matchesTotal = false
      if (max !== undefined && i.total_amount > max) matchesTotal = false
    }

    if (activeFilters['due']) {
      const { min, max } = activeFilters['due']
      if (min !== undefined && i.balance_due < min) matchesDue = false
      if (max !== undefined && i.balance_due > max) matchesDue = false
    }

    return matchesSearch && matchesStatus && matchesTotal && matchesDue
  })

  const totalCount = filteredInvoices?.length || 0
  const paginatedInvoices = useMemo(() => {
    if (!filteredInvoices) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredInvoices.slice(start, end)
  }, [filteredInvoices, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-50"><CheckCircle className="h-3 w-3 mr-1"/> Paid</Badge>
      case 'partial':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-50">Partial</Badge>
      case 'unpaid':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500"><Clock className="h-3 w-3 mr-1"/> Unpaid</Badge>
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices & Payments</h1>
          <p className="text-muted-foreground mt-1">Manage billing, track payments, and generate invoices.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredInvoices || [], 'Invoices')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Receipt className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
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
                <TableHead>{t('labels.invoice', { defaultValue: 'Invoice #' })}</TableHead>
                <TableHead>{t('labels.customer', { defaultValue: 'Customer' })}</TableHead>
                <TableHead>{t('labels.issue_date', { defaultValue: 'Issue Date' })}</TableHead>
                <TableHead>{t('labels.due_date', { defaultValue: 'Due Date' })}</TableHead>
                <TableHead>{t('labels.status', { defaultValue: 'Status' })}</TableHead>
                <TableHead className="text-right">{t('labels.total', { defaultValue: 'Total' })}</TableHead>
                <TableHead className="text-right">{t('labels.balance_due', { defaultValue: 'Balance Due' })}</TableHead>
                <TableHead className="text-right">{t('labels.actions', { defaultValue: 'Actions' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">Loading...</TableCell>
                </TableRow>
              ) : filteredInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">{t('labels.no_data', { defaultValue: 'No data' })}</TableCell>
                </TableRow>
              ) : (
                paginatedInvoices?.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {invoice.invoice_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      {invoice.sales_orders?.customers?.name || <span className="text-muted-foreground italic">Unknown</span>}
                    </TableCell>
                    <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.total_amount, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {formatCurrency(invoice.balance_due, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">{t('actions.print', { defaultValue: 'Print' })}</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t bg-muted/20 flex-shrink-0 flex items-center justify-between">
          <div className="flex-1">
            <DataTablePagination 
              pageIndex={pageIndex}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPageIndex}
              onPageSizeChange={setPageSize}
            />
          </div>
          <span className="font-semibold text-destructive whitespace-nowrap ml-4">
            {t('labels.total_unpaid', { defaultValue: 'Total Unpaid' })}: {formatCurrency(
              filteredInvoices?.reduce((sum, i) => sum + Number(i.balance_due), 0) || 0,
              company?.currency || 'DZD'
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
