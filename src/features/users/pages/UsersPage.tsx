// @ts-nocheck
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Shield, UserPlus, Pencil, Trash2, Loader2 } from 'lucide-react'
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
import { formatDateTime } from '@/lib/utils'
import { UserForm } from '../components/UserForm'
import { AdvancedFilter, FilterConfig } from '@/components/ui/AdvancedFilter'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200',
  commerce_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
  production_manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
  cashier: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200',
  warehouse_agent: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400 border-gray-200',
}

export default function UsersPage() {
  const { t } = useTranslation(['admin', 'common'])
  const { company } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingUser, setDeletingUser] = useState<any>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          branch:branches(id, name)
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
      title: t('admin:users.role', { defaultValue: 'Role' }),
      options: [
        { label: t('admin:roles.super_admin.title', { defaultValue: 'Super Admin' }), value: 'super_admin' },
        { label: t('admin:roles.commerce_manager.title', { defaultValue: 'Commerce Mgr' }), value: 'commerce_manager' },
        { label: t('admin:roles.production_manager.title', { defaultValue: 'Production Mgr' }), value: 'production_manager' },
        { label: t('admin:roles.cashier.title', { defaultValue: 'Cashier' }), value: 'cashier' },
        { label: t('admin:roles.warehouse_agent.title', { defaultValue: 'Warehouse Agent' }), value: 'warehouse_agent' },
        { label: t('admin:roles.viewer.title', { defaultValue: 'Viewer' }), value: 'viewer' },
      ]
    },
    {
      key: 'status',
      title: t('admin:users.status', { defaultValue: 'Status' }),
      options: [
        { label: t('common:labels.active', { defaultValue: 'Active' }), value: 'active' },
        { label: t('common:labels.inactive', { defaultValue: 'Inactive' }), value: 'inactive' }
      ]
    }
  ]

  const filteredUsers = users?.filter(u => {
    const matchesSearch = 
      (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchesRole = true
    let matchesStatus = true

    if (activeFilters['role']?.length > 0) {
      matchesRole = activeFilters['role'].includes(u.role)
    }
    
    if (activeFilters['status']?.length > 0) {
      if (activeFilters['status'].includes('active') && !u.is_active) matchesStatus = false
      if (activeFilters['status'].includes('inactive') && u.is_active) matchesStatus = false
    }

    return matchesSearch && matchesRole && matchesStatus
  }) || []

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Soft delete: set role to viewer and inactive
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'viewer',
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsDeleteDialogOpen(false)
      toast({
        title: t('admin:users.deactivated', { defaultValue: 'User deactivated' }),
        description: t('admin:users.deactivated_desc', { defaultValue: 'The user account has been successfully deactivated.' }),
      })
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message,
      })
    }
  })

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            {t('admin:users.title', { defaultValue: 'User Administration' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('admin:users.subtitle', { defaultValue: 'Manage staff, roles, and branch access.' })}
          </p>
        </div>
        <Button onClick={() => { setEditingUser(null); setIsFormOpen(true) }}>
          <UserPlus className="me-2 h-4 w-4" />
          {t('admin:users.add', { defaultValue: 'Add User' })}
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t('admin:users.search', { defaultValue: 'Search by name or email...' })}
            className="ps-8 w-full bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <AdvancedFilter 
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={(k, v) => setActiveFilters(prev => ({...prev, [k]: v}))}
        />
      </div>

      {/* Table */}
      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead>{t('admin:users.user', { defaultValue: 'User' })}</TableHead>
                <TableHead>{t('admin:users.role', { defaultValue: 'Role' })}</TableHead>
                <TableHead>{t('admin:users.branch', { defaultValue: 'Branch' })}</TableHead>
                <TableHead>{t('admin:users.last_login', { defaultValue: 'Last Login' })}</TableHead>
                <TableHead>{t('admin:users.status', { defaultValue: 'Status' })}</TableHead>
                <TableHead className="text-end">{t('common:actions.actions', { defaultValue: 'Actions' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    {t('common:labels.no_data', { defaultValue: 'No users found.' })}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-semibold">{user.full_name || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className={`${ROLE_COLORS[user.role] || ROLE_COLORS.viewer}`}>
                        {t(`admin:roles.${user.role}.title`, { defaultValue: user.role })}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-sm">
                      {user.branch?.name || <span className="italic text-muted-foreground/50">{t('admin:users.all_branches', { defaultValue: 'All Branches' })}</span>}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-sm">
                      {user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : t('admin:users.never_logged_in', { defaultValue: 'Never' })}
                    </TableCell>

                    <TableCell>
                      {user.is_active ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-transparent">
                          {t('common:labels.active', { defaultValue: 'Active' })}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          {t('common:labels.inactive', { defaultValue: 'Inactive' })}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setEditingUser(user); setIsFormOpen(true); }}
                          className="text-muted-foreground hover:text-foreground"
                          title={t('common:actions.edit', { defaultValue: 'Edit' })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setDeletingUser(user); setIsDeleteDialogOpen(true); }}
                          className="text-destructive hover:bg-destructive/10"
                          title={t('admin:users.deactivate', { defaultValue: 'Deactivate User' })}
                          disabled={user.id === (company as any)?._userId} // prevent self deletion visually, though real id is in auth
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UserForm
        initialData={editingUser}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate(deletingUser?.id)}
        title={t('admin:users.deactivate_confirm_title', { defaultValue: 'Deactivate User' })}
        description={t('admin:users.deactivate_confirm_desc', { defaultValue: 'Are you sure? This user will be deactivated and will no longer be able to log in to the system.' })}
        confirmLabel={t('admin:users.deactivate_btn', { defaultValue: 'Yes, Deactivate' })}
        isDestructive={true}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
