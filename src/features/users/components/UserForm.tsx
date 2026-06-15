import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
  role: z.enum(['super_admin', 'branch_manager', 'employee']),
  branch_id: z.string().optional().nullable(),
  phone: z.string().optional(),
})

type UserFormValues = z.infer<typeof userSchema>

interface UserFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function UserForm({ onSuccess, onCancel }: UserFormProps) {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()

  // Fetch branches for the select dropdown
  const { data: branches } = useQuery({
    queryKey: ['branches-list', company?.id],
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
    enabled: !!company?.id
  })

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'employee',
      branch_id: null,
      phone: '',
    },
  })

  const watchRole = form.watch('role')

  async function onSubmit(data: UserFormValues) {
    if (!company?.id) return

    try {
      // Create a random UUID since we can't create actual Auth users from the frontend securely without the service role.
      // We insert into profiles, and the user must be invited via the Dashboard for now.
      const fakeId = crypto.randomUUID()
      
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: fakeId,
          company_id: company.id,
          branch_id: data.role === 'super_admin' ? null : data.branch_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          phone: data.phone || null,
          is_active: true,
        } as any)

      if (error) throw error

      onSuccess()
    } catch (error: any) {
      console.error('Error adding user profile:', error)
      alert(error.message || 'Failed to add user profile')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
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
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="branch_manager">Branch Manager</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1 234 567 890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {watchRole !== 'super_admin' && (
          <FormField
            control={form.control}
            name="branch_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Branch</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(branches as any[])?.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create User Profile
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Note: This creates the user profile. To allow them to log in, you must invite their email via the Supabase Auth Dashboard.
        </p>
      </form>
    </Form>
  )
}
