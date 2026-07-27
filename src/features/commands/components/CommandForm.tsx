import { useState, useMemo } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
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
import { InlineProductSearch } from '@/features/sales/components/InlineProductSearch'
import { InlineSearch } from '@/components/ui/InlineSearch'
import { ProductCombobox } from '@/components/ui/ProductCombobox'
import { QuickAddCustomerForm } from '@/features/sales/components/QuickAddCustomerForm'
import { createShipment, YalidinShipmentInput } from '@/lib/yalidin'
import { algeriaWilayas } from '@/data/algeria-wilayas'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'

const commandItemSchema = z.object({
  product_id: z.string().min(1),
  variant_id: z.string().nullable().optional(),
  product_name: z.string(),
  quantity: z.coerce.number().min(1),
  unit_price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  max_stock: z.number().optional()
})

const commandOrderSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  delivery_address: z.string().min(5, 'Delivery address must be at least 5 characters'),
  wilaya: z.string().optional().default('Alger'),
  commune: z.string().optional().default('Alger Centre'),
  notes: z.string().optional(),
  items: z.array(commandItemSchema).min(1, 'At least one item is required'),
  send_to_delivery: z.boolean().default(false),
})

type CommandFormValues = z.infer<typeof commandOrderSchema>

interface CommandFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function CommandForm({ onSuccess, onCancel }: CommandFormProps) {
  const { t } = useTranslation(['common', 'commerce'])
  const { company } = useAuthStore()
  const { toast } = useToast()
  const [productSearch, setProductSearch] = useState('')
  const [showAddCustomer, setShowAddCustomer] = useState(false)

  // Fetch Customers
  const { data: customers, refetch: refetchCustomers } = useQuery<any[]>({
    queryKey: ['customers', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data } = await supabase.from('customers').select('*').eq('company_id', company.id).eq('is_active', true)
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

  const form = useForm<CommandFormValues>({
    resolver: zodResolver(commandOrderSchema),
    defaultValues: {
      customer_id: '',
      delivery_address: '',
      wilaya: 'Alger',
      commune: 'Alger Centre',
      notes: '',
      items: [],
      send_to_delivery: false,
    },
  })

  const { fields, append, remove } = useFieldArray({
    name: 'items',
    control: form.control,
  })

  const formItems = useWatch({ name: 'items', control: form.control }) || []

  const { subtotal, grandTotal } = useMemo(() => {
    let sub = 0
    formItems.forEach(item => {
      sub += item.quantity * item.unit_price
    })
    return {
      subtotal: sub,
      grandTotal: sub, // Assuming no tax/discount logic for commands for now based on prompt
    }
  }, [formItems])

  const addProductToCart = (product: any) => {
    const existingIndex = formItems.findIndex(item => 
      item.product_id === product.product_id && item.variant_id === product.variant_id
    )
    if (existingIndex >= 0) {
      const currentQty = form.getValues(`items.${existingIndex}.quantity`)
      if (currentQty < product.total_qty_available) {
        form.setValue(`items.${existingIndex}.quantity`, currentQty + 1)
      } else {
        alert(t('commerce:sales.stock_limit_reached', { defaultValue: 'Not enough stock available.' }))
      }
    } else {
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
        discount: 0,
        max_stock: product.total_qty_available
      })
    }
    setProductSearch('')
  }

  const handleBarcodeScan = async (barcode: string) => {
    if (!company?.id || !barcode) return
    const { data } = await supabase.from('v_product_variants_stock').select('*').eq('company_id', company.id).eq('barcode', barcode).single()
    if (data) addProductToCart(data)
    else {
      alert(t('commerce:sales.product_not_found_barcode', { defaultValue: `No product found for barcode: ${barcode}` }))
      setProductSearch('')
    }
  }

  const handleProductSearchSelect = async (query: string) => {
    if (!company?.id || !query) return
    const { data } = await supabase.from('v_product_variants_stock').select('*').eq('company_id', company.id).ilike('full_name', `%${query}%`).limit(1).single()
    if (data) addProductToCart(data)
  }

