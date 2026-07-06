import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

const supplierSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  payment_terms: z.coerce.number().min(0).default(0),
  current_balance: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

interface SupplierFormProps {
  initialData?: any
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function SupplierForm({ initialData, isOpen, onClose, onSuccess }: SupplierFormProps) {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      contact_name: '',
      phone: '',
      email: '',
      payment_terms: 0,
      current_balance: 0,
      notes: '',
      is_active: true,
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || '',
        contact_name: initialData.contact_name || '',
        phone: initialData.phone || initialData.mobile || '',
        email: initialData.email || '',
        payment_terms: initialData.payment_terms || 0,
        current_balance: initialData.current_balance || 0,
        notes: initialData.notes || '',
        is_active: initialData.is_active ?? true,
      })
    } else {
      form.reset({
        name: '',
        contact_name: '',
        phone: '',
        email: '',
        payment_terms: 0,
        current_balance: 0,
        notes: '',
        is_active: true,
      })
    }
  }, [initialData, isOpen])

  async function onSubmit(data: SupplierFormValues) {
    if (!company?.id) return

    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from('suppliers')
          .update({
            name: data.name,
            contact_name: data.contact_name,
            phone: data.phone,
            email: data.email,
            payment_terms: data.payment_terms,
            current_balance: data.current_balance,
            notes: data.notes,
            is_active: data.is_active,
          } as never)
          .eq('id', initialData.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert({
            name: data.name,
            contact_name: data.contact_name,
            phone: data.phone,
            email: data.email,
            payment_terms: data.payment_terms,
            current_balance: data.current_balance,
            notes: data.notes,
            is_active: data.is_active,
            company_id: company.id,
            currency: company.currency || 'DZD',
          } as never)
        if (error) throw error
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error saving supplier:', error)
      alert(`Failed to save supplier: ${error.message || JSON.stringify(error)}`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? t('production:suppliers.edit_supplier', { defaultValue: 'Edit Supplier' })
              : t('production:suppliers.add_supplier', { defaultValue: 'Add Supplier' })}
          </DialogTitle>
          <DialogDescription>
            {t('production:suppliers.form_desc', { defaultValue: 'Fill in the supplier details below.' })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('production:suppliers.name', { defaultValue: 'Supplier Name' })} *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ABC Trading Co." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('production:suppliers.contact_name', { defaultValue: 'Contact Person' })}</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('labels.phone', { ns: 'common', defaultValue: 'Phone' })}</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+213..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="vendor@domain.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('production:suppliers.payment_terms', { defaultValue: 'Payment Terms (Days)' })}</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="current_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('production:suppliers.initial_balance', { defaultValue: 'Initial Balance Due' })}</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labels.notes', { ns: 'common', defaultValue: 'Notes (Optional)' })}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">
                    {t('production:suppliers.active_supplier', { defaultValue: 'Active Supplier' })}
                  </FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={form.formState.isSubmitting}>
                {t('actions.cancel', { ns: 'common', defaultValue: 'Cancel' })}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {initialData
                  ? t('actions.save', { ns: 'common', defaultValue: 'Save Changes' })
                  : t('production:suppliers.add_supplier', { defaultValue: 'Add Supplier' })}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
