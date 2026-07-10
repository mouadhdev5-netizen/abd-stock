import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { FileText, Search, Download, CheckCircle, Clock } from 'lucide-react'
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
import { DataTablePagination } from '@/components/ui/DataTablePagination'

export function SupplierInvoicesTab() {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: pos, isLoading } = useQuery({
    queryKey: ['supplier_invoices', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers (name)
        `)
        .eq('company_id', company.id)
        .neq('status', 'draft') // Invoices only apply to confirmed/received POs
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as any[]
    },
    enabled: !!company?.id,
  })

  const filteredPOs = pos?.filter(i => {
    const searchString = `${i.po_number} ${i.suppliers?.name || ''}`.toLowerCase()
    return searchString.includes(searchTerm.toLowerCase())
  })

  const totalCount = filteredPOs?.length || 0
  const paginatedPOs = useMemo(() => {
    if (!filteredPOs) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredPOs.slice(start, end)
  }, [filteredPOs, pageIndex, pageSize])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-50"><CheckCircle className="h-3 w-3 me-1"/> Received</Badge>
      case 'partial':
        return <Badge variant="outline" className="border-blue-500/50 text-blue-600 bg-blue-50">Partial</Badge>
      case 'confirmed':
        return <Badge variant="destructive" className="bg-orange-500/10 text-orange-500"><Clock className="h-3 w-3 me-1"/> Pending Receipt</Badge>
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
            placeholder="Search supplier or PO..."
            className="ps-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" onClick={() => exportToExcel(filteredPOs || [], 'SupplierInvoices')}>
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
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Total Amount</TableHead>
                <TableHead className="text-end">Paid Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">Loading supplier invoices...</TableCell>
                </TableRow>
              ) : filteredPOs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">No supplier invoices found.</TableCell>
                </TableRow>
              ) : (
                paginatedPOs?.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {po.po_number || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {po.suppliers?.name || <span className="text-muted-foreground italic">Unknown</span>}
                    </TableCell>
                    <TableCell>{formatDate(po.created_at)}</TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell className="text-end font-medium">
                      {formatCurrency(po.total_amount, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell className="text-end font-medium text-blue-600">
                      {formatCurrency(po.paid_amount || 0, company?.currency || 'DZD')}
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
