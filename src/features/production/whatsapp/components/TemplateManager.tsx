// @ts-nocheck
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { truncateText } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'

const templateSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  body: z.string().min(5, 'Message body is required'),
})

type TemplateFormValues = z.infer<typeof templateSchema>

export function TemplateManager() {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingTemplate, setDeletingTemplate] = useState<any>(null)

  const { data: templates, isLoading } = useQuery({
    queryKey: ['whatsapp_templates', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('company_id', company.id)
        .order('name')
      
      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      body: '',
    },
  })

  const handleEdit = (template: any) => {
    setEditingTemplate(template)
    form.reset({
      name: template.name,
      body: template.body,
    })
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setEditingTemplate(null)
    form.reset({ name: '', body: '' })
    setIsFormOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      if (!company?.id) throw new Error('No company ID')
      
      if (editingTemplate) {
        const { error } = await supabase
          .from('whatsapp_templates')
          .update({
            name: data.name,
            body: data.body,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplate.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('whatsapp_templates')
          .insert({
            company_id: company.id,
            name: data.name,
            body: data.body,
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_templates'] })
      setIsFormOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp_templates'] })
      setIsDeleteDialogOpen(false)
    },
  })

  const onSubmit = (data: TemplateFormValues) => {
    saveMutation.mutate(data)
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('production:whatsapp.templates.title', { defaultValue: 'Message Templates' })}</h2>
          <p className="text-sm text-muted-foreground">
            {t('production:whatsapp.templates.subtitle', { defaultValue: 'Manage reusable WhatsApp messages.' })}
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="me-2 h-4 w-4" />
          {t('production:whatsapp.templates.add', { defaultValue: 'Add Template' })}
        </Button>
      </div>

      <div className="border rounded-md bg-card overflow-hidden flex-1">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-1/4">{t('production:whatsapp.templates.name', { defaultValue: 'Template Name' })}</TableHead>
              <TableHead className="w-1/2">{t('production:whatsapp.templates.body', { defaultValue: 'Message Body Preview' })}</TableHead>
              <TableHead className="text-end w-1/4">{t('actions.actions', { ns: 'common', defaultValue: 'Actions' })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : templates?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  {t('labels.no_data', { ns: 'common', defaultValue: 'No templates found. Create one to get started.' })}
                </TableCell>
              </TableRow>
            ) : (
              templates?.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono whitespace-pre-wrap">
                    {truncateText(template.body, 60)}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(template)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setDeletingTemplate(template)
                        setIsDeleteDialogOpen(true)
                      }}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate 
                ? t('production:whatsapp.templates.edit', { defaultValue: 'Edit Template' })
                : t('production:whatsapp.templates.add', { defaultValue: 'Create Template' })}
            </DialogTitle>
            <DialogDescription>
              {t('production:whatsapp.templates.form_desc', { defaultValue: 'Define your message. You can use variables that will be replaced when sending.' })}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('production:whatsapp.templates.name', { defaultValue: 'Template Name' })} *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Welcome Message, Shipping Update" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('production:whatsapp.templates.body', { defaultValue: 'Message Body' })} *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Hello {{customer_name}}, your order for {{product_name}} is ready!" 
                        className="min-h-[150px] font-mono text-sm"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    <FormDescription>
                      Available variables: <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{customer_name}}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{product_name}}`}</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">{`{{product_url}}`}</code>
                    </FormDescription>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  {t('actions.cancel', { ns: 'common', defaultValue: 'Cancel' })}
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t('actions.save', { ns: 'common', defaultValue: 'Save Template' })}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => deleteMutation.mutate(deletingTemplate?.id)}
        title={t('actions.delete', { ns: 'common', defaultValue: 'Delete' })}
        description={t('messages.delete_confirm', { ns: 'common', defaultValue: 'Are you sure you want to delete this?' })}
        confirmLabel={t('actions.delete', { ns: 'common', defaultValue: 'Delete' })}
        isDestructive={true}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
