import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const componentSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  name_ar: z.string().optional(),
  name_fr: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  cost_price: z.coerce.number().min(0).default(0),
  quantity_in_stock: z.coerce.number().min(0).default(0),
  reorder_level: z.coerce.number().min(0).default(0),
  status: z.boolean().default(true),
})

type ComponentFormValues = z.infer<typeof componentSchema>

interface ComponentFormProps {
  initialData?: any
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ComponentForm({ initialData, isOpen, onClose, onSuccess }: ComponentFormProps) {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()

  const form = useForm<ComponentFormValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      name_ar: '',
      name_fr: '',
      unit: 'pcs',
      cost_price: 0,
      quantity_in_stock: 0,
      reorder_level: 0,
      status: true,
    },
  })

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || '',
        name_ar: initialData.name_ar || '',
        name_fr: initialData.name_fr || '',
        unit: initialData.unit || 'pcs',
        cost_price: initialData.cost_price || 0,
        quantity_in_stock: initialData.quantity_in_stock || 0,
        reorder_level: initialData.reorder_level || 0,
        status: initialData.status === 'active',
      })
    } else {
      form.reset({
        name: '',
        name_ar: '',
        name_fr: '',
        unit: 'pcs',
        cost_price: 0,
        quantity_in_stock: 0,
        reorder_level: 0,
        status: true,
      })
    }
  }, [initialData, isOpen])

  async function onSubmit(data: ComponentFormValues) {
    if (!company?.id) return

    try {
      if (initialData?.id) {
        const { error } = await supabase
          .from('components')
          .update({
            name: data.name,
            name_ar: data.name_ar,
            name_fr: data.name_fr,
            unit: data.unit,
            cost_price: data.cost_price,
            quantity_in_stock: data.quantity_in_stock,
            reorder_level: data.reorder_level,
            status: data.status ? 'active' : 'inactive',
          } as never)
          .eq('id', initialData.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('components')
          .insert({
            name: data.name,
            name_ar: data.name_ar,
            name_fr: data.name_fr,
            unit: data.unit,
            cost_price: data.cost_price,
            quantity_in_stock: data.quantity_in_stock,
            reorder_level: data.reorder_level,
            status: data.status ? 'active' : 'inactive',
            company_id: company.id,
          } as never)
        if (error) throw error
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error saving component:', error)
      alert(`Failed to save component: ${error.message || JSON.stringify(error)}`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? t('production:components.edit', { defaultValue: 'Edit Component' })
              : t('production:components.add', { defaultValue: 'Add Component' })}
          </DialogTitle>
          <DialogDescription>
            {t('production:components.form_desc', { defaultValue: 'Enter raw material details.' })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('production:components.name', { defaultValue: 'Name' })} *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Flour Type A" {...field} />
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
                    <FormLabel>{t('production:components.name_ar', { defaultValue: 'Name (AR)' })}</FormLabel>
                    <FormControl>
                      <Input dir="rtl" placeholder="الاسم بالعربية" {...field} />
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
                    <FormLabel>{t('production:components.name_fr', { defaultValue: 'Name (FR)' })}</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom en Français" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('production:components.unit', { defaultValue: 'Unit' })}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="mL">mL</SelectItem>
                        <SelectItem value="pcs">pcs</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="cm">cm</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('production:components.cost_price', { defaultValue: 'Cost per Unit' })}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity_in_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('production:components.quantity', { defaultValue: 'Current Stock' })}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reorder_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('production:components.reorder_level', { defaultValue: 'Reorder Level' })}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">
                    {t('production:components.active', { defaultValue: 'Active Component' })}
                  </FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={form.formState.isSubmitting}>
                {t('actions.cancel', { ns: 'common', defaultValue: 'Cancel' })}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {initialData
                  ? t('actions.save', { ns: 'common', defaultValue: 'Save Changes' })
                  : t('production:components.add', { defaultValue: 'Add Component' })}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
