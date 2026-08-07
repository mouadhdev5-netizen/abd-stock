import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, FileText, Package, Plus, SlidersHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { generateInvoicePDF } from '@/lib/export'
import { DataTablePagination } from '@/components/ui/DataTablePagination'
import { InlineSearch } from '@/components/ui/InlineSearch'
import { CommandStatusBadge } from '../components/CommandStatusBadge'
import { CommandDetailPanel } from '../components/CommandDetailPanel'
import { CommandLifecycle, CommandStatus } from '../components/CommandLifecycle'
import { createShipment, YalidinShipmentInput } from '@/lib/yalidin'
import { useToast } from '@/hooks/use-toast'
import { AdvancedFilter } from '@/components/ui/AdvancedFilter'

const STATUS_OPTIONS = [
  { label: 'Pending',     value: 'pending' },
  { label: 'Confirmed',   value: 'confirmed' },
  { label: 'In Delivery', value: 'in_delivery' },
  { label: 'Delivered',   value: 'delivered' },
  { label: 'Returned',    value: 'returned' },
  { label: 'Cancelled',   value: 'cancelled' },
]

export default function EnCoursPage() {
  const { t } = useTranslation(['commerce'])
  const { company } = useAuthStore()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
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

    // Status filter
    const statusFilter: string[] = activeFilters.status || []
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(c.status)

    // Date range filter
    const dateFilter = activeFilters.date || {}
    let matchesDate = true
    if (dateFilter.from) matchesDate = matchesDate && c.created_at >= dateFilter.from
    if (dateFilter.to) matchesDate = matchesDate && c.created_at <= dateFilter.to + 'T23:59:59'

    return matchesSearch && matchesStatus && matchesDate
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
  }, [searchTerm, activeFilters])

  const handleStatusChange = async (commandId: string, newStatus: CommandStatus) => {
    try {
      const { error } = await supabase
        .from('commands')
        .update({ status: newStatus, updated_at: new Date().toISOString() } as never)
        .eq('id', commandId)

      if (error) throw error

      toast({ title: 'Updated', description: `Order moved to ${newStatus.replace('_', ' ')}`, variant: 'success' })
      refetch()
      // Update selected command panel if open
      if (selectedCommand?.id === commandId) {
        setSelectedCommand((prev: any) => ({ ...prev, status: newStatus }))
      }
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
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

        toast({ title: 'Sent!', description: `Tracking: ${yalidinTrackingId}`, variant: 'success' })
        refetch()
      } else {
        toast({ title: 'Warning', description: 'DBD did not return tracking ID.', variant: 'warning' } as any)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to send to DBD: ' + err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commands</h1>
          <p className="text-muted-foreground mt-1">Manage active orders and track DBD deliveries.</p>
        </div>
        <Link to="/commerce/commands/new">
          <Button>
            <Plus className="h-4 w-4 me-2" />
            {t('commands.new_command', { defaultValue: 'Create Command' })}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
        <div className="w-full sm:max-w-sm">
          <InlineSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by customer or tracking..."
          />
        </div>
        <AdvancedFilter
          filters={[
            { key: 'status', title: 'Status', type: 'select', options: STATUS_OPTIONS },
            { key: 'date',   title: 'Date Range', type: 'date_range' },
          ]}
          activeFilters={activeFilters}
          onFilterChange={(key, val) => setActiveFilters(prev => ({ ...prev, [key]: val }))}
          onClearAll={() => setActiveFilters({})}
        />
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">{t('common:messages.loading')}</TableCell>
                </TableRow>
              ) : filteredCommands?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">No commands found.</TableCell>
                </TableRow>
              ) : (
                paginatedCommands?.map((command) => (
                  <TableRow key={command.id}>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(command.created_at)}</TableCell>
                    <TableCell className="font-medium">
                      {(command.customers as any)?.name || 'Walk-in Customer'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {command.command_items?.length || 0} items
                    </TableCell>
                    <TableCell>
                      {command.yalidin_tracking_id ? (
                        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{command.yalidin_tracking_id}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CommandLifecycle
                        status={command.status as CommandStatus}
                        onStatusChange={(newStatus) => handleStatusChange(command.id, newStatus)}
                        compact
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedCommand(command)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => generateInvoicePDF(command, company, 'Command')} title="Print Order">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => generateInvoicePDF(command, company, 'Delivery Note')} title="Print Delivery Note">
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
