import * as React from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface InlineProductSearchProps {
  companyId: string | undefined
  onSelectProduct: (product: any) => void
}

export function InlineProductSearch({ companyId, onSelectProduct }: InlineProductSearchProps) {
  const { t } = useTranslation(['commerce'])
  const [search, setSearch] = React.useState("")

  const { data: products, isLoading } = useQuery<any[]>({
    queryKey: ['products_search_inline', companyId],
    queryFn: async () => {
      if (!companyId) return []
      const { data, error } = await supabase
        .from('v_product_variants_stock')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('full_name')
      
      if (error) throw error
      return data || []
    },
    enabled: !!companyId,
  })

  // Optional: Barcode scanning detection
  // If the user types very fast (like a scanner) and hits Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && search.length > 0) {
      // Find exact match by barcode or name
      const exactMatch = products?.find(
        p => p.barcode === search || p.sku === search || p.full_name.toLowerCase() === search.toLowerCase()
      )
      if (exactMatch) {
        onSelectProduct(exactMatch)
        setSearch("")
      }
    }
  }

  return (
    <Command 
      className="border rounded-lg overflow-hidden" 
      shouldFilter={true}
      filter={(value, search) => {
        if (value.toLowerCase().includes(search.toLowerCase())) return 1
        return 0
      }}
    >
      <CommandInput 
        placeholder={t('commerce:sales.search_products_barcode', { defaultValue: 'Search products by name, sku, or scan barcode...' })} 
        value={search}
        onValueChange={setSearch}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      {search.trim().length > 0 && (
        <CommandList className="max-h-[200px] border-t">
          <CommandEmpty>{t('commerce:products.no_results', { defaultValue: 'No products found.' })}</CommandEmpty>
          <CommandGroup>
            {products?.map((product) => {
              const itemValue = `${product.product_id}:${product.variant_id || ''}`
              const searchValue = `${product.full_name} ${product.sku || ''} ${product.barcode || ''}`.trim()
              
              return (
                <CommandItem
                  key={itemValue}
                  value={searchValue}
                  onSelect={() => {
                    onSelectProduct(product)
                    setSearch("")
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col flex-1">
                    <span className="font-medium">{product.full_name}</span>
                    {product.sku && <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-semibold">{product.sell_price}</span>
                    <span className="text-xs text-muted-foreground">{product.total_qty_available} in stock</span>
                  </div>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      )}
    </Command>
  )
}
