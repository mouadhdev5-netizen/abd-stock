import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Search, Eye, Filter, FileText, Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/export'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import { InlineSearch } from '@/components/ui/InlineSearch'
import { CommandStatusBadge } from '../components/CommandStatusBadge'
import { CommandDetailPanel } from '../components/CommandDetailPanel'
import { createShipment, YalidinShipmentInput } from '@/lib/yalidin'

export default function EnCoursPage() {
  const { t } = useTranslation(['commerce'])
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCommand, setSelectedCommand] = useState<any>(null)

  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: commands, isLoading, refetch } = useQuery({
    queryKey: ['commands_en_cours', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('commands')
        .select(`
          *,
          customers(name, phone),
          command_items(*, products(name), product_variants(name))
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  const filteredCommands = (commands as any[])?.filter(c => {
    const custName = (c.customers as any)?.name?.toLowerCase() || ''
    const tracking = (c.yalidin_tracking_id || '').toLowerCase()

    const matchesSearch = custName.includes(searchTerm.toLowerCase()) || tracking.includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const totalCount = filteredCommands?.length || 0
  const paginatedCommands = useMemo(() => {
    if (!filteredCommands) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredCommands.slice(start, end)
  }, [filteredCommands, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, statusFilter])

  const handleStatusChange = async (commandId: string, newStatus: string) => {
    try {
      await supabase
        .from('commands')
        .update({ status: newStatus, updated_at: new Date().toISOString() } as never)
        .eq('id', commandId)

      refetch()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const handleSubmitToYalidin = async (command: any) => {
    if (!company?.id) return
    try {
      const { data: items } = await supabase.from('command_items').select('*').eq('command_id', command.id)

      const customerNames = (command.customers?.name || 'Walk-in Customer').split(' ')
      const firstname = customerNames[0] || 'Unknown'
      const familyname = customerNames.slice(1).join(' ') || 'Unknown'
      const product_list = ((items as any[]) || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ')

      const yalidinInput: YalidinShipmentInput = {
        order_id: command.id,
        firstname,
        familyname,
        contact_phone: command.customers?.phone || '0000000000',
        address: command.delivery_address || 'No address',
        to_wilaya_name: 'Alger',
        to_commune_name: 'Alger Centre',
        product_list,
        price: command.total,
        do_insurance: false,
        is_free_shipping: false,
      }

      const responseArray = await createShipment([yalidinInput])
      const yalidinTrackingId = responseArray[0]?.tracking

      if (yalidinTrackingId) {
        await supabase
          .from('commands')
          .update({ yalidin_tracking_id: yalidinTrackingId, status: 'confirmed' } as never)
          .eq('id', command.id)

        alert(`Command sent to Yalidin! Tracking: ${yalidinTrackingId}`)
        refetch()
      } else {
        alert('Yalidin did not return tracking ID.')
      }
    } catch (err: any) {
      alert('Failed to send to Yalidin: ' + err.message)
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commands (En Cours)</h1>
          <p className="text-muted-foreground mt-1">Manage active orders and track Yalidin deliveries.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
        <div className="w-full sm:max-w-sm">
          <InlineSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by customer or tracking..."
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px]">Change Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">{t('common:messages.loading')}</TableCell>
                </TableRow>
              ) : filteredCommands?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">No commands found.</TableCell>
                </TableRow>
              ) : (
                paginatedCommands?.map((command) => (
                  <TableRow key={command.id}>
                    <TableCell>{formatDate(command.created_at)}</TableCell>
                    <TableCell className="font-medium">
                      {(command.customers as any)?.name || 'Walk-in Customer'}
                    </TableCell>
                    <TableCell>
                      {command.command_items?.length || 0} items
                    </TableCell>
                    <TableCell>
                      {command.yalidin_tracking_id ? (
                        <span className="font-mono text-sm">{command.yalidin_tracking_id}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CommandStatusBadge status={command.status} />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={command.status}
                        onValueChange={(val) => handleStatusChange(command.id, val)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="in_transit">In Transit</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedCommand(command)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => generateInvoicePDF(command, company, 'Command')} title="Imprimer Bon de Commande">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => generateInvoicePDF(command, company, 'Delivery Note')} title="Imprimer Bon de Livraison">
                          <Package className="h-4 w-4 text-green-600" />
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

      <CommandDetailPanel
        command={selectedCommand}
        isOpen={!!selectedCommand}
        onClose={() => setSelectedCommand(null)}
        onSubmitToYalidin={selectedCommand && !selectedCommand.yalidin_tracking_id ? () => handleSubmitToYalidin(selectedCommand) : undefined}
      />
    </div>
  )
}
