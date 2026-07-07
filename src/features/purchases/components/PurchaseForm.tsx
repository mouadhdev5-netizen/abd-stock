import { useState, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Trash2, Search } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

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
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

const purchaseItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  variant_id: z.string().nullable().optional(),
  product_name: z.string(),
  quantity: z.coerce.number().min(1),
  unit_cost: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  tax_rate: z.coerce.number().min(0).default(19),
})

const purchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  status: z.enum(['pending', 'processing', 'approved', 'received', 'cancelled']).default('received'),
  payment_status: z.enum(['pending', 'partial', 'paid']).default('paid'),
  payment_method: z.string().default('cash'),
  amount_paid: z.coerce.number().min(0),
  discount_total: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'At least one item is required'),
})

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>

interface PurchaseFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function PurchaseForm({ onSuccess, onCancel }: PurchaseFormProps) {
  const { t } = useTranslation(['commerce', 'common'])
  const { company } = useAuthStore()
  const [productSearch, setProductSearch] = useState('')

  // Fetch Suppliers
  const { data: suppliers } = useQuery<any[]>({
    queryKey: ['suppliers', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('suppliers').select('id, name, current_balance').eq('company_id', company.id).eq('is_active', true)
      return data || []
    },
    enabled: !!company?.id,
  })

