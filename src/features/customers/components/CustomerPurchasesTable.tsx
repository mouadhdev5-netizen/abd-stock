import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Search, FileText } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface CustomerPurchasesTableProps {
  customerId: string
}

export function CustomerPurchasesTable({ customerId }: CustomerPurchasesTableProps) {
  const { t } = useTranslation(['commerce', 'common'])
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['customer_purchases', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!customerId,
  })

  const filteredOrders = useMemo(() => {
    return orders?.filter((o: any) => {
      const matchSearch = (o.order_number || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      let matchStatus = true
      if (statusFilter !== 'all') {
        matchStatus = o.payment_status === statusFilter
      }
      
      return matchSearch && matchStatus
    }) || []
  }, [orders, searchTerm, statusFilter])

  const getStatusBadge = (status: string) => {
    if (status === 'paid') return <Badge variant="success">Paid</Badge>
    if (status === 'partial') return <Badge variant="warning">Partial</Badge>
    return <Badge variant="secondary">Pending</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Order #..."
            className="ps-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-muted/50 p-1 rounded-md border text-sm">
          <Button 
            type="button"
            variant={statusFilter === 'all' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setStatusFilter('all')}
            className="h-8"
          >
            All
          </Button>
          <Button 
            type="button"
            variant={statusFilter === 'paid' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setStatusFilter('paid')}
            className="h-8"
          >
            Paid
          </Button>
          <Button 
            type="button"
            variant={statusFilter === 'partial' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setStatusFilter('partial')}
            className="h-8"
          >
            Partial
          </Button>
          <Button 
            type="button"
            variant={statusFilter === 'pending' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setStatusFilter('pending')}
            className="h-8"
          >
            Pending
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-end">Total</TableHead>
              <TableHead className="text-end">Paid</TableHead>
              <TableHead className="text-end">Due</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">Loading purchases...</TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No purchases found.</TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order: any) => (
                <TableRow key={order.id} className="group cursor-pointer hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      {order.order_number}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(order.created_at)}</TableCell>
                  <TableCell className="text-end font-bold">
                    {formatCurrency(order.total_amount, company?.currency || 'DZD')}
                  </TableCell>
                  <TableCell className="text-end text-success">
                    {formatCurrency(order.amount_paid, company?.currency || 'DZD')}
                  </TableCell>
                  <TableCell className="text-end text-destructive font-medium">
                    {formatCurrency(order.due_amount, company?.currency || 'DZD')}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(order.payment_status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
