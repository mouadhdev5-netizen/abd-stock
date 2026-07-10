import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { PackageOpen, Search, Download, CheckCircle, Truck, MapPin } from 'lucide-react'
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
import { formatDate } from '@/lib/utils'
import { exportToExcel } from '@/lib/export'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

export function DeliveriesTab() {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['deliveries_accounting', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          sales_orders (order_number, customers(name)),
          driver:profiles!driver_id (full_name)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as any[]
    },
    enabled: !!company?.id,
  })

  const filteredDeliveries = deliveries?.filter(d => {
    const searchString = `${d.tracking_number} ${d.sales_orders?.customers?.name || ''} ${d.driver?.full_name || ''}`.toLowerCase()
    return searchString.includes(searchTerm.toLowerCase())
  })

  const totalCount = filteredDeliveries?.length || 0
  const paginatedDeliveries = useMemo(() => {
    if (!filteredDeliveries) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredDeliveries.slice(start, end)
  }, [filteredDeliveries, pageIndex, pageSize])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-50"><CheckCircle className="h-3 w-3 me-1"/> Delivered</Badge>
      case 'in_transit':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-50"><Truck className="h-3 w-3 me-1"/> In Transit</Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 m-0">
      <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search delivery or customer..."
            className="ps-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" onClick={() => exportToExcel(filteredDeliveries || [], 'DeliveryNotes')}>
            <Download className="me-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Tracking #</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Driver/Service</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-end">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">Loading delivery notes...</TableCell>
                </TableRow>
              ) : filteredDeliveries?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">No delivery notes found.</TableCell>
                </TableRow>
              ) : (
                paginatedDeliveries?.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <PackageOpen className="h-4 w-4 text-muted-foreground" />
                        {d.tracking_number || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{d.sales_orders?.order_number || 'N/A'}</TableCell>
                    <TableCell>
                      {d.sales_orders?.customers?.name || <span className="text-muted-foreground italic">Unknown</span>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={d.delivery_address}>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{d.delivery_address || 'No address'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{d.driver?.full_name || d.shipping_provider || 'Unassigned'}</TableCell>
                    <TableCell>{formatDate(d.created_at)}</TableCell>
                    <TableCell className="text-end">{getStatusBadge(d.status)}</TableCell>
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
