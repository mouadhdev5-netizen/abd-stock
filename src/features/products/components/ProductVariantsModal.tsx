import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.tsx'
import { formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge.tsx'
import { Package } from 'lucide-react'

interface ProductVariantsModalProps {
  productId: string | null
  productName: string
  isOpen: boolean
  onClose: () => void
}

export function ProductVariantsModal({ productId, productName, isOpen, onClose }: ProductVariantsModalProps) {
  const { data: variants, isLoading } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      if (!productId) return []
      
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id, name, sku, barcode, cost_price, sell_price, attributes,
          stock_levels(qty_available, qty_on_hand)
        `)
        .eq('product_id', productId)

      if (error) throw error
      return data || []
    },
    enabled: !!productId && isOpen
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Variants for: {productName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 border rounded-md overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Variant Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead className="text-right">Cost Price</TableHead>
                <TableHead className="text-right">Sell Price</TableHead>
                <TableHead className="text-right">Available Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading variants...
                  </TableCell>
                </TableRow>
              ) : variants?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No variants found.
                  </TableCell>
                </TableRow>
              ) : (
                variants?.map((v: any) => {
                  const stockLevels = v.stock_levels || []
                  const totalAvailable = stockLevels.reduce((sum: number, sl: any) => sum + (sl.qty_available || 0), 0)

                  return (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.sku || '-'}</TableCell>
                      <TableCell>
                        {v.barcode ? <Badge variant="secondary" className="font-mono text-xs">{v.barcode}</Badge> : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(v.cost_price || 0)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(v.sell_price || 0)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={totalAvailable > 0 ? 'default' : 'destructive'}>
                          {totalAvailable} in stock
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
