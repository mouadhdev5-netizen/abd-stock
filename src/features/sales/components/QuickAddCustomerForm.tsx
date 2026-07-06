import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface QuickAddCustomerFormProps {
  onSuccess: (customerId: string, customerName: string) => void
  onCancel: () => void
}

export function QuickAddCustomerForm({ onSuccess, onCancel }: QuickAddCustomerFormProps) {
  const { t } = useTranslation('commerce')
  const { company } = useAuthStore()
  
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company?.id) return
    
    if (name.trim().length < 2) {
      setError(t('sales.customer_name_required', { defaultValue: 'Name must be at least 2 characters' }))
      return
    }
    
    if (phone.trim().length < 9) {
      setError(t('sales.customer_phone_required', { defaultValue: 'Phone must be at least 9 characters' }))
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { data, error: insertError } = await supabase
        .from('customers')
        .insert({
          company_id: company.id,
          name: name.trim(),
          phone: phone.trim(),
          is_active: true,
        } as never)
        .select('id, name')
        .single()

      if (insertError) throw insertError

      onSuccess((data as any).id, (data as any).name)
    } catch (err: any) {
      console.error('Error creating customer:', err)
      setError(err.message || 'Failed to create customer')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-3 border-t bg-muted/30 flex flex-col gap-3">
      <div className="font-medium text-sm">{t('sales.add_new_customer', { defaultValue: 'Add new customer' })}</div>
      
      {error && <div className="text-xs text-destructive">{error}</div>}
      
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t('sales.customer_name', { defaultValue: 'Full Name' })} *</Label>
        <Input 
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. John Doe"
          className="h-8 text-sm"
          disabled={isSubmitting}
        />
      </div>
      
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t('sales.customer_phone', { defaultValue: 'Phone Number' })} *</Label>
        <Input 
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="e.g. 0555 12 34 56"
          className="h-8 text-sm"
          disabled={isSubmitting}
        />
      </div>
      
      <div className="flex justify-end gap-2 mt-1">
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-7 px-2 text-xs"
        >
          <X className="h-3 w-3 me-1" />
          {t('common.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button 
          type="button" 
          size="sm"
          disabled={isSubmitting}
          className="h-7 px-3 text-xs"
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <Loader2 className="h-3 w-3 animate-spin me-1" />
          ) : (
            <Check className="h-3 w-3 me-1" />
          )}
          {t('sales.add_and_select', { defaultValue: 'Add & Select' })}
        </Button>
      </div>
    </div>
  )
}
