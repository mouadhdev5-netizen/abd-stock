import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const chargeSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  charge_date: z.string().min(1, 'Date is required'),
  product_id: z.string().min(1, 'Product is required'),
  notes: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurring_interval: z.string().optional(),
})

type ChargeFormValues = z.infer<typeof chargeSchema>

interface ChargeFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ChargeForm({ isOpen, onClose, onSuccess }: ChargeFormProps) {
  const { t } = useTranslation(['commerce', 'common'])
  const { company, user } = useAuthStore()

  const { data: products } = useQuery<any[]>({
    queryKey: ['active_products', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('company_id', company.id)
        .eq('status', 'active')
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!company?.id,
  })

  const form = useForm<ChargeFormValues>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      description: '',
      amount: 0,
      charge_date: format(new Date(), 'yyyy-MM-dd'),
      product_id: '',
      notes: '',
      is_recurring: false,
      recurring_interval: 'monthly',
    },
  })

  async function onSubmit(data: ChargeFormValues) {
    if (!company?.id) return

    try {
      const { error } = await supabase.from('product_charges').insert({
        company_id: company.id,
        product_id: data.product_id,
        variant_id: null,
        description: data.description,
        amount: data.amount,
        charge_date: data.charge_date,
        notes: data.notes || null,
        created_by: user?.id || null,
        is_recurring: data.is_recurring,
        recurring_interval: data.is_recurring ? data.recurring_interval : null,
        last_generated_at: data.is_recurring ? data.charge_date : null,
      } as never)

      if (error) throw error

      alert(t('commerce:charges.charge_added', { defaultValue: 'Charge added successfully' }))
      form.reset({
        description: '',
        amount: 0,
        charge_date: format(new Date(), 'yyyy-MM-dd'),
        product_id: '',
        notes: '',
        is_recurring: false,
        recurring_interval: 'monthly',
      })
      onSuccess()
    } catch (error: any) {
      console.error('Error adding charge:', error)
      alert(`Failed to add charge: ${error.message}`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t('commerce:charges.add_charge', { defaultValue: 'Add Charge' })}</DialogTitle>
          <DialogDescription>
            {t('commerce:charges.add_charge_desc', { defaultValue: 'Record a product-linked cost or expense.' })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('commerce:charges.description', { defaultValue: 'Description' })} *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Shipping, Packaging, Import Tax..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('commerce:charges.amount', { defaultValue: 'Amount' })} ({company?.currency || 'DZD'}) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="charge_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('commerce:charges.charge_date', { defaultValue: 'Charge Date' })} *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('commerce:products.product_name', { defaultValue: 'Product' })} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.sku && `(${p.sku})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="is_recurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 flex-1">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Recurring Charge?</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('is_recurring') && (
                <FormField
                  control={form.control}
                  name="recurring_interval"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Interval</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('commerce:charges.notes', { defaultValue: 'Notes' })}</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any extra details..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={form.formState.isSubmitting}>
                {t('actions.cancel', { ns: 'common', defaultValue: 'Cancel' })}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('commerce:charges.add_charge', { defaultValue: 'Add Charge' })}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
