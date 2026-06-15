import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Filter, Download, Star, UserPlus } from 'lucide-react'
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
} from "@/components/ui/dialog"
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToExcel } from '@/lib/export'
import { CustomerForm } from '../components/CustomerForm'

import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

export default function CustomersPage() {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ['customers', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      // Fetch customers
      const { data: customersData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)
        .order('name')

      if (custError) throw custError

      // Fetch order counts to determine if "Returning Customer"
      const { data: orderCounts, error: orderError } = await supabase
        .from('sales_orders')
        .select('customer_id')
        .eq('company_id', company.id)
        .in('status', ['completed', 'processing', 'confirmed'])

      if (orderError) throw orderError

      // Map counts
      const counts = (orderCounts as any[]).reduce((acc: Record<string, number>, order) => {
        if (order.customer_id) {
          acc[order.customer_id] = (acc[order.customer_id] || 0) + 1
        }
        return acc
      }, {})

      return (customersData as any[]).map(c => ({
        ...c,
        orderCount: counts[c.id] || 0,
        isReturning: (counts[c.id] || 0) > 1, // More than 1 order means they came back!
      }))
    },
    enabled: !!company?.id,
  })

  const filters: FilterConfig[] = [
    {
      key: 'type',
      title: 'Customer Type',
      options: [
        { label: 'Returning', value: 'returning' },
        { label: 'New', value: 'new' },
        { label: 'Has Debt', value: 'debt' }
      ]
    },
    {
      key: 'credit',
      title: 'Credit Balance',
      type: 'number_range'
    }
  ]

  // Filtering
  const filteredCustomers = customers?.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.phone && c.phone.includes(searchTerm))
    
    let matchesType = true
    let matchesCredit = true

    if (activeFilters['type']?.length > 0) {
      const typeFilters = activeFilters['type']
      if (typeFilters.includes('returning') && !c.isReturning) matchesType = false
      if (typeFilters.includes('new') && c.isReturning) matchesType = false
      if (typeFilters.includes('debt') && c.credit_balance <= 0) matchesType = false
    }

    if (activeFilters['credit']) {
      const { min, max } = activeFilters['credit']
      if (min !== undefined && c.credit_balance < min) matchesCredit = false
      if (max !== undefined && c.credit_balance > max) matchesCredit = false
    }

    return matchesSearch && matchesType && matchesCredit
  })

  const totalCount = filteredCustomers?.length || 0
  const paginatedCustomers = useMemo(() => {
    if (!filteredCustomers) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredCustomers.slice(start, end)
  }, [filteredCustomers, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.customers')}</h1>
          <p className="text-muted-foreground mt-1">Manage your clients and track their loyalty.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredCustomers || [], 'Customers')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('actions.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Enter the customer's details, contact information, and credit limits.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-auto py-4">
                <CustomerForm 
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
                <TableHead>{t('labels.name')}</TableHead>
                <TableHead>{t('labels.phone')}</TableHead>
                <TableHead>{t('labels.orders', { defaultValue: 'Orders' })}</TableHead>
                <TableHead>{t('labels.status')} / {t('labels.loyalty', { defaultValue: 'Loyalty' })}</TableHead>
                <TableHead className="text-right">{t('labels.credit_balance', { defaultValue: 'Credit Balance' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    {t('labels.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredCustomers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    {t('labels.no_data')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>{customer.orderCount}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!customer.is_active && (
                          <Badge variant="secondary">{t('status.inactive')}</Badge>
                        )}
                        {customer.isReturning && (
                          <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20">
                            <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                            {t('labels.returning', { defaultValue: 'Returning' })}
                          </Badge>
                        )}
                        {!customer.isReturning && customer.orderCount === 1 && (
                          <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-50 dark:bg-blue-950/20">
                            {t('labels.new', { defaultValue: 'New' })}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {customer.credit_balance > 0 
                        ? formatCurrency(customer.credit_balance, company?.currency || 'DZD') 
                        : '-'}
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
    </div>
  )
}
