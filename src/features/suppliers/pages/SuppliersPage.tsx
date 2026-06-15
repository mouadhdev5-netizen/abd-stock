import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Truck, Download } from 'lucide-react'
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
import { SupplierForm } from '../components/SupplierForm'
import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

export default function SuppliersPage() {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: suppliers, isLoading, refetch } = useQuery({
    queryKey: ['suppliers', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', company.id)
        .order('name')

      if (error) throw error

      return data as any[]
    },
    enabled: !!company?.id,
  })

  const filters: FilterConfig[] = [
    {
      key: 'status',
      title: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' }
      ]
    },
    {
      key: 'debt',
      title: 'Has Debt',
      options: [
        { label: 'Yes', value: 'yes' }
      ]
    },
    {
      key: 'balance',
      title: 'Balance Due',
      type: 'number_range'
    }
  ]

  // Filtering
  const filteredSuppliers = suppliers?.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.contact_name && s.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    let matchesStatus = true
    let matchesDebt = true
    let matchesBalance = true

    if (activeFilters['status']?.length > 0) {
      if (activeFilters['status'].includes('active') && !s.is_active) matchesStatus = false
      if (activeFilters['status'].includes('inactive') && s.is_active) matchesStatus = false
    }

    if (activeFilters['debt']?.includes('yes')) {
      matchesDebt = s.current_balance > 0
    }

    if (activeFilters['balance']) {
      const { min, max } = activeFilters['balance']
      if (min !== undefined && s.current_balance < min) matchesBalance = false
      if (max !== undefined && s.current_balance > max) matchesBalance = false
    }

    return matchesSearch && matchesStatus && matchesDebt && matchesBalance
  })

  const totalCount = filteredSuppliers?.length || 0
  const paginatedSuppliers = useMemo(() => {
    if (!filteredSuppliers) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredSuppliers.slice(start, end)
  }, [filteredSuppliers, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage your vendors and track outstanding balances.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportToExcel(filteredSuppliers || [], 'Suppliers')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('actions.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
                <DialogDescription>
                  Enter the supplier's details, contact information, and payment terms.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-auto py-4">
                <SupplierForm 
                  onSuccess={() => { setIsDialogOpen(false); refetch(); }} 
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
            placeholder="Search by name or contact..."
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
                <TableHead>Supplier Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone / Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Balance Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    {t('labels.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    {t('labels.no_data')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSuppliers?.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      <div>{supplier.name}</div>
                      <div className="text-xs text-muted-foreground">{supplier.trade_name}</div>
                    </TableCell>
                    <TableCell>{supplier.contact_name || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">{supplier.phone || supplier.mobile || '-'}</div>
                      <div className="text-xs text-muted-foreground">{supplier.email || ''}</div>
                    </TableCell>
                    <TableCell>
                      {supplier.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {supplier.current_balance > 0 
                        ? formatCurrency(supplier.current_balance, company?.currency || 'DZD') 
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
