import { useState, useMemo } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus, Trash2, Search, Barcode } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

const salesItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  product_name: z.string(),
  quantity: z.coerce.number().min(1),
  unit_price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  tax_rate: z.coerce.number().min(0).default(19),
})

const salesOrderSchema = z.object({
  customer_id: z.string().optional(), // Optional for walk-in
  status: z.enum(['pending', 'processing', 'completed', 'delivered', 'cancelled']).default('completed'),
  payment_status: z.enum(['pending', 'partial', 'paid']).default('paid'),
  payment_method: z.string().default('cash'),
  amount_paid: z.coerce.number().min(0),
  discount_total: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(salesItemSchema).min(1, 'At least one item is required'),
})

type SalesOrderFormValues = z.infer<typeof salesOrderSchema>

interface SalesFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function SalesForm({ onSuccess, onCancel }: SalesFormProps) {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()
  const [productSearch, setProductSearch] = useState('')

  // Fetch Customers
  const { data: customers } = useQuery<any[]>({
    queryKey: ['customers', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('customers').select('id, name, current_balance').eq('company_id', company.id).eq('is_active', true)
      return data || []
    },
    enabled: !!company?.id,
  })

  // Fetch Products
  const { data: products } = useQuery<any[]>({
    queryKey: ['products_search', company?.id, productSearch],
    queryFn: async () => {
      if (!company?.id) return []
      const query = supabase.from('v_product_stock').select('*').eq('company_id', company.id).eq('status', 'active')
      if (productSearch) {
        query.ilike('name', `%${productSearch}%`)
      }
      const { data } = await query.limit(10)
      return data || []
    },
    enabled: !!company?.id,
  })

  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      customer_id: 'none',
      status: 'completed',
      payment_status: 'paid',
      payment_method: 'cash',
      amount_paid: 0,
      discount_total: 0,
      notes: '',
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    name: 'items',
    control: form.control,
  })

  // Calculate totals dynamically
  const formItems = form.watch('items')
  const discountTotal = form.watch('discount_total')
  const amountPaid = form.watch('amount_paid')

  const { subtotal, taxTotal, grandTotal, dueAmount } = useMemo(() => {
    let sub = 0
    let tax = 0
    formItems.forEach(item => {
      const lineTotal = item.quantity * item.unit_price
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

  // Update paid amount automatically if user selects 'Paid' status (unless they manually override)
  const paymentStatus = form.watch('payment_status')

  const addProductToCart = (product: any) => {
    const existingIndex = formItems.findIndex(item => item.product_id === product.product_id)
    if (existingIndex >= 0) {
      // Increment qty
      const currentQty = form.getValues(`items.${existingIndex}.quantity`)
      form.setValue(`items.${existingIndex}.quantity`, currentQty + 1)
    } else {
      // Add new
      append({
        product_id: product.product_id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.sell_price,
        discount: 0,
        tax_rate: 19, // Default VAT
      })
    }
    setProductSearch('')
  }

  async function onSubmit(data: SalesOrderFormValues) {
    if (!company?.id) return

    try {
      // 1. Generate SO Number (Simple logic: SO-YYYYMMDD-XXXX)
      const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, '')
      const randomStr = Math.floor(1000 + Math.random() * 9000)
      const soNumber = `SO-${dateStr}-${randomStr}`

      // 2. Insert Sales Order
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          company_id: company.id,
          so_number: soNumber,
          customer_id: data.customer_id && data.customer_id !== 'none' ? data.customer_id : null,
          status: data.status,
          payment_status: data.payment_status,
          subtotal,
          tax_total: taxTotal,
          discount_total: data.discount_total,
          total: grandTotal,
          paid_amount: data.amount_paid,
          due_amount: dueAmount,
          notes: data.notes,
        } as any)
        .select()
        .single()

      if (orderError) throw orderError

      // 3. Insert Sales Order Items
      const orderItems = data.items.map(item => ({
        sales_order_id: (order as any).id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        tax_rate: item.tax_rate,
        total: (item.quantity * item.unit_price) - item.discount + (((item.quantity * item.unit_price) - item.discount) * (item.tax_rate / 100))
      }))

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems as any)

      if (itemsError) throw itemsError

      // Note: Database triggers will automatically handle stock deductions and customer balances!
      
      onSuccess?.()
    } catch (error: any) {
      console.error('Error creating sale:', error)
      alert(`Failed to create sale: ${error.message || JSON.stringify(error)}`)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col md:flex-row gap-6">
        {/* Left Side: Cart & Products */}
        <div className="flex-1 space-y-4">
          <div className="border rounded-md p-4 bg-muted/30">
            <h3 className="font-semibold mb-2">{t('add_products')}</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('search_products')}
                className="pl-8"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            {productSearch && products && products.length > 0 && (
              <div className="mt-2 border rounded-md bg-background shadow-md max-h-48 overflow-auto">
                {products.map(p => (
                  <div 
                    key={p.product_id} 
                    className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                    onClick={() => addProductToCart(p)}
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{t('stock')}: {p.total_qty_available}</div>
                    </div>
                    <div className="font-semibold">{formatCurrency(p.sell_price, company?.currency || 'DZD')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-md">
            <div className="bg-muted px-4 py-2 font-semibold border-b flex justify-between">
              <span>{t('cart_items')}</span>
              <Badge variant="secondary">{fields.length} {t('items')}</Badge>
            </div>
            <div className="p-4 space-y-4 max-h-[40vh] overflow-auto">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('cart_empty')}
                </div>
              ) : (
                fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <div className="font-medium">{field.product_name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(form.getValues(`items.${index}.unit_price`), company?.currency || 'DZD')} / {t('unit')}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full sm:w-auto">
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
            <h3 className="font-semibold border-b pb-2">{t('checkout_details')}</h3>
            
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('labels.customer', { ns: 'common' })}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('walk_in_customer')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t('walk_in_customer')}</SelectItem>
                      {customers?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('labels.subtotal', { ns: 'common' })}</span>
                <span>{formatCurrency(subtotal, company?.currency || 'DZD')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('labels.tax', { ns: 'common' })}</span>
                <span>{formatCurrency(taxTotal, company?.currency || 'DZD')}</span>
              </div>
              <FormField
                control={form.control}
                name="discount_total"
                render={({ field }) => (
                  <FormItem className="flex justify-between items-center space-y-0">
                    <FormLabel className="text-sm font-normal text-muted-foreground">{t('labels.discount', { ns: 'common' })}</FormLabel>
                    <FormControl>
                      <Input type="number" className="w-24 h-8 text-right" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-between font-bold text-lg pt-2 border-t text-primary">
                <span>{t('labels.total', { ns: 'common' })}</span>
                <span>{formatCurrency(grandTotal, company?.currency || 'DZD')}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <FormField
                control={form.control}
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('payment_status')}</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val)
                      if (val === 'paid') form.setValue('amount_paid', grandTotal)
                      if (val === 'pending') form.setValue('amount_paid', 0)
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('labels.select', { ns: 'common' })} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paid">{t('paid')}</SelectItem>
                        <SelectItem value="partial">{t('partial')}</SelectItem>
                        <SelectItem value="pending">{t('pending')}</SelectItem>
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
                    <FormLabel>{t('amount_paid')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                    </FormControl>
                    <div className="text-xs text-right mt-1">
                      {t('due')}: <span className="font-semibold text-destructive">{formatCurrency(dueAmount, company?.currency || 'DZD')}</span>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                {t('actions.cancel', { ns: 'common' })}
              </Button>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || fields.length === 0}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('complete_sale')}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
