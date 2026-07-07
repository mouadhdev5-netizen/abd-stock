// @ts-nocheck
import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const recipeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  name_ar: z.string().optional(),
  name_fr: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    component_id: z.string().min(1, 'Component required'),
    quantity_used: z.coerce.number().min(0.001, 'Quantity must be > 0')
  })),
  outputs: z.array(z.object({
    id: z.string().optional(),
    product_id: z.string().min(1, 'Product required'),
    variant_id: z.string().optional(),
    quantity_produced: z.coerce.number().min(1, 'Quantity must be > 0')
  })),
  charges: z.array(z.object({
    id: z.string().optional(),
    description: z.string().min(1, 'Description required'),
    amount: z.coerce.number().min(0, 'Amount must be >= 0')
  }))
})

type RecipeFormValues = z.infer<typeof recipeSchema>

interface RecipeFormProps {
  initialData?: any
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RecipeForm({ initialData, isOpen, onClose, onSuccess }: RecipeFormProps) {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()

  // Fetch lookups
  const { data: components } = useQuery({
    queryKey: ['components', company?.id],
    queryFn: async () => {
      const { data } = await supabase.from('components').select('*').eq('company_id', company?.id).order('name')
      return data || []
    },
    enabled: !!company?.id && isOpen,
  })

  const { data: products } = useQuery({
    queryKey: ['products_with_variants', company?.id],
    queryFn: async () => {
      const { data } = await supabase.from('products').select('*, product_variants(*)').eq('company_id', company?.id).order('name')
      return data || []
    },
    enabled: !!company?.id && isOpen,
  })

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      name_fr: '',
      notes: '',
      items: [],
      outputs: [],
      charges: [],
    },
  })

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({ control: form.control, name: 'items' })
  const { fields: outputFields, append: appendOutput, remove: removeOutput } = useFieldArray({ control: form.control, name: 'outputs' })
  const { fields: chargeFields, append: appendCharge, remove: removeCharge } = useFieldArray({ control: form.control, name: 'charges' })

  useEffect(() => {
    if (initialData && isOpen) {
      form.reset({
        name: initialData.name || '',
        name_ar: initialData.name_ar || '',
        name_fr: initialData.name_fr || '',
        notes: initialData.notes || '',
        items: initialData.recipe_items?.map((i: any) => ({
          id: i.id,
          component_id: i.component_id || '',
          quantity_used: i.quantity_used
        })) || [],
        outputs: initialData.recipe_outputs?.map((o: any) => ({
          id: o.id,
          product_id: o.product_id || '',
          variant_id: o.variant_id || '',
          quantity_produced: o.quantity_produced
        })) || [],
        charges: initialData.recipe_charges?.map((c: any) => ({
          id: c.id,
          description: c.description,
          amount: c.amount
        })) || [],
      })
    } else if (isOpen) {
      form.reset({
        name: '', name_ar: '', name_fr: '', notes: '',
        items: [], outputs: [], charges: []
      })
    }
  }, [initialData, isOpen, form])

  async function onSubmit(data: RecipeFormValues) {
    if (!company?.id) return

    try {
      let recipeId = initialData?.id

      if (recipeId) {
        // Update basic info
        const { error: updErr } = await supabase
          .from('recipes')
          .update({
            name: data.name,
            name_ar: data.name_ar,
            name_fr: data.name_fr,
            notes: data.notes,
            updated_at: new Date().toISOString()
          } as never)
          .eq('id', recipeId)
        if (updErr) throw updErr

        // Clear existing related rows (simplest way to handle sync without complex diffing)
        await supabase.from('recipe_items').delete().eq('recipe_id', recipeId)
        await supabase.from('recipe_outputs').delete().eq('recipe_id', recipeId)
        await supabase.from('recipe_charges').delete().eq('recipe_id', recipeId)

      } else {
        // Insert new recipe
        const { data: newRecipe, error: insErr } = await supabase
          .from('recipes')
          .insert({
            company_id: company.id,
            name: data.name,
            name_ar: data.name_ar,
            name_fr: data.name_fr,
            notes: data.notes
          } as never)
          .select('id')
          .single()
        
        if (insErr) throw insErr
        recipeId = newRecipe.id
      }

      // Insert related records
      if (data.items.length > 0) {
        await supabase.from('recipe_items').insert(
          data.items.map(i => ({
            recipe_id: recipeId,
            component_id: i.component_id,
            quantity_used: i.quantity_used
          })) as never
        )
      }

      if (data.outputs.length > 0) {
        await supabase.from('recipe_outputs').insert(
          data.outputs.map(o => ({
            recipe_id: recipeId,
            product_id: o.product_id,
            variant_id: o.variant_id || null,
            quantity_produced: o.quantity_produced
          })) as never
        )
      }

      if (data.charges.length > 0) {
        await supabase.from('recipe_charges').insert(
          data.charges.map(c => ({
            recipe_id: recipeId,
            description: c.description,
            amount: c.amount
          })) as never
        )
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error saving recipe:', error)
      alert(`Failed to save recipe: ${error.message}`)
    }
  }

  // Calculate charge total for UI
  const totalCharges = form.watch('charges').reduce((acc, c) => acc + (Number(c.amount) || 0), 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? t('production:recipes.edit', { defaultValue: 'Edit Recipe' })
              : t('production:recipes.add', { defaultValue: 'Create Recipe' })}
          </DialogTitle>
          <DialogDescription>
            {t('production:recipes.form_desc', { defaultValue: 'Define production formula.' })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">{t('production:recipes.section_basic', { defaultValue: '1. Basic Information' })}</h3>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('production:recipes.name', { defaultValue: 'Recipe Name' })} *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Standard Bread Loaf" {...field} />
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
                      <FormLabel>{t('production:recipes.name_ar', { defaultValue: 'Name (AR)' })}</FormLabel>
                      <FormControl><Input dir="rtl" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name_fr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('production:recipes.name_fr', { defaultValue: 'Name (FR)' })}</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('labels.notes', { ns: 'common', defaultValue: 'Notes' })}</FormLabel>
                    <FormControl><Textarea rows={2} {...field} /></FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Section 2: Components (Inputs) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold">{t('production:recipes.section_inputs', { defaultValue: '2. Components (Inputs)' })}</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => appendItem({ component_id: '', quantity_used: 1 })}>
                  <Plus className="h-4 w-4 me-1" /> {t('production:recipes.add_component', { defaultValue: 'Add Component' })}
                </Button>
              </div>
              
              {itemFields.length === 0 && <p className="text-sm text-muted-foreground">{t('production:recipes.no_components', { defaultValue: 'No components added yet.' })}</p>}
              
              {itemFields.map((field, index) => {
                const compId = form.watch(`items.${index}.component_id`)
                const selectedComp = components?.find(c => c.id === compId)
                return (
                  <div key={field.id} className="flex items-end gap-3 bg-muted/20 p-3 rounded-md border">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`items.${index}.component_id`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Component *</FormLabel>
                            <Select onValueChange={f.onChange} value={f.value || ''} defaultValue={f.value || ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select component" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {components?.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="w-32">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity_used`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Qty ({selectedComp?.unit || '?'}) *</FormLabel>
                            <FormControl><Input type="text" inputMode="decimal" placeholder="0.000" {...f} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Section 3: Products (Outputs) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold">{t('production:recipes.section_outputs', { defaultValue: '3. Products (Outputs)' })}</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => appendOutput({ product_id: '', variant_id: '', quantity_produced: 1 })}>
                  <Plus className="h-4 w-4 me-1" /> {t('production:recipes.add_output', { defaultValue: 'Add Output' })}
                </Button>
              </div>
              
              {outputFields.length === 0 && <p className="text-sm text-muted-foreground">{t('production:recipes.no_outputs', { defaultValue: 'No products added yet.' })}</p>}

              {outputFields.map((field, index) => {
                const prodId = form.watch(`outputs.${index}.product_id`)
                const selectedProd = products?.find(p => p.id === prodId)
                const hasVariants = selectedProd?.has_variants

                return (
                  <div key={field.id} className="flex items-end gap-3 bg-muted/20 p-3 rounded-md border border-purple-200 dark:border-purple-900">
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`outputs.${index}.product_id`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Product *</FormLabel>
                            <Select onValueChange={(val) => {
                              f.onChange(val)
                              form.setValue(`outputs.${index}.variant_id`, '')
                            }} value={f.value || ''} defaultValue={f.value || ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products?.map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {hasVariants && (
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name={`outputs.${index}.variant_id`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Variant</FormLabel>
                              <Select onValueChange={f.onChange} value={f.value || ''} defaultValue={f.value || ''}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {selectedProd?.product_variants?.map((v: any) => (
                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    <div className="w-24">
                      <FormField
                        control={form.control}
                        name={`outputs.${index}.quantity_produced`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Qty *</FormLabel>
                            <FormControl><Input type="text" inputMode="decimal" placeholder="1" {...f} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeOutput(index)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Section 4: Charges */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold">{t('production:recipes.section_charges', { defaultValue: '4. Charges (Optional)' })}</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => appendCharge({ description: '', amount: 0 })}>
                  <Plus className="h-4 w-4 me-1" /> {t('production:recipes.add_charge', { defaultValue: 'Add Charge' })}
                </Button>
              </div>
              
              {chargeFields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-3">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`charges.${index}.description`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormControl><Input placeholder="e.g. Labor, Electricity..." {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="w-32">
                    <FormField
                      control={form.control}
                      name={`charges.${index}.amount`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormControl><Input type="text" inputMode="decimal" placeholder="Amount" {...f} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCharge(index)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {chargeFields.length > 0 && (
                <div className="flex justify-end pt-2 text-sm font-medium">
                  {t('labels.total', { ns: 'common', defaultValue: 'Total' })}: {totalCharges}
                </div>
              )}
            </div>

            <Separator />
            <div className="flex justify-end gap-2 pb-6">
              <Button type="button" variant="outline" onClick={onClose} disabled={form.formState.isSubmitting}>
                {t('actions.cancel', { ns: 'common', defaultValue: 'Cancel' })}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('actions.save', { ns: 'common', defaultValue: 'Save Recipe' })}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
