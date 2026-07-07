// @ts-nocheck
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const userSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional(),
  role: z.enum(['super_admin', 'commerce_manager', 'production_manager', 'cashier', 'warehouse_agent', 'viewer']),
  branch_id: z.string().optional().nullable(),
})

type UserFormValues = z.infer<typeof userSchema>

interface UserFormProps {
  initialData?: any
  isOpen: boolean
  onClose: () => void
}

export function UserForm({ initialData, isOpen, onClose }: UserFormProps) {
  const { t } = useTranslation(['admin', 'common'])
  const { company } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: branches } = useQuery({
    queryKey: ['branches', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('company_id', company.id)
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      role: 'viewer',
      branch_id: null,
    },
  })

  useEffect(() => {
    if (initialData && isOpen) {
      form.reset({
        full_name: initialData.full_name || '',
        email: initialData.email || '',
        password: '', // Leave blank on edit
        role: initialData.role || 'viewer',
        branch_id: initialData.branch_id || null,
      })
    } else if (isOpen) {
      form.reset({
        full_name: '',
        email: '',
        password: '',
        role: 'viewer',
        branch_id: null,
      })
    }
  }, [initialData, isOpen, form])

  const saveMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      if (!company?.id) throw new Error('No company ID')

      if (initialData?.id) {
        // Edit mode
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: data.full_name,
            email: data.email,
            role: data.role,
            branch_id: data.branch_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialData.id)

        if (error) throw error

        if (data.password) {
          // NOTE: We cannot update auth user password from the client without the user's current session or service_role key.
          // In a real implementation, you would call an Edge Function here that uses the service_role key:
          // supabase.auth.admin.updateUserById(initialData.id, { password: data.password })
          console.warn('Password update requires backend service_role key. Skipping password update.')
          throw new Error('Password update skipped: Requires backend configuration.')
        }

      } else {
        // Create mode
        if (!data.password) throw new Error('Password is required for new users')

        // Call the RPC to create the auth user and profile together
        const { error } = await supabase.rpc('create_company_user', {
          p_email: data.email,
          p_password: data.password,
          p_full_name: data.full_name,
          p_role: data.role,
          p_company_id: company.id,
          p_branch_id: data.branch_id || null
        })

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onClose()
      toast({
        title: t('common:actions.save', { defaultValue: 'Saved successfully' }),
        description: t('admin:users.saved_desc', { defaultValue: 'The user has been saved.' }),
      })
    },
    onError: (err: any) => {
      console.error('User save error:', err)
      toast({
        variant: 'destructive',
        title: 'Error saving user',
        description: err?.message || 'An unexpected error occurred. If this is a 409 conflict, the user email might already be registered.',
      })
    }
  })

  const onSubmit = (data: UserFormValues) => {
    saveMutation.mutate(data)
  }

  const ROLES = [
    { value: 'super_admin', label: t('admin:roles.super_admin.title', { defaultValue: 'Super Admin' }), desc: t('admin:roles.super_admin.desc', { defaultValue: 'Full access to all modules and settings' }) },
    { value: 'commerce_manager', label: t('admin:roles.commerce_manager.title', { defaultValue: 'Commerce Manager' }), desc: t('admin:roles.commerce_manager.desc', { defaultValue: 'Manages sales, customers, and pricing' }) },
    { value: 'production_manager', label: t('admin:roles.production_manager.title', { defaultValue: 'Production Manager' }), desc: t('admin:roles.production_manager.desc', { defaultValue: 'Manages recipes, manufacturing, and raw materials' }) },
    { value: 'cashier', label: t('admin:roles.cashier.title', { defaultValue: 'Cashier' }), desc: t('admin:roles.cashier.desc', { defaultValue: 'Handles POS and daily sales' }) },
    { value: 'warehouse_agent', label: t('admin:roles.warehouse_agent.title', { defaultValue: 'Warehouse Agent' }), desc: t('admin:roles.warehouse_agent.desc', { defaultValue: 'Manages stock movements and inventory counts' }) },
    { value: 'viewer', label: t('admin:roles.viewer.title', { defaultValue: 'Viewer' }), desc: t('admin:roles.viewer.desc', { defaultValue: 'Read-only access to dashboards and reports' }) },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData 
              ? t('admin:users.edit', { defaultValue: 'Edit User' })
              : t('admin:users.add', { defaultValue: 'Add User' })}
          </DialogTitle>
          <DialogDescription>
            {t('admin:users.form_desc', { defaultValue: 'Manage user access and details.' })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin:users.full_name', { defaultValue: 'Full Name' })} *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin:users.email', { defaultValue: 'Email Address' })} *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin:users.password', { defaultValue: 'Password' })} {initialData ? '' : '*'}</FormLabel>
                  <FormControl>
                    {/* Text input, not password, so admin can copy it and give to employee */}
                    <Input type="text" placeholder={initialData ? t('admin:users.password_edit_placeholder', { defaultValue: 'Leave blank to keep existing password' }) : 'Strong password'} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('admin:users.password_hint', { defaultValue: 'Save this password before submitting. You will need to give it to the employee.' })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin:users.role', { defaultValue: 'Role' })} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-auto">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value} className="items-start py-2">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{r.label}</span>
                            <span className="text-xs text-muted-foreground">{r.desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="branch_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin:users.branch', { defaultValue: 'Branch' })}</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val === 'all' ? null : val)} value={field.value || 'all'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">{t('admin:users.all_branches', { defaultValue: 'All Branches (Company-wide)' })}</SelectItem>
                      {branches?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('admin:users.branch_hint', { defaultValue: 'Restrict user access to a specific branch.' })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('common:actions.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('common:actions.save', { defaultValue: 'Save User' })}
              </Button>
            </DialogFooter>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
