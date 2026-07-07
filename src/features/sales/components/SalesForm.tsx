import { useState, useMemo, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Trash2 } from 'lucide-react'
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
import { InlineSearch } from '@/components/ui/InlineSearch'
import { QuickAddCustomerForm } from './QuickAddCustomerForm'
import { generateInvoicePDF } from '@/lib/export'

const salesItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  variant_id: z.string().nullable().optional(),
  product_name: z.string(),
  quantity: z.coerce.number().min(1),
  unit_price: z.coerce.number().min(0),
  catalog_price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  tax_rate: z.coerce.number().min(0).default(19),
  max_stock: z.number().optional(),
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
  const { t } = useTranslation(['common', 'commerce'])
  const { company } = useAuthStore()
  const [productSearch, setProductSearch] = useState('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)

  // Fetch Customers
  const { data: customers, refetch: refetchCustomers } = useQuery<any[]>({
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
      const query = supabase.from('v_product_variants_stock').select('*').eq('company_id', company.id).eq('status', 'active')
      if (productSearch) {
        query.ilike('full_name', `%${productSearch}%`)
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
    let due = grand - amountPaid
    if (due < 0) due = 0 // Never show negative due

    return {
      subtotal: sub,
      taxTotal: tax,
      grandTotal: grand,
      dueAmount: due,
    }
  }, [formItems, discountTotal, amountPaid])

  // Bug 1 Fix: Update paid amount automatically if user selects 'Paid' status or grandTotal changes
  const paymentStatus = form.watch('payment_status')
  
  useEffect(() => {
    if (paymentStatus === 'paid') {
      form.setValue('amount_paid', grandTotal, { shouldValidate: true })
    } else if (paymentStatus === 'pending') {
      form.setValue('amount_paid', 0, { shouldValidate: true })
    }
  }, [paymentStatus, grandTotal, form])

  const addProductToCart = (product: any) => {
    const existingIndex = formItems.findIndex(item => 
      item.product_id === product.product_id && item.variant_id === product.variant_id
    )
    if (existingIndex >= 0) {
      // Increment qty
      const currentQty = form.getValues(`items.${existingIndex}.quantity`)
      if (currentQty < product.total_qty_available) {
        form.setValue(`items.${existingIndex}.quantity`, currentQty + 1)
      } else {
        alert(t('commerce:sales.stock_limit_reached', { defaultValue: 'Not enough stock available.' }))
      }
    } else {
      // Add new
      if (product.total_qty_available <= 0) {
        alert(t('commerce:sales.out_of_stock', { defaultValue: 'This item is out of stock.' }))
        return
      }
      append({
        product_id: product.product_id,
        variant_id: product.variant_id,
        product_name: product.full_name,
        quantity: 1,
        unit_price: product.sell_price,
        catalog_price: product.sell_price,
        discount: 0,
        tax_rate: 19, // Default VAT
        max_stock: product.total_qty_available
      })
    }
    setProductSearch('')
  }

  const handleBarcodeScan = async (barcode: string) => {
    if (!company?.id || !barcode) return
    const { data } = await supabase
      .from('v_product_variants_stock')
      .select('*')
      .eq('company_id', company.id)
      .eq('barcode', barcode)
      .single()
      
    if (data) {
      addProductToCart(data)
    } else {
      alert(t('commerce:sales.product_not_found_barcode', { defaultValue: `No product found for barcode: ${barcode}` }))
      setProductSearch('')
    }
  }

  const handleProductSearchSelect = async (query: string) => {
    if (!company?.id || !query) return
    const { data } = await supabase
      .from('v_product_variants_stock')
      .select('*')
      .eq('company_id', company.id)
      .ilike('full_name', `%${query}%`)
      .limit(1)
      .single()
      
    if (data) {
      addProductToCart(data)
    }
  }

  async function onSubmit(data: SalesOrderFormValues) {
    if (!company?.id) return
    
    // Empty cart guard
    if (data.items.length === 0) {
      alert(t('commerce:sales.empty_cart', { defaultValue: 'Cannot create a sale with an empty cart.' }))
      return
    }

    // Stock validation guard
    const overstockItem = data.items.find(item => item.max_stock !== undefined && item.quantity > item.max_stock)
    if (overstockItem) {
      alert(`Cannot sell ${overstockItem.quantity} of ${overstockItem.product_name}. Only ${overstockItem.max_stock} available in stock.`)
      return
    }

    try {
      // 1. Generate SO Number
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
        } as never)
        .select()
        .single()

      if (orderError) throw orderError

      // 3. Insert Sales Order Items
      const orderItems = data.items.map(item => ({
        sales_order_id: (order as any).id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount,
        tax_rate: item.tax_rate,
        total: (item.quantity * item.unit_price) - item.discount + (((item.quantity * item.unit_price) - item.discount) * (item.tax_rate / 100))
      }))

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems as never)

      if (itemsError) throw itemsError

      // Bug 4 Fix: Customer Debt Update
      if (dueAmount > 0 && data.customer_id && data.customer_id !== 'none') {
        const { data: customerData } = await supabase
          .from('customers')
          .select('current_balance')
          .eq('id', data.customer_id)
          .single()
          
        if (customerData) {
          await supabase
            .from('customers')
            .update({ current_balance: (customerData as any).current_balance + dueAmount } as never)
            .eq('id', data.customer_id)
        }
      }
      
      // 3.6 Receipt After Sale
      if (window.confirm(`Sale completed! Order: ${soNumber}\n\nWould you like to print the receipt?`)) {
        generateInvoicePDF(order as any, company, 'Sale')
      }
      
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
            <InlineSearch
              value={productSearch}
              onChange={(val) => {
                setProductSearch(val)
              }}
              placeholder={t('commerce:sales.search_products_barcode', { defaultValue: 'Search products or scan barcode...' })}
              onBarcodeScan={handleBarcodeScan}
            />
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
                        <div className="text-xs text-muted-foreground">{t('common:labels.stock', { defaultValue: 'Stock' })}: {p.total_qty_available}</div>
                      </div>
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
                fields.map((field, index) => {
                  const qty = form.watch(`items.${index}.quantity`) || 0
                  const price = form.watch(`items.${index}.unit_price`) || 0
                  const isPriceOverridden = price !== field.catalog_price

                  return (
                    <div key={field.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-[150px]">
                        <div className="font-medium text-sm line-clamp-2">{field.product_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Subtotal: <span className="font-medium text-foreground">{formatCurrency(qty * price, company?.currency || 'DZD')}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="w-20">
                              <FormLabel className="text-[10px] text-muted-foreground">{t('labels.quantity', { ns: 'common', defaultValue: 'Qty' })}</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" className="h-8" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.unit_price`}
                          render={({ field }) => (
                            <FormItem className="w-28">
                              <FormLabel className="text-[10px] text-muted-foreground">{t('commerce:sales.price_override', { defaultValue: 'Unit Price' })}</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  min="0"
                                  className={`h-8 ${isPriceOverridden ? 'border-orange-400 focus-visible:ring-orange-400' : ''}`}
                                  {...field} 
                                  value={field.value ?? ''} 
                                  onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} 
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="pt-5">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('commerce:sales.walk_in', { defaultValue: 'Walk-in Customer' })} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t('commerce:sales.walk_in', { defaultValue: 'Walk-in Customer' })}</SelectItem>
                      {customers?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                      {/* Fixed bottom option to add new customer */}
                      <div className="p-1 mt-1 border-t">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="w-full justify-start text-sm h-8 font-normal"
                          onClick={(e) => {
                            e.preventDefault()
                            setShowAddCustomer(true)
                          }}
                        >
                          ➕ {t('commerce:sales.add_new_customer', { defaultValue: 'Add new customer' })}
                        </Button>
                      </div>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showAddCustomer && (
              <QuickAddCustomerForm 
                onSuccess={(newId, newName) => {
                  refetchCustomers().then(() => {
                    form.setValue('customer_id', newId)
                    setShowAddCustomer(false)
                    alert(t('commerce:sales.customer_added', { defaultValue: 'Customer added successfully' }))
                  })
                }}
                onCancel={() => setShowAddCustomer(false)}
              />
            )}

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
                      <Input type="number" className="w-24 h-8 text-end" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <div className="text-xs text-end mt-1 flex justify-end items-center gap-1">
                      {t('due')}: <span className={`font-semibold ${dueAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {formatCurrency(dueAmount, company?.currency || 'DZD')}
                      </span>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>
                {t('actions.cancel', { ns: 'common' })}
              </Button>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || fields.length === 0}>
              {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t('complete_sale')}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
