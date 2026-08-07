import { useState } from 'react'
import { Filter, X, Check, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { cn } from '@/lib/utils'

export interface FilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface FilterConfig {
  key: string
  title: string
  type?: 'select' | 'number_range' | 'date_range'
  options?: FilterOption[]
}

interface AdvancedFilterProps {
  filters: FilterConfig[]
  activeFilters: Record<string, any>
  onFilterChange: (key: string, value: any) => void
  onClearAll: () => void
}

export function AdvancedFilter({ filters, activeFilters, onFilterChange, onClearAll }: AdvancedFilterProps) {
  const [open, setOpen] = useState(false)

  const activeCount = Object.keys(activeFilters).filter(k => {
    const val = activeFilters[k]
    if (Array.isArray(val)) return val.length > 0
    if (typeof val === 'object' && val !== null) {
      return val.min !== undefined || val.max !== undefined || val.from !== undefined || val.to !== undefined
    }
    return false
  }).length

  const renderFilterControl = (filter: FilterConfig) => {
    if (filter.type === 'date_range') {
      const current = activeFilters[filter.key] || {}
      return (
        <div className="space-y-2">
          <DateRangePicker
            from={current.from}
            to={current.to}
            onChange={(range) => onFilterChange(filter.key, range)}
          />
        </div>
      )
    }

    if (filter.type === 'number_range') {
      const current = activeFilters[filter.key] || {}
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={current.min ?? ''}
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined
              onFilterChange(filter.key, { ...current, min: val })
            }}
          />
          <span className="text-muted-foreground shrink-0">–</span>
          <input
            type="number"
            placeholder="Max"
            value={current.max ?? ''}
            className="w-full rounded-md border border-input px-3 py-2 text-sm"
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined
              onFilterChange(filter.key, { ...current, max: val })
            }}
          />
        </div>
      )
    }

    // Default: select (multi)
    const selectedValues: string[] = activeFilters[filter.key] || []
    return (
      <Command>
        <CommandInput placeholder={`Search ${filter.title.toLowerCase()}...`} />
        <CommandList className="max-h-[200px]">
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup>
            {filter.options?.map((option) => {
              const isSelected = selectedValues.includes(option.value)
              return (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    const updated = isSelected
                      ? selectedValues.filter(v => v !== option.value)
                      : [...selectedValues, option.value]
                    onFilterChange(filter.key, updated)
                  }}
                  className="cursor-pointer"
                >
                  <div className={cn(
                    "me-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-colors",
                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                  )}>
                    <Check className={cn("h-3 w-3", isSelected ? "opacity-100" : "opacity-0")} />
                  </div>
                  {option.icon && <option.icon className="me-2 h-4 w-4 text-muted-foreground" />}
                  <span>{option.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    )
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "h-9 gap-2 border-dashed transition-colors",
          activeCount > 0 && "border-primary/60 bg-primary/5 text-primary"
        )}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>Filters</span>
        {activeCount > 0 && (
          <Badge className="h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground rounded-full">
            {activeCount}
          </Badge>
        )}
      </Button>

      {/* Side Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[360px] sm:w-[400px] flex flex-col">
          <SheetHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {activeCount > 0 && (
                  <Badge className="h-5 min-w-5 px-1.5 text-xs">
                    {activeCount} active
                  </Badge>
                )}
              </SheetTitle>
              {activeCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  onClick={onClearAll}
                >
                  <X className="h-3 w-3 me-1" />
                  Clear all
                </Button>
              )}
            </div>
            <SheetDescription>
              Refine your results using the filters below.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {filters.map((filter) => {
              const hasActive = (() => {
                const val = activeFilters[filter.key]
                if (!val) return false
                if (Array.isArray(val)) return val.length > 0
                if (typeof val === 'object') {
                  return Object.values(val).some(v => v !== undefined && v !== null && v !== '')
                }
                return false
              })()

              return (
                <div key={filter.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{filter.title}</span>
                    {hasActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => onFilterChange(filter.key, filter.type === 'select' ? [] : {})}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className={cn(
                    "rounded-md border bg-muted/20 overflow-hidden transition-all",
                    filter.type === 'date_range' || filter.type === 'number_range' ? "p-2" : ""
                  )}>
                    {renderFilterControl(filter)}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="shrink-0 pt-4 border-t">
            <Button className="w-full" onClick={() => setOpen(false)}>
              Apply Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
