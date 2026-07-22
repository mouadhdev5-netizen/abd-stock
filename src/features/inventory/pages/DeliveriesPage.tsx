import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Truck, Search, Download, FileText, CheckCircle } from 'lucide-react'
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
import { formatDate } from '@/lib/utils'
import { exportToExcel } from '@/lib/export'

export default function DeliveriesPage() {
  const { t } = useTranslation(['common'])
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: deliveries, isLoading, refetch } = useQuery({
    queryKey: ['deliveries', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          customers(name, phone)
        `)
        .eq('company_id', company.id)
        .in('status', ['processing', 'confirmed', 'partial'])
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  const updateDeliveryStatus = async (id: string, newStatus: string) => {
    try {
      // @ts-expect-error type
      const { error } = await supabase.from('sales_orders').update({ status: newStatus }).eq('id', id)
      if (error) throw error
      refetch()
    } catch (e) {
      console.error(e)
      alert('Failed to update delivery status')
    }
  }

  const filters: FilterConfig[] = [
    {
      key: 'status',
      title: 'Status',
      options: [
        { label: 'Processing', value: 'processing' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Partial', value: 'partial' },
      ]
    },
    {
      key: 'total',
      title: 'Order Amount',
      type: 'number_range'
    }
  ]

  const filteredDeliveries = (deliveries as any[])?.filter(d => {
    const custName = (d.customers as any)?.name?.toLowerCase() || ''
    const soNum = d.so_number.toLowerCase()
    const matchesSearch = custName.includes(searchTerm.toLowerCase()) || 
                          soNum.includes(searchTerm.toLowerCase())
    
    // OP Faceted Filtering logic
    const statusFilter = activeFilters['status']
    const matchesStatus = statusFilter?.length > 0 ? statusFilter.includes(d.status) : true

    let matchesTotal = true
    if (activeFilters['total']) {
      const { min, max } = activeFilters['total']
      if (min !== undefined && d.total < min) matchesTotal = false
      if (max !== undefined && d.total > max) matchesTotal = false
    }

    return matchesSearch && matchesStatus && matchesTotal
  })

  const totalCount = filteredDeliveries?.length || 0
  const paginatedDeliveries = useMemo(() => {
    if (!filteredDeliveries) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredDeliveries.slice(start, end)
  }, [filteredDeliveries, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Completed</Badge>
      case 'partial': return <Badge variant="default" className="bg-blue-500">Partial</Badge>
      case 'processing': return <Badge variant="warning">Processing</Badge>
      case 'confirmed': return <Badge variant="outline">Confirmed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deliveries</h1>
          <p className="text-muted-foreground mt-1">Track outgoing shipments and update delivery statuses.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredDeliveries || [], 'Deliveries')}>
            <Download className="me-2 h-4 w-4" />
            Export List
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('common:labels.search_orders', { defaultValue: 'Search Order # or Customer...' })}
            className="ps-8 w-full"
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
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">Loading deliveries...</TableCell>
                </TableRow>
              ) : filteredDeliveries?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">No deliveries found.</TableCell>
                </TableRow>
              ) : (
                paginatedDeliveries?.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-primary">{d.so_number}</TableCell>
                    <TableCell>{formatDate(d.created_at)}</TableCell>
                    <TableCell>{(d.customers as any)?.name || 'Walk-in'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{(d.customers as any)?.address || '-'}</TableCell>
                    <TableCell>{(d.customers as any)?.phone || '-'}</TableCell>
                    <TableCell>{getStatusBadge(d.status)}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-2">
                        {d.status === 'confirmed' && (
                          <Button size="sm" variant="outline" onClick={() => updateDeliveryStatus(d.id, 'processing')}>
                            <Truck className="me-2 h-4 w-4" /> Start Processing
                          </Button>
                        )}
                        {d.status === 'processing' && (
                          <Button size="sm" onClick={() => updateDeliveryStatus(d.id, 'completed')}>
                            <CheckCircle className="me-2 h-4 w-4" /> Mark Completed
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Delivery Note (Bon de Livraison)">
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
    </div>
  )
}
