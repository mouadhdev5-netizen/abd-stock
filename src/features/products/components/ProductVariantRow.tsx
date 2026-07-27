import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, X, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { StatusToggle } from '@/components/ui/StatusToggle'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

interface ProductVariantRowProps {
  variant: any
  onStatusToggle: (variantId: string, newStatus: 'active' | 'inactive') => void
  onUpdate: () => void
}

export function ProductVariantRow({ variant, onStatusToggle, onUpdate }: ProductVariantRowProps) {
  const { t } = useTranslation('commerce')
  const { company } = useAuthStore()
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
      alert(t('products.variant_updated', { defaultValue: 'Variant updated successfully' }))
      setIsEditing(false)
      onUpdate()
    } catch (error: any) {
      console.error('Error updating variant:', error)
      alert(error.message || 'Failed to update variant')
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-4 py-2 px-4 border-b bg-muted/30">
        <div className="grid grid-cols-5 gap-3 flex-1">
          <Input 
            value={editData.name}
            onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('products.variant_name', { defaultValue: 'Variant Name' })}
            className="h-8"
          />
          <Input 
            value={editData.sku}
            onChange={(e) => setEditData(prev => ({ ...prev, sku: e.target.value }))}
            placeholder={t('products.sku', { defaultValue: 'SKU' })}
            className="h-8"
          />
          <Input 
            value={editData.barcode}
            onChange={(e) => setEditData(prev => ({ ...prev, barcode: e.target.value }))}
            placeholder={t('products.barcode', { defaultValue: 'Barcode' })}
            className="h-8"
          />
          <Input 
            type="number"
            value={editData.cost_price}
            onChange={(e) => setEditData(prev => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))}
            placeholder={t('products.cost_price', { defaultValue: 'Cost Price' })}
            className="h-8"
          />
          <Input 
            type="number"
            value={editData.sell_price}
            onChange={(e) => setEditData(prev => ({ ...prev, sell_price: parseFloat(e.target.value) || 0 }))}
            placeholder={t('products.sell_price', { defaultValue: 'Sell Price' })}
            className="h-8"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
            onClick={handleSave}
            disabled={isSaving || !editData.name}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2 px-4 border-b hover:bg-muted/10 transition-colors">
      <div className="flex-1 min-w-[200px]">
        <p className="font-semibold text-sm">{variant.name}</p>
        {variant.sku && <p className="text-xs text-muted-foreground">{variant.sku}</p>}
      </div>
      
      <div className="flex-1 grid grid-cols-4 gap-4 text-sm">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('products.barcode', { defaultValue: 'Barcode' })}</span>
          <span>{variant.barcode || '-'}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('products.stock', { defaultValue: 'Stock' })}</span>
          <span className={(variant.total_qty_available ?? 0) <= 5 ? 'text-destructive font-medium' : ''}>
            {variant.total_qty_available ?? 0}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('products.cost_price', { defaultValue: 'Cost' })}</span>
          <span>{formatCurrency(variant.cost_price || 0, currency)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t('products.sell_price', { defaultValue: 'Price' })}</span>
          <span className="font-medium text-primary">{formatCurrency(variant.sell_price || 0, currency)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 min-w-[150px] justify-end">
        <StatusToggle 
          checked={variant.is_active !== false} 
          onToggle={() => onStatusToggle(variant.id, variant.is_active !== false ? 'inactive' : 'active')} 
        />
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