  // Fetch Products
  const { data: products } = useQuery<any[]>({
    queryKey: ['products_search', company?.id, productSearch],
    queryFn: async () => {
      if (!company?.id) return []
      const query = supabase.from('v_product_variants_stock').select('*').eq('company_id', company.id).eq('status', 'active')
      if (productSearch) {
        query.ilike('full_name', `%${productSearch}%`)
      }
      const { data } = await query.limit(10)
      return data || []
    },
    enabled: !!company?.id,
  })

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplier_id: '',
      status: 'received',
      payment_status: 'paid',
      payment_method: 'cash',
      amount_paid: 0,
      discount_total: 0,
      notes: '',
      items: [],
    },
  })

  const { fields: formItems, append, remove } = useFieldArray({
    name: 'items',
    control: form.control,
  })

  const discountTotal = form.watch('discount_total')
  const amountPaid = form.watch('amount_paid')

  const { subtotal, taxTotal, grandTotal, dueAmount } = useMemo(() => {
    let sub = 0
    let tax = 0
    formItems.forEach(item => {
      const lineTotal = item.quantity * item.unit_cost
      const lineDiscount = item.discount
      const taxableAmount = lineTotal - lineDiscount
      const lineTax = taxableAmount * (item.tax_rate / 100)

      sub += taxableAmount
      tax += lineTax
    })

    const grand = sub + tax - discountTotal
    const due = grand - amountPaid

    return {
      subtotal: sub,
      taxTotal: tax,
      grandTotal: grand,
      dueAmount: due,
    }
  }, [formItems, discountTotal, amountPaid])

  const addProductToCart = (product: any) => {
    const existingIndex = formItems.findIndex(item => item.product_id === product.product_id && item.variant_id === product.variant_id)
    if (existingIndex >= 0) {
      const currentQty = form.getValues(`items.${existingIndex}.quantity`)
      form.setValue(`items.${existingIndex}.quantity`, currentQty + 1)
    } else {
      append({
        product_id: product.product_id,
        variant_id: product.variant_id,
        product_name: product.full_name || product.name,
        quantity: 1,
        unit_cost: product.cost_price, // Use cost_price for purchases
        discount: 0,
        tax_rate: 19,
      })
    }
    setProductSearch('')
  }

  async function onSubmit(data: PurchaseOrderFormValues) {
    if (!company?.id) return

    try {
      // 1. Generate PO Number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randomStr = Math.floor(1000 + Math.random() * 9000)
      const poNumber = `PO-${dateStr}-${randomStr}`

      // 2. Insert PO
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          company_id: company.id,
          po_number: poNumber,
          supplier_id: data.supplier_id,
          status: data.status,
          subtotal: subtotal,
          tax_amount: taxTotal,
          discount_amount: data.discount_total,
          total: grandTotal,
          paid_amount: data.amount_paid,
          notes: data.notes,
        } as any)
        .select()
        .single()

      if (orderError) throw orderError

      // 3. Insert PO Items
      const orderItems = data.items.map(item => ({
        po_id: (order as any).id,
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        discount_amount: item.discount,
        tax_rate: item.tax_rate,
        subtotal: (item.quantity * item.unit_cost) - item.discount,
        total: (item.quantity * item.unit_cost) - item.discount + (((item.quantity * item.unit_cost) - item.discount) * (item.tax_rate / 100))
      }))

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(orderItems as any)

      if (itemsError) throw itemsError

      onSuccess?.()
    } catch (error: any) {
      console.error('Error creating purchase:', error)
      alert(`Failed to create purchase: ${error.message || JSON.stringify(error)}`)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col md:flex-row gap-6">
        {/* Left Side: Cart & Products */}
        <div className="flex-1 space-y-4">
          <div className="border rounded-md p-4 bg-muted/30">
            <h3 className="font-semibold mb-2">Add Products</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('common:labels.search_placeholder', { defaultValue: 'Search products by name...' })}
                className="ps-8"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            {productSearch && products && products.length > 0 && (
              <div className="mt-2 border rounded-md bg-background shadow-md max-h-48 overflow-auto">
                {products.map(p => (
                  <div
                    key={p.variant_id ? p.variant_id : p.product_id}
                    className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center gap-3"
                    onClick={() => addProductToCart(p)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {p.thumbnail_url ? (
                        <img src={p.thumbnail_url} alt={p.full_name} className="w-10 h-10 object-cover rounded bg-muted" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                          Img
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm">{p.full_name}</div>
                        <div className="text-xs text-muted-foreground">Current Stock: {p.total_qty_available}</div>
                      </div>
                    </div>
                    <div className="font-semibold">{formatCurrency(p.cost_price, company?.currency || 'DZD')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-md">
            <div className="bg-muted px-4 py-2 font-semibold border-b flex justify-between">
              <span>Purchase Items</span>
              <Badge variant="secondary">{formItems.length} Items</Badge>
            </div>
            <div className="p-4 space-y-4 max-h-[40vh] overflow-auto">
              {formItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Purchase list is empty. Add products above.
                </div>
              ) : (
                formItems.map((field, index) => (
                  <div key={field.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <div className="font-medium">{field.product_name}</div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unit_cost`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <FormControl>
                              <Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-20">
                            <FormControl>
                              <Input type="number" min="1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Checkout Details */}
        <div className="w-full md:w-[350px] space-y-4">
          <div className="border rounded-md p-4 bg-card shadow-sm space-y-4">
            <h3 className="font-semibold border-b pb-2">Order Details</h3>

            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common:labels.select_supplier', { defaultValue: 'Select supplier' })} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers?.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal, company?.currency || 'DZD')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(taxTotal, company?.currency || 'DZD')}</span>
              </div>
              <FormField
                control={form.control}
                name="discount_total"
                render={({ field }) => (
                  <FormItem className="flex justify-between items-center space-y-0">
                    <FormLabel className="text-sm font-normal text-muted-foreground">Discount</FormLabel>
                    <FormControl>
                      <Input type="number" className="w-24 h-8 text-end" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-between font-bold text-lg pt-2 border-t text-primary">
                <span>Total</span>
                <span>{formatCurrency(grandTotal, company?.currency || 'DZD')}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <FormField
                control={form.control}
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val)
                      if (val === 'paid') form.setValue('amount_paid', grandTotal)
                      if (val === 'pending') form.setValue('amount_paid', 0)
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common:labels.select_status', { defaultValue: 'Select status' })} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partial">Partial Payment</SelectItem>
                        <SelectItem value="pending">Unpaid (Credit)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount_paid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                    </FormControl>
                    <div className="text-xs text-end mt-1">
                      Due: <span className="font-semibold text-destructive">{formatCurrency(dueAmount, company?.currency || 'DZD')}</span>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || formItems.length === 0}>
              {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Create PO
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
