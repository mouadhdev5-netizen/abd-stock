import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { StatusToggle } from '@/components/ui/StatusToggle'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'

interface ProductVariantRowProps {
  variant: any
  onStatusToggle: (variantId: string, newStatus: 'active' | 'inactive') => void
  onUpdate: () => void
}

export function ProductVariantRow({ variant, onStatusToggle, onUpdate }: ProductVariantRowProps) {
  const { t } = useTranslation('commerce')
  const { company } = useAuthStore()
  const { toast } = useToast()
  const currency = company?.currency || 'DZD'
  
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: variant.name || '',
    sku: variant.sku || '',
    barcode: variant.barcode || '',
    cost_price: variant.cost_price || 0,
    sell_price: variant.sell_price || 0,
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({
          name: editData.name,
          sku: editData.sku,
          barcode: editData.barcode,
          cost_price: editData.cost_price,
          sell_price: editData.sell_price,
        } as never)
        .eq('id', variant.id)
        
      if (error) throw error
      toast({ title: 'Updated', description: 'Variant updated successfully', variant: 'success' })
      setIsEditing(false)
      onUpdate()
    } catch (error: any) {
      console.error('Error updating variant:', error)
      toast({ title: 'Error', description: error.message || 'Failed to update variant', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <TableRow className="bg-muted/20">
        <TableCell colSpan={5}>
          <div className="grid grid-cols-5 gap-2">
            <Input 
              value={editData.name}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Variant Name"
              className="h-7 text-xs"
            />
            <Input 
              value={editData.sku}
              onChange={(e) => setEditData(prev => ({ ...prev, sku: e.target.value }))}
              placeholder="SKU"
              className="h-7 text-xs"
            />
            <Input 
              type="number"
              value={editData.sell_price}
              onChange={(e) => setEditData(prev => ({ ...prev, sell_price: parseFloat(e.target.value) || 0 }))}
              placeholder="Sell Price"
              className="h-7 text-xs"
            />
            <Input 
              type="number"
              value={editData.cost_price}
              onChange={(e) => setEditData(prev => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))}
              placeholder="Cost Price"
              className="h-7 text-xs"
            />
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={handleSave} disabled={isSaving || !editData.name}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setIsEditing(false)} disabled={isSaving}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </TableCell>
        <TableCell />
      </TableRow>
    )
  }

  return (
    <TableRow className="hover:bg-muted/10 transition-colors">
      <TableCell className="text-sm font-medium pl-4">
        <div>
          <div>{variant.name}</div>
          {variant.barcode && <div className="text-xs text-muted-foreground font-mono">{variant.barcode}</div>}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground font-mono">{variant.sku || '-'}</TableCell>
      <TableCell className="text-end text-sm font-medium text-primary">
        {formatCurrency(variant.sell_price || 0, currency)}
      </TableCell>
      <TableCell className="text-end text-xs text-muted-foreground">
        {formatCurrency(variant.cost_price || 0, currency)}
      </TableCell>
      <TableCell className="text-end text-sm">
        <span className={(variant.total_qty_available ?? 0) <= 5 ? 'text-destructive font-bold' : 'text-green-600 font-semibold'}>
          {formatNumber(variant.total_qty_available ?? 0)}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <StatusToggle 
            checked={variant.is_active !== false} 
            onToggle={() => onStatusToggle(variant.id, variant.is_active !== false ? 'inactive' : 'active')} 
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
