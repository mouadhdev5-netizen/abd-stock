import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { Plus, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form.tsx'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { ImageUpload } from '@/components/ui/ImageUpload'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx'

const productSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  name_ar: z.string().optional(),
  name_fr: z.string().optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  cost_price: z.coerce.number().min(0),
  sell_price: z.coerce.number().min(0),
  wholesale_price: z.coerce.number().min(0).optional(),
  min_sell_price: z.coerce.number().min(0).optional(),
  tax_rate: z.coerce.number().min(0).max(100),
  reorder_level: z.coerce.number().min(0),
  max_stock: z.coerce.number().min(0),
  min_stock: z.coerce.number().min(0),
  status: z.enum(['active', 'inactive', 'discontinued']),
  has_variants: z.boolean().default(false),
  has_serials: z.boolean().default(false),
  has_batches: z.boolean().default(false),
  track_expiry: z.boolean().default(false),
  is_service: z.boolean().default(false),
  image_url: z.string().optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    attributes: z.record(z.string()).default({}),
    cost_price: z.coerce.number().min(0),
    sell_price: z.coerce.number().min(0),
  })).optional()
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  initialData?: any
  onSuccess?: () => void
  onCancel?: () => void
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      name: '',
      sku: '',
      barcode: '',
      cost_price: 0,
      sell_price: 0,
      tax_rate: 19, // Default VAT
      reorder_level: 5,
      max_stock: 100,
      min_stock: 0,
      status: 'active',
      has_variants: false,
      has_serials: false,
      has_batches: false,
      track_expiry: false,
      is_service: false,
      image_url: '',
      variants: [],
    },
  })

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control: form.control,
    name: "variants",
  })

  const hasVariants = form.watch('has_variants')

  async function onSubmit(data: ProductFormValues) {
    if (!company?.id) return

    try {
      const { variants, image_url, ...productData } = data
      let productId = initialData?.id

      if (productId) {
        // Update
        const { error } = await supabase
          .from('products')
          .update(productData as never)
          .eq('id', productId)
        if (error) throw error
      } else {
        // Insert
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert({
            ...productData,
            thumbnail_url: image_url,
            company_id: company.id,
          } as any)
          .select()
          .single()
        
        if (error) throw error
        productId = (newProduct as any).id
      }

      // Handle Variants
      if (data.has_variants && variants && variants.length > 0) {
        const variantsToUpsert = variants.map(v => ({
          ...v,
          product_id: productId,
        }))
        const { error: variantError } = await supabase
          .from('product_variants')
          .upsert(variantsToUpsert as any)
        
        if (variantError) throw variantError
      }

      onSuccess?.()
    } catch (error: any) {
      console.error('Error saving product:', error)
      alert(`Failed to save product: ${error.message || JSON.stringify(error)}`)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <div className="mt-4 max-h-[60vh] overflow-y-auto px-1 py-2">
            <TabsContent value="basic" className="space-y-4">
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem className="flex-shrink-0">
                      <FormLabel>Product Image</FormLabel>
                      <FormControl>
                        <ImageUpload url={field.value || ''} onUpload={field.onChange} folder="products" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex-1 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PRD-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Scan or enter barcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Product description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cost_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sell_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Price *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wholesale_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wholesale Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tax_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reorder_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Level (Low Stock Alert)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Stock Limit</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="discontinued">Discontinued</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <FormField
                control={form.control}
                name="is_service"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Service Product</FormLabel>
                      <FormDescription>
                        This product is a service and does not track physical inventory.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="has_variants"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-4 rounded-lg border p-4 shadow-sm">
                    <div className="flex flex-row items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Has Variants</FormLabel>
                        <FormDescription>
                          Product has multiple variations like color, size, etc.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>

                    {hasVariants && (
                      <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Variants List</h4>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => appendVariant({ name: '', sku: '', cost_price: 0, sell_price: 0, attributes: {} })}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Variant
                          </Button>
                        </div>
                        {variantFields.map((field, index) => (
                          <div key={field.id} className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end bg-muted/20 p-4 rounded-md border border-border/50">
                            <FormField
                              control={form.control}
                              name={`variants.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel className="text-xs font-semibold">Variant Name <span className="text-destructive">*</span></FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g. Red / Size M" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.sku`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-semibold">SKU</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="SKU-RED-M" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.barcode`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-semibold">Barcode</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Scan..." />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.cost_price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-semibold">Cost Price</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.sell_price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-semibold">Sell Price</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="col-span-2 md:col-span-6 flex justify-end mt-2">
                              <Button 
                                type="button" 
                                variant="destructive" 
                                size="sm"
                                onClick={() => removeVariant(index)}
                              >
                                Remove Variant
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="has_serials"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Track Serial Numbers</FormLabel>
                      <FormDescription>
                        Require unique serial numbers per unit.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="track_expiry"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Track Expiration</FormLabel>
                      <FormDescription>
                        Track expiration dates for batches.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
