import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

const adjustSchema = z.object({
  type: z.enum(['add', 'remove']),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Please select a reason'),
  notes: z.string().optional(),
})

type AdjustFormValues = z.infer<typeof adjustSchema>

interface StockAdjustDialogProps {
  product: any
  variant?: any // If adjustment is for a specific variant
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function StockAdjustDialog({ product, variant, isOpen, onClose, onSuccess }: StockAdjustDialogProps) {
  const { t } = useTranslation(['commerce', 'common'])
  const { company } = useAuthStore()

  const form = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      type: 'add',
      quantity: 1,
      reason: 'Inventory Count',
      notes: '',
    },
  })

  async function onSubmit(data: AdjustFormValues) {
    if (!company?.id || !product?.product_id) return

    try {
      const isAdd = data.type === 'add'
      const qty = isAdd ? data.quantity : -Math.abs(data.quantity)
      const refId = `ADJ-${new Date().getTime()}`

      const { data: wh } = await supabase.from('warehouses').select('id').eq('company_id', company.id).limit(1).single()
      if (!wh) throw new Error("No warehouse found for adjustment")

      const { error } = await supabase.from('stock_movements').insert({
        company_id: company.id,
        warehouse_id: (wh as any).id,
        product_id: product.product_id,
        variant_id: variant ? variant.id : null,
        movement_type: data.reason === 'Inventory Count' ? 'count_adjustment' : 'adjustment',
        quantity: qty,
        unit_cost: variant ? variant.cost_price : product.avg_cost,
        notes: data.notes ? `${data.reason}: ${data.notes} (${refId})` : `${data.reason} (${refId})`,
      } as never)

      if (error) throw error

      alert(t('commerce:inventory.stock_adjusted', { defaultValue: 'Stock adjusted successfully' }))
      form.reset()
      onSuccess()
    } catch (error: any) {
      console.error('Error adjusting stock:', error)
      alert(t('commerce:inventory.adjustment_error', { defaultValue: 'Failed to adjust stock' }))
    }
  }

  const title = variant 
    ? `${product.name} - ${variant.name}`
    : product?.name

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('commerce:inventory.adjust_stock', { defaultValue: 'Adjust Stock' })}</DialogTitle>
          <DialogDescription>
            {t('commerce:inventory.adjust_desc', { defaultValue: 'Record a manual stock adjustment for' })} <strong className="text-foreground">{title}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('commerce:inventory.adjustment_type', { defaultValue: 'Adjustment Type' })}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="add">{t('commerce:inventory.add_stock', { defaultValue: 'Add Stock (+)' })}</SelectItem>
                      <SelectItem value="remove">{t('commerce:inventory.remove_stock', { defaultValue: 'Remove Stock (-)' })}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labels.quantity', { ns: 'common', defaultValue: 'Quantity' })}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('commerce:inventory.reason', { defaultValue: 'Reason' })}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Inventory Count">{t('commerce:inventory.reason_count', { defaultValue: 'Inventory Count' })}</SelectItem>
                      <SelectItem value="Damaged">{t('commerce:inventory.reason_damaged', { defaultValue: 'Damaged' })}</SelectItem>
                      <SelectItem value="Found">{t('commerce:inventory.reason_found', { defaultValue: 'Found' })}</SelectItem>
                      <SelectItem value="Other">{t('common:other', { defaultValue: 'Other' })}</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Textarea className="resize-none" rows={2} {...field} />
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
                {t('actions.save', { ns: 'common', defaultValue: 'Save' })}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
