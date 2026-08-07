import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Plus, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  payment_date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

interface CustomerDebtSectionProps {
  customer: any
  onUpdate: () => void
}

export function CustomerDebtSection({ customer, onUpdate }: CustomerDebtSectionProps) {
  const { t } = useTranslation(['commerce', 'common'])
  const { company } = useAuthStore()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)

  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ['customer_debt_payments', customer.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_debt_payments')
        .select(`
          *,
          profiles:created_by(full_name)
        `)
        .eq('customer_id', customer.id)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!customer.id,
  })

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  async function onSubmit(data: PaymentFormValues) {
    try {
      // 1. Insert payment
      const { error: insertError } = await supabase.from('customer_debt_payments').insert({
        customer_id: customer.id,
        amount: data.amount,
        payment_date: data.payment_date,
        notes: data.notes,
      } as never)

      if (insertError) throw insertError

      // 2. Update customer debt amount
      const newDebt = Math.max(0, Number(customer.credit_balance || 0) - Number(data.amount))
      
      const { error: updateError } = await supabase
        .from('customers')
        .update({ credit_balance: newDebt } as never)
        .eq('id', customer.id)

      if (updateError) throw updateError

      toast({ title: 'Payment Recorded', description: 'Payment recorded successfully', variant: 'success' })
      form.reset()
      setShowForm(false)
      refetch()
      onUpdate()
    } catch (error: any) {
      console.error('Error recording payment:', error)
      toast({ title: 'Error', description: `Failed to record payment: ${error.message}`, variant: 'destructive' })
    }
  }

  const currentDebt = Number(customer.credit_balance || 0)

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-md border flex items-center justify-between ${currentDebt > 0 ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-success/10 border-success/20 text-success'}`}>
        <div>
          <div className="text-sm font-semibold uppercase tracking-wider opacity-80">Current Debt</div>
          <div className="text-3xl font-bold">{formatCurrency(currentDebt, company?.currency || 'DZD')}</div>
        </div>
        {currentDebt > 0 && !showForm && (
          <Button onClick={() => setShowForm(true)} variant={currentDebt > 0 ? 'destructive' : 'default'}>
            <Plus className="me-2 h-4 w-4" />
            Record Payment
          </Button>
        )}
      </div>

      {showForm && (
        <div className="p-4 border rounded-md bg-muted/30">
          <h4 className="font-semibold mb-4">Record New Payment</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ({company?.currency || 'DZD'}) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0.01" max={currentDebt} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="payment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={form.formState.isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  Save Payment
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      <div>
        <h4 className="font-semibold mb-3 text-muted-foreground">Payment History</h4>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-end">Amount Paid</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6">Loading payments...</TableCell>
                </TableRow>
              ) : payments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No payments recorded.</TableCell>
                </TableRow>
              ) : (
                payments?.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-end font-bold text-success">
                      {formatCurrency(payment.amount, company?.currency || 'DZD')}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {payment.profiles?.full_name || 'System'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {payment.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
