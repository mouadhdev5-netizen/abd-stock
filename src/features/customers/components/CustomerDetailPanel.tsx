import { useState, useEffect } from 'react'
import { X, User, Phone, MapPin, Receipt, Wallet, Lock, Unlock, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CustomerPurchasesTable } from './CustomerPurchasesTable'
import { CustomerDebtSection } from './CustomerDebtSection'

const customerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

interface CustomerDetailPanelProps {
  customerId: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function CustomerDetailPanel({ customerId, isOpen, onClose, onUpdate }: CustomerDetailPanelProps) {
  const [customer, setCustomer] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'purchases' | 'debt'>('info')
  const [isLoading, setIsLoading] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
    },
  })

  useEffect(() => {
    if (isOpen && customerId) {
      loadCustomer()
    } else {
      setCustomer(null)
      setActiveTab('info')
    }
  }, [isOpen, customerId])

  const loadCustomer = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId || '')
      .single()

    if (data) {
      setCustomer(data)
      form.reset({
        name: (data as any).name || '',
        phone: (data as any).phone || '',
        email: (data as any).email || '',
        address: (data as any).address || '',
      })
    }
    setIsLoading(false)
  }

  async function onSaveInfo(data: CustomerFormValues) {
    if (!customer) return
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
        } as never)
        .eq('id', customer.id)

      if (error) throw error
      alert('Customer info updated')
      onUpdate()
      loadCustomer()
    } catch (err: any) {
      alert(`Failed to update customer: ${err.message}`)
    }
  }

  const handleToggleBlock = async () => {
    if (!customer) return
    setIsBlocking(true)
    try {
      const newStatus = !customer.is_blocked
      const { error } = await supabase
        .from('customers')
        .update({ is_blocked: newStatus } as never)
        .eq('id', customer.id)

      if (error) throw error
      alert(`Customer ${newStatus ? 'blocked' : 'unblocked'} successfully.`)
      setShowBlockConfirm(false)
      onUpdate()
      loadCustomer()
    } catch (err: any) {
      alert(`Failed to change block status: ${err.message}`)
    } finally {
      setIsBlocking(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full md:w-[560px] bg-background shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l">
        {isLoading && !customer ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !customer ? (
          <div className="p-6 text-center text-muted-foreground">Customer not found</div>
        ) : (
          <>
            <div className={`flex items-center justify-between p-4 border-b ${customer.is_blocked ? 'bg-destructive/10' : ''}`}>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {customer.name}
                  {customer.is_blocked ? (
                    <Badge variant="destructive" className="ms-2">Blocked</Badge>
                  ) : (
                    <Badge variant="success" className="ms-2">Active</Badge>
                  )}
                </h2>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-4">
                  {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phone}</span>}
                  {Number(customer.credit_balance) > 0 && (
                    <span className="flex items-center gap-1 text-destructive font-medium">
                      <Wallet className="h-3 w-3" /> Debt
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex border-b bg-muted/20 px-2">
              <button
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('info')}
              >
                <div className="flex items-center gap-2"><User className="h-4 w-4" /> Info</div>
              </button>
              <button
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'purchases' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('purchases')}
              >
                <div className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Purchases</div>
              </button>
              <button
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'debt' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                onClick={() => setActiveTab('debt')}
              >
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> 
                  Debt
                  {Number(customer.credit_balance) > 0 && <span className="w-2 h-2 rounded-full bg-destructive" />}
                </div>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-4 bg-muted/30 border rounded-md">
                    <div>
                      <h4 className="font-semibold text-sm">Account Status</h4>
                      <p className="text-sm text-muted-foreground">
                        {customer.is_blocked 
                          ? "This customer is blocked and cannot be selected in new sales." 
                          : "This customer is active and can make purchases."}
                      </p>
                    </div>
                    <Button 
                      variant={customer.is_blocked ? "outline" : "destructive"} 
                      onClick={() => setShowBlockConfirm(true)}
                    >
                      {customer.is_blocked ? (
                        <><Unlock className="me-2 h-4 w-4" /> Unblock</>
                      ) : (
                        <><Lock className="me-2 h-4 w-4" /> Block</>
                      )}
                    </Button>
                  </div>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSaveInfo)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input type="tel" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea rows={3} className="resize-none" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                        {form.formState.isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                </div>
              )}

              {activeTab === 'purchases' && (
                <CustomerPurchasesTable customerId={customer.id} />
              )}

              {activeTab === 'debt' && (
                <CustomerDebtSection 
                  customer={customer} 
                  onUpdate={() => {
                    loadCustomer()
                    onUpdate()
                  }} 
                />
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={showBlockConfirm}
        onCancel={() => setShowBlockConfirm(false)}
        onConfirm={handleToggleBlock}
        title={customer?.is_blocked ? "Unblock Customer?" : "Block Customer?"}
        description={customer?.is_blocked 
          ? `Are you sure you want to unblock ${customer?.name}? They will be able to make purchases again.`
          : `Are you sure you want to block ${customer?.name}? They won't be selectable in new sales.`
        }
        confirmLabel={customer?.is_blocked ? "Yes, Unblock" : "Yes, Block"}
        confirmVariant={customer?.is_blocked ? "default" : "destructive"}
        isLoading={isBlocking}
      />
    </>
  )
}
