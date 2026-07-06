import { useQuery } from '@tanstack/react-query'
import { Plus, Receipt, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { ExpenseForm } from './ExpenseForm'
import { useState } from 'react'

interface RelatedExpensesModalProps {
  isOpen: boolean
  onClose: () => void
  relatedToType: 'sales_order' | 'purchase_order' | 'delivery'
  relatedToId: string
  referenceNumber: string
}

export function RelatedExpensesModal({ 
  isOpen, 
  onClose, 
  relatedToType, 
  relatedToId,
  referenceNumber
}: RelatedExpensesModalProps) {
  const { company } = useAuthStore()
  const { t } = useTranslation('common')
  const [showForm, setShowForm] = useState(false)

  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: ['related_expenses', relatedToId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('related_to_type', relatedToType)
        .eq('related_to_id', relatedToId)
        .order('expense_date', { ascending: false })

      if (error) throw error
      return data as any[]
    },
    enabled: isOpen && !!relatedToId,
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this charge?')) return
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      refetch()
    } catch (error) {
      console.error(error)
      alert('Failed to delete charge')
    }
  }

  const totalCharges = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Receipt className="h-6 w-6 text-primary" />
              Charges for {referenceNumber}
            </DialogTitle>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="h-4 w-4 me-2" />
                Add Charge
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          {showForm ? (
            <div className="border rounded-md p-6 bg-card">
              <h3 className="text-lg font-medium mb-4">Add New Charge</h3>
              <ExpenseForm 
                defaultRelatedToType={relatedToType}
                defaultRelatedToId={relatedToId}
                onSuccess={() => {
                  setShowForm(false)
                  refetch()
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-end">Amount</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Loading charges...
                        </TableCell>
                      </TableRow>
                    ) : expenses?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No charges or expenses linked to this document.
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenses?.map(e => (
                        <TableRow key={e.id}>
                          <TableCell>{formatDate(e.expense_date)}</TableCell>
                          <TableCell>{e.category}</TableCell>
                          <TableCell>{e.description}</TableCell>
                          <TableCell className="text-end font-medium text-destructive">
                            {formatCurrency(e.amount, company?.currency || 'DZD')}
                          </TableCell>
                          <TableCell className="text-end">
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end pt-2">
                <div className="bg-muted/20 border rounded-md px-4 py-3 flex items-center gap-4">
                  <span className="text-muted-foreground font-medium">Total Charges:</span>
                  <span className="text-xl font-bold text-destructive">
                    {formatCurrency(totalCharges, company?.currency || 'DZD')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
