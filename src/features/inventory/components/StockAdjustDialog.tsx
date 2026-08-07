import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2, Plus, Minus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

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
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useQuery } from '@tanstack/react-query'

// ── For simple (no-variant) products ─────────────────────────────────────────
const adjustSchema = z.object({
  type: z.enum(['add', 'remove']),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  reason: z.string().min(1, 'Please select a reason'),
  notes: z.string().optional(),
})

type AdjustFormValues = z.infer<typeof adjustSchema>

interface StockAdjustDialogProps {
  product: any
  variant?: any
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// ── Variant row state ─────────────────────────────────────────────────────────
interface VariantAdj {
  variant: any
  qty: number
  type: 'add' | 'remove'
}

export function StockAdjustDialog({ product, variant, isOpen, onClose, onSuccess }: StockAdjustDialogProps) {
  const { t } = useTranslation(['commerce', 'common'])
  const { company } = useAuthStore()
  const { toast } = useToast()

  // When adjusting a parent with variants, load them all
  const { data: variants, isLoading: loadingVariants } = useQuery({
    queryKey: ['product_variants_adj', product?.product_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_product_variants_stock')
        .select('*')
        .eq('product_id', product?.product_id)
        .eq('is_variant', true)
      if (error) throw error
      return data || []
    },
    enabled: !!product?.product_id && !variant && !!product?.has_variants && isOpen,
  })

  // Multi-variant adjustment rows
  const [variantAdjs, setVariantAdjs] = useState<VariantAdj[]>([])
  const [reason, setReason] = useState('Inventory Count')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize variant adj rows when variants load
  const variantRows: VariantAdj[] = variants?.map((v: any) => {
    const existing = variantAdjs.find(a => a.variant.variant_id === v.variant_id)
    return existing || { variant: v, qty: 0, type: 'add' as const }
  }) || []

  const updateVariantAdj = (variantId: string, field: 'qty' | 'type', value: any) => {
    setVariantAdjs(prev => {
      const existing = prev.find(a => a.variant.variant_id === variantId)
      if (existing) {
        return prev.map(a => a.variant.variant_id === variantId ? { ...a, [field]: value } : a)
      }
      const variantData = variants?.find((v: any) => v.variant_id === variantId)
      if (!variantData) return prev
      return [...prev, { variant: variantData, qty: field === 'qty' ? value : 0, type: field === 'type' ? value : 'add' }]
    })
  }

  // ── Simple form (no variants / single variant) ────────────────────────────
  const form = useForm<AdjustFormValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: {
      type: 'add',
      quantity: 1,
      reason: 'Inventory Count',
      notes: '',
    },
  })

  const doAdjust = async (
    productId: string,
    variantId: string | null,
    qty: number,
    cost: number,
    reasonStr: string,
    notesStr: string
  ) => {
    const { data: wh } = await supabase.from('warehouses').select('id').eq('company_id', company!.id).limit(1).single()
    if (!wh) throw new Error('No warehouse found')
    const user = useAuthStore.getState().user
    const refId = `ADJ-${Date.now()}`

    const { error } = await supabase.rpc('fn_update_stock_level', {
      p_company_id: company!.id,
      p_product_id: productId,
      p_variant_id: variantId,
      p_warehouse_id: (wh as any).id,
      p_quantity: qty,
      p_unit_cost: cost,
      p_movement_type: reasonStr === 'Inventory Count' ? 'count_adjustment' : 'adjustment',
      p_notes: notesStr ? `${reasonStr}: ${notesStr} (${refId})` : `${reasonStr} (${refId})`,
      p_created_by: user?.id,
    } as any)

    if (error) throw error
  }

  // Submit multi-variant
  const handleMultiSubmit = async () => {
    const toAdjust = variantRows.filter(r => {
      const adj = variantAdjs.find(a => a.variant.variant_id === r.variant.variant_id)
      return (adj?.qty || 0) > 0
    })

    if (toAdjust.length === 0) {
      toast({ title: 'Warning', description: 'Enter at least one quantity to adjust.' })
      return
    }

    setIsSubmitting(true)
    try {
      for (const row of toAdjust) {
        const adj = variantAdjs.find(a => a.variant.variant_id === row.variant.variant_id) || row
        const qty = adj.type === 'add' ? adj.qty : -Math.abs(adj.qty)
        await doAdjust(
          product.product_id,
          row.variant.variant_id,
          qty,
          row.variant.cost_price || 0,
          reason,
          notes
        )
      }
      toast({ title: 'Stock Adjusted', description: `Updated ${toAdjust.length} variant(s) successfully`, variant: 'success' })
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to adjust stock', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit simple
  async function onSubmit(data: AdjustFormValues) {
    if (!company?.id || !product?.product_id) return
    setIsSubmitting(true)
    try {
      const qty = data.type === 'add' ? data.quantity : -Math.abs(data.quantity)
      const variantId = variant ? (variant.variant_id || variant.id) : null
      const cost = variant ? (variant.cost_price || 0) : (product.cost_price || product.avg_cost || 0)
      await doAdjust(product.product_id, variantId, qty, cost, data.reason, data.notes || '')
      toast({ title: 'Stock Adjusted', description: 'Stock updated successfully', variant: 'success' })
      form.reset()
      onSuccess()
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to adjust stock: ' + error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const productName = product?.name || product?.product_name || 'Product'
  const variantName = variant?.name || variant?.variant_name
  const title = variantName ? `${productName} — ${variantName}` : productName

  const showMultiVariant = !variant && product?.has_variants && !loadingVariants && (variants?.length || 0) > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={showMultiVariant ? 'sm:max-w-[640px]' : 'sm:max-w-[425px]'}>
        <DialogHeader>
          <DialogTitle>{t('commerce:inventory.adjust_stock', { defaultValue: 'Adjust Stock' })}</DialogTitle>
          <DialogDescription>
            {t('commerce:inventory.adjust_desc', { defaultValue: 'Manual stock adjustment for' })}{' '}
            <strong className="text-foreground">{title}</strong>
          </DialogDescription>
        </DialogHeader>

        {showMultiVariant ? (
          /* ── Multi-variant mode ─────────────────────────────────────── */
          <div className="space-y-4">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-end">Current Stock</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                  <TableHead className="w-[100px]">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variantRows.map((row) => {
                  const adj = variantAdjs.find(a => a.variant.variant_id === row.variant.variant_id) || row
                  return (
                    <TableRow key={row.variant.variant_id}>
                      <TableCell className="font-medium text-sm">{row.variant.variant_name}</TableCell>
                      <TableCell className="text-end">
                        <Badge variant={row.variant.total_qty_on_hand <= 0 ? 'destructive' : 'secondary'}>
                          {row.variant.total_qty_on_hand ?? 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateVariantAdj(row.variant.variant_id, 'type', 'add')}
                            className={`p-1 rounded text-xs font-semibold transition-colors ${adj.type === 'add' ? 'bg-green-100 text-green-700 ring-1 ring-green-400' : 'text-muted-foreground hover:bg-muted'}`}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateVariantAdj(row.variant.variant_id, 'type', 'remove')}
                            className={`p-1 rounded text-xs font-semibold transition-colors ${adj.type === 'remove' ? 'bg-red-100 text-red-700 ring-1 ring-red-400' : 'text-muted-foreground hover:bg-muted'}`}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="h-7 w-20 text-sm"
                          value={adj.qty || ''}
                          onChange={(e) => updateVariantAdj(row.variant.variant_id, 'qty', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Reason</label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inventory Count">Inventory Count</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                    <SelectItem value="Found">Found</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button onClick={handleMultiSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                Apply Adjustments
              </Button>
            </div>
          </div>
        ) : (
          /* ── Simple mode ─────────────────────────────────────────────── */
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('commerce:inventory.adjustment_type', { defaultValue: 'Adjustment Type' })}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="add">Add Stock (+)</SelectItem>
                        <SelectItem value="remove">Remove Stock (-)</SelectItem>
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
                    <FormLabel>Quantity</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Inventory Count">Inventory Count</SelectItem>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                        <SelectItem value="Found">Found</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl><Textarea className="resize-none" rows={2} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
