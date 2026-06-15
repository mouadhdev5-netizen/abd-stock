import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Filter, Shield, UserPlus, Building2 } from 'lucide-react'
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
import { formatDate } from '@/lib/utils'
import { UserForm } from '../components/UserForm'

import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { DataTablePagination } from '@/components/ui/DataTablePagination'

export default function UsersPage() {
  const { t } = useTranslation('common')
  const { company, hasRole } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          branches (
            id,
            name
          )
        `)
        .eq('company_id', company.id)
        .order('role', { ascending: true })

      if (error) throw error
      return data as any[]
    },
    enabled: !!company?.id,
  })

  const filters: FilterConfig[] = [
    {
      key: 'role',
      title: 'Role',
      options: [
        { label: 'Super Admin', value: 'super_admin' },
        { label: 'Branch Manager', value: 'branch_manager' },
        { label: 'Employee', value: 'employee' }
      ]
    },
    {
      key: 'status',
      title: 'Status',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' }
      ]
    }
  ]

  // Filtering
  const filteredUsers = users?.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesRole = true
    let matchesStatus = true

    if (activeFilters['role']?.length > 0) matchesRole = activeFilters['role'].includes(u.role)
    
    if (activeFilters['status']?.length > 0) {
      if (activeFilters['status'].includes('active') && !u.is_active) matchesStatus = false
      if (activeFilters['status'].includes('suspended') && u.is_active) matchesStatus = false
    }

    return matchesSearch && matchesRole && matchesStatus
  })

  const totalCount = filteredUsers?.length || 0
  const paginatedUsers = useMemo(() => {
    if (!filteredUsers) return []
    const start = pageIndex * pageSize
    const end = start + pageSize
    return filteredUsers.slice(start, end)
  }, [filteredUsers, pageIndex, pageSize])

  useEffect(() => {
    setPageIndex(0)
  }, [searchTerm, activeFilters])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20"><Shield className="w-3 h-3 mr-1"/> Super Admin</Badge>
      case 'branch_manager':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"><Building2 className="w-3 h-3 mr-1"/> Branch Manager</Badge>
      case 'employee':
        return <Badge variant="secondary">Employee</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('nav.users')}</h1>
          <p className="text-muted-foreground mt-1">Manage employees, branch managers, and system access.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasRole('super_admin') && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your company ERP.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <UserForm 
                    onSuccess={() => {
                      setIsDialogOpen(false)
                      refetch()
                    }}
                    onCancel={() => setIsDialogOpen(false)}
                  />
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
            placeholder="Search by name or email..."
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
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    {t('labels.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    {t('labels.no_data')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.full_name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.branches?.name ? (
                        <div className="flex items-center text-sm">
                          <Building2 className="mr-2 h-3 w-3 text-muted-foreground" />
                          {user.branches.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">All Branches</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-50 dark:bg-green-950/20">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Suspended</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {user.last_login_at ? formatDate(user.last_login_at) : 'Never logged in'}
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
