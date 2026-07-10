import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"

interface ProductComboboxProps {
  companyId: string | undefined
  value: string | undefined // Format: "product_id" or "product_id:variant_id"
  onChange: (value: string, product: any) => void
  placeholder?: string
  filterActive?: boolean
  disabled?: boolean
  className?: string
}

export function ProductCombobox({ 
  companyId, 
  value, 
  onChange, 
  placeholder,
  filterActive = true,
  disabled = false,
  className
}: ProductComboboxProps) {
  const { t } = useTranslation(['common', 'commerce'])
  const [open, setOpen] = React.useState(false)

  const { data: products, isLoading } = useQuery<any[]>({
    queryKey: ['products_combobox', companyId, filterActive],
    queryFn: async () => {
      if (!companyId) return []
      const query = supabase
        .from('v_product_variants_stock')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name')
      
      if (filterActive) {
        query.eq('status', 'active')
      }
      
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!companyId,
  })

  // Format the internal value as "product_id:variant_id" or "product_id:"
  const selectedProduct = React.useMemo(() => {
    if (!value || !products) return null
    const [pId, vId] = value.split(':')
    return products.find(p => p.product_id === pId && (vId ? p.variant_id === vId : !p.variant_id))
  }, [value, products])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className, !value && "text-muted-foreground")}
          disabled={disabled || isLoading}
        >
          <span className="truncate flex-1 text-left">
            {selectedProduct ? selectedProduct.full_name : placeholder || t('common:select', { defaultValue: 'Select...' })}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command filter={(value, search) => {
          if (value.toLowerCase().includes(search.toLowerCase())) return 1
          return 0
        }}>
          <CommandInput placeholder={t('commerce:products.search', { defaultValue: 'Search products...' })} />
          <CommandList>
            <CommandEmpty>{t('commerce:products.no_results', { defaultValue: 'No products found.' })}</CommandEmpty>
            <CommandGroup>
              {products?.map((product) => {
                // value string to pass to CommandItem needs to be search string
                const itemValue = `${product.product_id}:${product.variant_id || ''}`
                return (
                  <CommandItem
                    key={itemValue}
                    value={product.full_name} // Search matches against this
                    onSelect={() => {
                      onChange(itemValue, product)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === itemValue ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{product.full_name}</span>
                      {product.sku && <span className="text-xs text-muted-foreground font-mono">{product.sku}</span>}
                    </div>
                    {product.total_qty_available !== undefined && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {product.total_qty_available} in stock
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
