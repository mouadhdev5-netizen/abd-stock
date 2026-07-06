import { useEffect, useState } from 'react'
import { X, Truck, Calendar, MapPin, Package, FileText, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CommandStatusBadge } from './CommandStatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'

interface CommandDetailPanelProps {
  command: any
  isOpen: boolean
  onClose: () => void
  onSubmitToYalidin?: () => void
}

export function CommandDetailPanel({ command, isOpen, onClose, onSubmitToYalidin }: CommandDetailPanelProps) {
  const { company } = useAuthStore()
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && command?.id) {
      setIsLoading(true)
      supabase
        .from('command_items')
        .select('*')
        .eq('command_id', command.id)
        .then(({ data }) => {
          if (data) setItems(data)
          setIsLoading(false)
        })
    }
  }, [isOpen, command?.id])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-background shadow-xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out border-l">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Command Details
              <CommandStatusBadge status={command.status} />
            </h2>
            <div className="text-sm text-muted-foreground mt-1">
              {formatDate(command.created_at)}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4" /> Customer Info
            </h3>
            <div className="bg-muted/30 p-3 rounded-md space-y-2 text-sm border">
              <div className="font-medium text-base">{command.customers?.name || 'Walk-in Customer'}</div>
              {command.customers?.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3" /> {command.customers.phone}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Delivery Address
            </h3>
            <div className="bg-muted/30 p-3 rounded-md text-sm border whitespace-pre-wrap">
              {command.delivery_address || 'No address provided'}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-4 w-4" /> Shipping & Tracking
            </h3>
            <div className="bg-muted/30 p-3 rounded-md text-sm border space-y-2">
              {command.yalidin_tracking_id ? (
                <div>
                  <span className="text-muted-foreground me-2">Yalidin Tracking:</span>
                  <Badge variant="outline" className="font-mono">{command.yalidin_tracking_id}</Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Not sent to delivery service</span>
                  {onSubmitToYalidin && (
                    <Button size="sm" onClick={onSubmitToYalidin} variant="secondary">
                      Submit to Yalidin
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Package className="h-4 w-4" /> Products ({items.length})
            </h3>
            <div className="border rounded-md divide-y">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading items...</div>
              ) : items.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No items found</div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="p-3 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-muted-foreground">{item.quantity}x @ {formatCurrency(item.unit_price, company?.currency || 'DZD')}</div>
                    </div>
                    <div className="font-semibold text-end">
                      {formatCurrency(item.quantity * item.unit_price, company?.currency || 'DZD')}
                    </div>
                  </div>
                ))
              )}
              <div className="p-3 bg-muted/20 flex justify-between items-center font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(command.total, company?.currency || 'DZD')}</span>
              </div>
            </div>
          </div>

          {command.notes && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4" /> Notes
              </h3>
              <div className="bg-muted/30 p-3 rounded-md text-sm border whitespace-pre-wrap">
                {command.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
