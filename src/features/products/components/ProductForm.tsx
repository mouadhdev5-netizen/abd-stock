import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { Plus, Loader2, Trash2 } from 'lucide-react'
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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ImageUpload } from '@/components/ui/ImageUpload'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  name_ar: z.string().optional(),
  name_fr: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  cost_price: z.coerce.number().min(0),
  sell_price: z.coerce.number().min(0),
  reorder_level: z.coerce.number().min(0).default(5),
  status: z.enum(['active', 'inactive']).default('active'),
  has_variants: z.boolean().default(false),
  image_url: z.string().optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    cost_price: z.coerce.number().min(0),
    sell_price: z.coerce.number().min(0),
    status: z.enum(['active', 'inactive']).default('active'),
  })).optional()
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  initialData?: any
  onSuccess?: () => void
  onCancel?: () => void
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const { t } = useTranslation('commerce')
  const { company } = useAuthStore()

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      name: '',
      name_ar: '',
      name_fr: '',
      sku: '',
      barcode: '',
      cost_price: 0,
      sell_price: 0,
      reorder_level: 5,
      status: 'active',
      has_variants: false,
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
      let productId = initialData?.id || initialData?.product_id

      if (productId) {
        // Update
        const { error } = await supabase
          .from('products')
          .update({
            ...productData,
            thumbnail_url: image_url,
          } as never)
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
        const mappedVariants = variants.map(v => ({
          product_id: productId,
          id: v.id || undefined,
          name: v.name,
          sku: v.sku || null,
          barcode: v.barcode || null,
          cost_price: v.cost_price,
          sell_price: v.sell_price,
          is_active: v.status !== 'inactive',
        }))

        const newVariants = mappedVariants.filter(v => !v.id)
        const existingVariants = mappedVariants.filter(v => v.id)

        if (newVariants.length > 0) {
          const variantsToInsert = newVariants.map(({ id, ...rest }) => rest)
          const { error: insertError } = await supabase
            .from('product_variants')
            .insert(variantsToInsert as never)
          if (insertError) throw insertError
        }

        if (existingVariants.length > 0) {
          const { error: updateError } = await supabase
            .from('product_variants')
            .upsert(existingVariants as never, { onConflict: 'id' })
          if (updateError) throw updateError
        }
      }

      alert(t('products.product_saved', { defaultValue: 'Product saved successfully' }))
      onSuccess?.()
    } catch (error: any) {
      console.error('Error saving product:', error)
      alert(`Failed to save product: ${error.message || JSON.stringify(error)}`)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-h-[80vh] px-4 overflow-y-auto">
        
        {/* ROW 1: Image & Names */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('products.image', { defaultValue: 'Product Image' })}</FormLabel>
                  <FormControl>
                    <ImageUpload url={field.value || ''} onUpload={field.onChange} folder="products" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="md:col-span-3 space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('products.name', { defaultValue: 'Product Name' })} *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. MacBook Pro M3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('products.name_ar', { defaultValue: 'Name (Arabic)' })}</FormLabel>
                    <FormControl>
                      <Input placeholder="الاسم بالعربية" dir="rtl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name_fr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('products.name_fr', { defaultValue: 'Name (French)' })}</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du produit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {/* ROW 2: Codes */}
        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('products.sku', { defaultValue: 'SKU' })}</FormLabel>
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
                <FormLabel>{t('products.barcode', { defaultValue: 'Barcode' })}</FormLabel>
                <FormControl>
                  <Input placeholder="Scan or enter barcode" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ROW 3: Pricing */}
        <div className="grid grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border border-border/50">
          <FormField
            control={form.control}
            name="cost_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('products.cost_price', { defaultValue: 'Cost Price' })}</FormLabel>
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
                <FormLabel>{t('products.sell_price', { defaultValue: 'Sell Price' })} *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ROW 4: Settings */}
        <div className="grid grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="reorder_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('products.reorder_level', { defaultValue: 'Reorder Level' })}</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('products.status', { defaultValue: 'Status' })}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">{t('products.active', { defaultValue: 'Active' })}</SelectItem>
                    <SelectItem value="inactive">{t('products.inactive', { defaultValue: 'Inactive' })}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ROW 5: Variants Toggle & Section */}
        <div className="border-t pt-6">
          <FormField
            control={form.control}
            name="has_variants"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-semibold">{t('products.variants', { defaultValue: 'Variants' })}</FormLabel>
                  <FormDescription>
                    Enable if this product has multiple sizes, colors, etc.
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

          {hasVariants && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">{t('products.variants', { defaultValue: 'Variants List' })}</h4>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => appendVariant({ name: '', sku: '', barcode: '', cost_price: 0, sell_price: 0, status: 'active' })}
                >
                  <Plus className="h-4 w-4 me-2" />
                  {t('products.add_variant', { defaultValue: 'Add Variant' })}
                </Button>
              </div>
              
              {variantFields.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-lg text-sm text-muted-foreground">
                  {t('products.no_variants', { defaultValue: 'No variants added yet.' })}
                </div>
              ) : (
                <div className="space-y-3">
                  {variantFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-3 items-end bg-muted/10 p-3 rounded-lg border">
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{t('products.variant_name', { defaultValue: 'Variant Name' })} *</FormLabel>
                              <FormControl><Input className="h-8 text-sm" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.sku`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{t('products.sku', { defaultValue: 'SKU' })}</FormLabel>
                              <FormControl><Input className="h-8 text-sm" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.barcode`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{t('products.barcode', { defaultValue: 'Barcode' })}</FormLabel>
                              <FormControl><Input className="h-8 text-sm" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.cost_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{t('products.cost_price', { defaultValue: 'Cost' })}</FormLabel>
                              <FormControl><Input type="number" className="h-8 text-sm" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`variants.${index}.sell_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">{t('products.sell_price', { defaultValue: 'Price' })}</FormLabel>
                              <FormControl><Input type="number" className="h-8 text-sm" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end pb-0.5">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => removeVariant(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-8 flex justify-end gap-3 z-10">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {initialData ? t('common.update', { defaultValue: 'Update' }) : t('common.save', { defaultValue: 'Save' })}
          </Button>
        </div>
      </form>
    </Form>
  )
}
