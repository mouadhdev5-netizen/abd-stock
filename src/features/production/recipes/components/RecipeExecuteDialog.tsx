import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, AlertTriangle, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

interface RecipeExecuteDialogProps {
  recipe: any
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RecipeExecuteDialog({ recipe, isOpen, onClose, onSuccess }: RecipeExecuteDialogProps) {
  const { t } = useTranslation(['production', 'common'])
  const { company, user } = useAuthStore()
  const queryClient = useQueryClient()
  const [isExecuting, setIsExecuting] = useState(false)

  // Calculate totals
  const totalCharges = useMemo(() => {
    if (!recipe?.recipe_charges) return 0
    return recipe.recipe_charges.reduce((sum: number, c: any) => sum + Number(c.amount), 0)
  }, [recipe])

  const hasInsufficientStock = useMemo(() => {
    if (!recipe?.recipe_items) return false
    return recipe.recipe_items.some((item: any) => {
      const available = Number(item.component?.quantity_in_stock || 0)
      const needed = Number(item.quantity_used || 0)
      return available < needed
    })
  }, [recipe])

  const handleExecute = async () => {
    if (!company?.id || !user?.id || !recipe) return
    setIsExecuting(true)

    try {
      // Note: A real backend would do this in a PostgreSQL function (transaction).
      // Here we do it sequentially from client side as per instructions.

      // 1. Deduct component stock
      const items = recipe.recipe_items || []
      for (const item of items) {
        if (!item.component_id) continue
        const deductQty = Number(item.quantity_used)
        
        // Fetch current stock to be safe, or just use RPC if available. 
        // Supabase REST doesn't easily support "quantity_in_stock = quantity_in_stock - X" without RPC,
        // unless we read current value first. But since we have it in memory:
        const currentStock = Number(item.component?.quantity_in_stock || 0)
        const newStock = Math.max(0, currentStock - deductQty) // Prevent negative if desired, or let it go negative
        
        const { error: compErr } = await supabase
          .from('components')
          .update({ quantity_in_stock: newStock } as never)
          .eq('id', item.component_id)
          
        if (compErr) throw new Error(`Failed to update component ${item.component?.name}: ${compErr.message}`)
      }

      // 2. Add produced products to stock using RPC
      const outputs = recipe.recipe_outputs || []
      
      let defaultWarehouseId = null
      if (outputs.length > 0) {
        const { data: wh } = await supabase.from('warehouses').select('id').eq('company_id', company.id).limit(1).single() as any
        defaultWarehouseId = wh?.id
      }

      for (const out of outputs) {
        if (!out.product_id) continue
        
        if (!defaultWarehouseId) throw new Error('No warehouse found to receive products')

        const { error: moveErr } = await supabase.rpc('fn_update_stock_level', {
          p_company_id: company.id,
          p_product_id: out.product_id,
          p_variant_id: out.variant_id || null,
          p_warehouse_id: defaultWarehouseId,
          p_quantity: Number(out.quantity_produced),
          p_unit_cost: 0,
          p_movement_type: 'adjustment',
          p_notes: `REC-${recipe.id.substring(0, 8)}`,
          p_created_by: user.id || null
        } as any)
          
        if (moveErr) throw new Error(`Failed to create stock movement: ${moveErr.message}`)
      }

      // 3. Log execution
      const { error: execErr } = await supabase
        .from('recipe_executions')
        .insert({
          recipe_id: recipe.id,
          company_id: company.id,
          executed_by: user.id,
          total_cost: totalCharges
        } as never)
        
      if (execErr) throw new Error(`Failed to log execution: ${execErr.message}`)

      // 4. Invalidate related caches
      queryClient.invalidateQueries({ queryKey: ['components'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] })
      queryClient.invalidateQueries({ queryKey: ['recipe_executions'] })

      alert(t('production:recipes.execute_success', { defaultValue: 'Recipe executed successfully! Products added to stock.' }))
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Execution error:', err)
      alert(t('production:recipes.execute_error', { defaultValue: 'Error executing recipe: ' }) + err.message)
    } finally {
      setIsExecuting(false)
    }
  }

  if (!recipe) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {t('production:recipes.execute_recipe', { defaultValue: 'Execute Recipe' })}: {recipe.name}
          </DialogTitle>
          <DialogDescription>
            {t('production:recipes.execute_desc', { defaultValue: 'Review the required materials and expected output before execution.' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Components to consume */}
          <div>
            <h4 className="text-sm font-semibold mb-2">{t('production:recipes.components_needed', { defaultValue: 'Components Needed (Inputs)' })}</h4>
            {recipe.recipe_items?.length === 0 && (
              <p className="text-sm text-muted-foreground italic">None</p>
            )}
            <ul className="space-y-2">
              {recipe.recipe_items?.map((item: any, idx: number) => {
                const available = Number(item.component?.quantity_in_stock || 0)
                const needed = Number(item.quantity_used || 0)
                const isShort = available < needed
                
                return (
                  <li key={idx} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50 border">
                    <div>
                      <span className="font-medium">{item.component?.name || 'Unknown'}</span>
                      <span className="text-muted-foreground ms-2">× {needed} {item.component?.unit}</span>
                    </div>
                    <div className={`text-xs ${isShort ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                      {t('production:components.available', { defaultValue: 'Available' })}: {available} {item.component?.unit}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Products to produce */}
          <div>
            <h4 className="text-sm font-semibold mb-2">{t('production:recipes.products_produced', { defaultValue: 'Products Produced (Outputs)' })}</h4>
            {recipe.recipe_outputs?.length === 0 && (
              <p className="text-sm text-muted-foreground italic">None</p>
            )}
            <ul className="space-y-2">
              {recipe.recipe_outputs?.map((out: any, idx: number) => (
                <li key={idx} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50 border border-purple-200 dark:border-purple-900">
                  <div>
                    <span className="font-medium">{out.product?.name || 'Unknown'}</span>
                    {out.variant?.name && <span className="text-muted-foreground ms-1">({out.variant.name})</span>}
                  </div>
                  <div className="font-bold text-purple-600 dark:text-purple-400">
                    + {out.quantity_produced}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Charges */}
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
            <span className="text-sm font-semibold">{t('production:recipes.total_charges', { defaultValue: 'Total Execution Charges' })}</span>
            <span className="font-bold">{formatCurrency(totalCharges, company?.currency || 'DZD')}</span>
          </div>

          {hasInsufficientStock && (
            <div className="flex items-start gap-3 p-3 rounded-md bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">{t('production:recipes.insufficient_stock_title', { defaultValue: 'Insufficient Stock' })}</p>
                <p>{t('production:recipes.insufficient_stock_desc', { defaultValue: 'You do not have enough components in stock to execute this recipe. You can proceed, but stock levels will go negative.' })}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExecuting}>
            {t('actions.cancel', { ns: 'common', defaultValue: 'Cancel' })}
          </Button>
          <Button 
            onClick={handleExecute} 
            disabled={isExecuting}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isExecuting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t('production:recipes.execute_btn', { defaultValue: 'Confirm Execution' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
