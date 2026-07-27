import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Search, Download, Lock, Unlock, Loader2 } from 'lucide-react'
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCurrency } from '@/lib/utils'
import { exportToExcel } from '@/lib/export'

import { DataTablePagination } from '@/components/ui/DataTablePagination'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { CustomerDetailPanel } from '../components/CustomerDetailPanel'

export default function CustomersPage() {
  const { t } = useTranslation(['common', 'commerce'])
  const { company } = useAuthStore()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'debt'>('all')
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const [blockConfirmData, setBlockConfirmData] = useState<{ id: string, name: string, is_blocked: boolean } | null>(null)
  const [isBlocking, setIsBlocking] = useState(false)

  const { data: customers, isLoading, refetch } = useQuery({
    queryKey: ['customers', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data: customersData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', company.id)
        .order('name')

      if (custError) throw custError

      // Fetch order counts
      const { data: orderCounts, error: orderError } = await supabase
        .from('sales_orders')
        .select('customer_id')
        .eq('company_id', company.id)
        .in('status', ['completed', 'processing', 'confirmed'])

      if (orderError) throw orderError

      const counts = (orderCounts as any[]).reduce((acc: Record<string, number>, order) => {
        if (order.customer_id) {
          acc[order.customer_id] = (acc[order.customer_id] || 0) + 1
        }
        return acc
      }, {})

      return (customersData as any[]).map(c => ({
        ...c,
        orderCount: counts[c.id] || 0,
      }))
    },
    enabled: !!company?.id,
  })

  // Filtering
  const filteredCustomers = useMemo(() => {
    return customers?.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (c.phone && c.phone.includes(searchTerm))
      
      let matchesFilter = true
      if (filter === 'active') matchesFilter = !c.is_blocked
      if (filter === 'blocked') matchesFilter = !!c.is_blocked
      if (filter === 'debt') matchesFilter = c.credit_balance > 0

      return matchesSearch && matchesFilter
    }) || []
  }, [customers, searchTerm, filter])

  const totalCount = filteredCustomers.length
  const paginatedCustomers = useMemo(() => {
    const start = pageIndex * pageSize
    return filteredCustomers.slice(start, start + pageSize)
  }, [filteredCustomers, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, filter])

  const handleRowClick = (id: string) => {
    setSelectedCustomerId(id)
    setIsPanelOpen(true)
  }

  const handleToggleBlock = async () => {
    if (!blockConfirmData) return
    setIsBlocking(true)
    try {
      const newStatus = !blockConfirmData.is_blocked
      const { error } = await supabase
        .from('customers')
        .update({ is_blocked: newStatus } as never)
        .eq('id', blockConfirmData.id)

      if (error) throw error
      
      refetch()
    } catch (err: any) {
      alert(`Failed to change block status: ${err.message}`)
    } finally {
      setIsBlocking(false)
      setBlockConfirmData(null)
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.customers', { defaultValue: 'Customers' })}</h1>
          <p className="text-muted-foreground mt-1">Manage your clients, view their purchases and track debt.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredCustomers || [], 'Customers')}>
            <Download className="me-2 h-4 w-4" />
            {t('actions.export', { defaultValue: 'Export' })}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('labels.search_placeholder', { defaultValue: 'Search by name or phone...' })}
            className="ps-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex bg-muted/50 p-1 rounded-md border text-sm overflow-x-auto">
          <Button 
            variant={filter === 'all' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setFilter('all')}
            className="h-8 whitespace-nowrap"
          >
            All
          </Button>
          <Button 
            variant={filter === 'active' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setFilter('active')}
            className="h-8 whitespace-nowrap"
          >
            Active
          </Button>
          <Button 
            variant={filter === 'blocked' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setFilter('blocked')}
            className="h-8 whitespace-nowrap"
          >
            Blocked
          </Button>
          <Button 
            variant={filter === 'debt' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setFilter('debt')}
            className="h-8 whitespace-nowrap"
          >
            Has Debt
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>{t('labels.name', { defaultValue: 'Name' })}</TableHead>
                <TableHead>{t('labels.type', { defaultValue: 'Type' })}</TableHead>
                <TableHead>{t('labels.phone', { defaultValue: 'Contact' })}</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-center">{t('labels.orders', { defaultValue: 'Orders' })}</TableHead>
                <TableHead className="text-end">Balance</TableHead>
                <TableHead className="text-end">Limit</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    {t('labels.no_data', { defaultValue: 'No customers found.' })}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
                  <TableRow 
                    key={customer.id} 
                    className={`cursor-pointer hover:bg-muted/50 ${customer.is_blocked ? 'bg-destructive/5 hover:bg-destructive/10' : ''}`}
                    onClick={() => handleRowClick(customer.id)}
                  >
                    <TableCell className="font-medium text-primary">
                      {customer.name}
                    </TableCell>
                    <TableCell className="capitalize">
                      {customer.type}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          {customer.phone || '-'}
                          {customer.phone && <WhatsAppButton phone={customer.phone} />}
                        </div>
                        {customer.email && <span className="text-xs text-muted-foreground">{customer.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.wilaya ? `${customer.wilaya}${customer.commune ? `, ${customer.commune}` : ''}` : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={customer.address}>
                      {customer.address || '-'}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {customer.orderCount}
                    </TableCell>
                    <TableCell className="text-end font-medium">
                      {customer.credit_balance > 0 ? (
                        <span className="text-destructive font-bold">{formatCurrency(customer.credit_balance, company?.currency || 'DZD')}</span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-end text-muted-foreground">
                      {customer.credit_limit > 0 ? formatCurrency(customer.credit_limit, company?.currency || 'DZD') : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {customer.is_blocked ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setBlockConfirmData({
                            id: customer.id,
                            name: customer.name,
                            is_blocked: customer.is_blocked
                          })
                        }}
                      >
                        {customer.is_blocked ? (
                          <Unlock className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        )}
                      </Button>
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

      <CustomerDetailPanel 
        customerId={selectedCustomerId}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false)
          setSelectedCustomerId(null)
        }}
        onUpdate={refetch}
      />

      <ConfirmDialog
        open={!!blockConfirmData}
        onCancel={() => setBlockConfirmData(null)}
        onConfirm={handleToggleBlock}
        title={blockConfirmData?.is_blocked ? "Unblock Customer?" : "Block Customer?"}
        description={blockConfirmData?.is_blocked 
          ? `Are you sure you want to unblock ${blockConfirmData?.name}? They will be able to make purchases again.`
          : `Are you sure you want to block ${blockConfirmData?.name}? They won't be selectable in new sales.`
        }
        confirmLabel={blockConfirmData?.is_blocked ? "Yes, Unblock" : "Yes, Block"}
        confirmVariant={blockConfirmData?.is_blocked ? "default" : "destructive"}
        isLoading={isBlocking}
      />
    </div>
  )
}
