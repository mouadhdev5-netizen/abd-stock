import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Warehouse, Search, Plus, MapPin, Phone } from 'lucide-react'
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

import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

export default function WarehousesPage() {
  const { t } = useTranslation('common')
  const { company, hasRole } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('warehouses')
        .select(`
          *,
          branches (name),
          manager:manager_id (full_name)
        `)
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
    }
  ]

  const filteredWarehouses = warehouses?.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (w.location && w.location.toLowerCase().includes(searchTerm.toLowerCase()))

    let matchesStatus = true
    if (activeFilters['status']?.length > 0) {
      if (activeFilters['status'].includes('active') && !w.is_active) matchesStatus = false
      if (activeFilters['status'].includes('inactive') && w.is_active) matchesStatus = false
    }

    return matchesSearch && matchesStatus
  })

  const totalCount = filteredWarehouses?.length || 0
  const paginatedWarehouses = useMemo(() => {
    if (!filteredWarehouses) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredWarehouses.slice(start, end)
  }, [filteredWarehouses, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouses</h1>
          <p className="text-muted-foreground mt-1">Manage physical storage locations and warehouse zones.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasRole('super_admin') && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Warehouse
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Warehouse</DialogTitle>
                  <DialogDescription>
                    Add a new physical storage facility to your logistics network.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <p className="text-sm text-muted-foreground">Form coming soon...</p>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search warehouses..."
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
                <TableHead>Warehouse Name</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">Loading...</TableCell>
                </TableRow>
              ) : filteredWarehouses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">No warehouses found.</TableCell>
                </TableRow>
              ) : (
                paginatedWarehouses?.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-muted-foreground" />
                        {warehouse.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {warehouse.branches?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {warehouse.location || 'Not specified'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {warehouse.manager?.full_name || <span className="text-muted-foreground italic">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      {warehouse.is_active ? (
                        <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-50">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Edit</Button>
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
