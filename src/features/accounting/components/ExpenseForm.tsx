import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'

interface ExpenseFormProps {
  onSuccess: () => void
  onCancel: () => void
  defaultRelatedToType?: string
  defaultRelatedToId?: string
}

export function ExpenseForm({ onSuccess, onCancel, defaultRelatedToType, defaultRelatedToId }: ExpenseFormProps) {
  const { t } = useTranslation('common')
  const { company, user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
    related_to_type: defaultRelatedToType || 'none',
    related_to_id: defaultRelatedToId || '',
  })

  const EXPENSE_CATEGORIES = [
    'Rent',
    'Utilities',
    'Payroll',
    'Office Supplies',
    'Marketing',
    'Software/IT',
    'Travel',
    'Meals',
    'Shipping/Delivery',
    'Fees/Bank Charges',
    'Other'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company?.id || !user?.id) return

    try {
      setIsLoading(true)

      const expenseData = {
        company_id: company.id,
        created_by: user.id,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        expense_date: formData.expense_date,
        reference: formData.reference,
        notes: formData.notes,
      }

      const { error } = await supabase.from('expenses').insert(expenseData as any)

      if (error) throw error
      
      onSuccess()
    } catch (error: any) {
      console.error('Error saving expense:', error)
      alert(`Failed to save expense: ${error.message || JSON.stringify(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount ({company?.currency || 'DZD'}) <span className="text-destructive">*</span></Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            required
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense_date">Date <span className="text-destructive">*</span></Label>
          <Input
            id="expense_date"
            type="date"
            required
            value={formData.expense_date}
            onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
          <Select 
            value={formData.category || undefined} 
            onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference">Reference #</Label>
          <Input
            id="reference"
            value={formData.reference}
            onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
            placeholder="Invoice / Receipt #"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
        <Input
          id="description"
          required
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="What was this expense for?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="space-y-2">
          <Label htmlFor="related_to_type">Link to Document (Optional)</Label>
          <Select 
            value={formData.related_to_type} 
            onValueChange={(val) => setFormData(prev => ({ ...prev, related_to_type: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="purchase_order">Purchase Order</SelectItem>
              <SelectItem value="sales_order">Sales Order</SelectItem>
              <SelectItem value="delivery">Delivery Note</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="related_to_id">Document ID</Label>
          <Input
            id="related_to_id"
            value={formData.related_to_id}
            onChange={(e) => setFormData(prev => ({ ...prev, related_to_id: e.target.value }))}
            placeholder="Enter UUID of document"
            disabled={formData.related_to_type === 'none'}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any extra details..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Expense'}
        </Button>
      </div>
    </form>
  )
}
