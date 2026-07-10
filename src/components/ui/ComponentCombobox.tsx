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

interface ComponentComboboxProps {
  companyId: string | undefined
  value: string | undefined // Format: "component_id"
  onChange: (value: string, component: any) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ComponentCombobox({
  companyId,
  value,
  onChange,
  placeholder,
  disabled = false,
  className
}: ComponentComboboxProps) {
  const { t } = useTranslation(['common', 'commerce'])
  const [open, setOpen] = React.useState(false)

  const { data: components, isLoading } = useQuery<any[]>({
    queryKey: ['components_combobox', companyId],
    queryFn: async () => {
      if (!companyId) return []
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('company_id', companyId)
        .order('name')

      if (error) throw error
      return data || []
    },
    enabled: !!companyId,
  })

  const selectedComponent = React.useMemo(() => {
    if (!value || !components) return null
    return components.find(c => c.id === value)
  }, [value, components])

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
            {selectedComponent ? selectedComponent.name : placeholder || t('common:select', { defaultValue: 'Select...' })}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command filter={(value, search) => {
          if (value.toLowerCase().includes(search.toLowerCase())) return 1
          return 0
        }}>
          <CommandInput placeholder="Search components..." />
          <CommandList>
            <CommandEmpty>No components found.</CommandEmpty>
            <CommandGroup>
              {components?.map((comp) => {
                return (
                  <CommandItem
                    key={comp.id}
                    value={comp.name} // Search matches against this
                    onSelect={() => {
                      onChange(comp.id, comp)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === comp.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{comp.name}</span>
                    </div>
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