  async function onSubmit(data: CommandFormValues) {
    if (!company?.id) return

    if (data.items.length === 0) {
      toast({ title: 'Error', description: t('commerce:sales.empty_cart', { defaultValue: 'Cannot create an order with an empty cart.' }), variant: 'destructive' })
      return
    }

    const overstockItem = data.items.find(item => item.max_stock !== undefined && item.quantity > item.max_stock)
    if (overstockItem) {
      toast({ title: 'Error', description: `Cannot sell ${overstockItem.quantity} of ${overstockItem.product_name}. Only ${overstockItem.max_stock} available in stock.`, variant: 'destructive' })
      return
    }

    try {
      // 1. Insert into commands table
      const { data: command, error: commandError } = await supabase
        .from('commands')
        .insert({
          company_id: company.id,
          customer_id: data.customer_id,
          delivery_address: data.delivery_address,
          notes: data.notes,
          total: grandTotal,
          status: 'pending',
        } as never)
        .select()
        .single()

      if (commandError) throw commandError

      // 2. Insert command items
      const commandItems = data.items.map(item => ({
        command_id: (command as any).id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_name: item.product_name,
      }))

      const { error: itemsError } = await supabase
        .from('command_items')
        .insert(commandItems as never)

      if (itemsError) throw itemsError

      if (itemsError) throw itemsError

      // 3. DBD API Call
      if (data.send_to_delivery) {
        const customer = customers?.find(c => c.id === data.customer_id)
        const customerNames = (customer?.name || 'Walk-in Customer').split(' ')
        const firstname = customerNames[0] || 'Unknown'
        const familyname = customerNames.slice(1).join(' ') || 'Unknown'
        const product_list = data.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')

        const yalidinInput: YalidinShipmentInput = {
          order_id: (command as any).id,
          firstname,
          familyname,
          contact_phone: customer?.phone || '0000000000',
          address: data.delivery_address,
          to_wilaya_name: data.wilaya,
          to_commune_name: data.commune,
          product_list,
          price: grandTotal,
          do_insurance: false,
          is_free_shipping: false,
        }

        try {
          const responseArray = await createShipment([yalidinInput])
          const yalidinTrackingId = responseArray[0]?.tracking

          if (yalidinTrackingId) {
            await supabase
              .from('commands')
              .update({ yalidin_tracking_id: yalidinTrackingId, status: 'confirmed' } as never)
              .eq('id', (command as any).id)
              
            toast({ title: 'Success', description: `Command Created & Sent to DBD! Tracking: ${yalidinTrackingId}` })
          } else {
            toast({ title: 'Warning', description: 'Command Created internally. DBD did not return tracking ID.' })
          }
        } catch (yalidinErr: any) {
          console.error('DBD error:', yalidinErr)
          toast({ title: 'Warning', description: 'Submitted internally, delivery service failed. Retry from En Cours page. Error: ' + yalidinErr.message, variant: 'destructive' })
        }
      } else {
        toast({ title: 'Success', description: 'Command created successfully (internal only).' })
      }
      
      onSuccess?.()
    } catch (error: any) {
      console.error('Error creating command:', error)
      toast({ title: 'Error', description: `Failed to create command: ${error.message || JSON.stringify(error)}`, variant: 'destructive' })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col md:flex-row gap-6">
        {/* Left Side: Cart & Products */}
        <div className="flex-1 space-y-4">
          <div className="border rounded-md p-4 bg-muted/30">
            <h3 className="font-semibold mb-2">{t('add_products')}</h3>
            <InlineProductSearch
              companyId={company?.id}
              onSelectProduct={(product) => addProductToCart(product)}
            />
          </div>

          <div className="border rounded-md">
            <div className="bg-muted px-4 py-2 font-semibold border-b flex justify-between">
              <span>{t('cart_items')}</span>
              <Badge variant="secondary">{fields.length} {t('items')}</Badge>
            </div>
            <div className="p-4 space-y-4 max-h-[40vh] overflow-auto">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Cart is empty</div>
              ) : (
                fields.map((field, index) => {
                  const qty = form.watch(`items.${index}.quantity`) || 0
                  const price = form.watch(`items.${index}.unit_price`) || 0

                  return (
                    <div key={field.id} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-[150px]">
                        <div className="font-medium text-sm line-clamp-2">{field.product_name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Line Total: <span className="font-medium text-foreground">{formatCurrency(qty * price, company?.currency || 'DZD')}</span>
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
                                <Input type="number" min="1" className="h-8" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.unit_price`}
                          render={({ field }) => (
                            <FormItem className="w-28">
                              <FormLabel className="text-[10px] text-muted-foreground">{t('commerce:commands.unit_cost', { defaultValue: 'Unit Cost' })}</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" className="h-8" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value)} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="pt-5">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-destructive">
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
            <h3 className="font-semibold border-b pb-2">Command Details</h3>
            
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
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
                          ➕ Add new customer
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
                onSuccess={(newId) => {
                  refetchCustomers().then(() => {
                    form.setValue('customer_id', newId)
                    setShowAddCustomer(false)
                    alert('Customer added successfully')
                  })
                }}
                onCancel={() => setShowAddCustomer(false)}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="wilaya"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wilaya (For DBD)</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={algeriaWilayas.map(w => ({ value: w.name_fr, label: `${w.code} - ${w.name_fr}` }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select Wilaya"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="commune"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commune</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="delivery_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Delivery Address *</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none" rows={3} {...field} />
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
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none" rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="send_to_delivery"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-muted/20">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="cursor-pointer">
                      Envoyer automatiquement au service de livraison (DBD)
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between font-bold text-lg text-primary">
                <span>Grand Total</span>
                <span>{formatCurrency(grandTotal, company?.currency || 'DZD')}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>
                Cancel
              </Button>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting || fields.length === 0}>
              {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Create Command
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
