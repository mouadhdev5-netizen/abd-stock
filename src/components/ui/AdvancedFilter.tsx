import { Filter, X, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover.tsx'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command.tsx'
import { cn } from '@/lib/utils'

export interface FilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface FilterConfig {
  key: string
  title: string
  type?: 'select' | 'number_range'
  options?: FilterOption[]
}

interface AdvancedFilterProps {
  filters: FilterConfig[]
  activeFilters: Record<string, any>
  onFilterChange: (key: string, value: any) => void
  onClearAll: () => void
}

export function AdvancedFilter({ filters, activeFilters, onFilterChange, onClearAll }: AdvancedFilterProps) {
  const activeCount = Object.keys(activeFilters).filter(k => {
    const val = activeFilters[k]
    if (Array.isArray(val)) return val.length > 0
    if (typeof val === 'object' && val !== null) return val.min !== undefined || val.max !== undefined
    return false
  }).length

  const renderBadge = (filter: FilterConfig) => {
    const val = activeFilters[filter.key]
    if (!val) return null

    if (filter.type === 'number_range') {
      if (val.min !== undefined && val.max !== undefined) {
        return <Badge variant="secondary" className="rounded-sm px-1 font-normal">{val.min} - {val.max}</Badge>
      } else if (val.min !== undefined) {
        return <Badge variant="secondary" className="rounded-sm px-1 font-normal">&gt; {val.min}</Badge>
      } else if (val.max !== undefined) {
        return <Badge variant="secondary" className="rounded-sm px-1 font-normal">&lt; {val.max}</Badge>
      }
    } else {
      // Select
      if (val.length > 2) {
        return <Badge variant="secondary" className="rounded-sm px-1 font-normal">{val.length} selected</Badge>
      } else if (val.length > 0) {
        return filter.options
          ?.filter((opt) => val.includes(opt.value))
          .map((opt) => (
            <Badge variant="secondary" key={opt.value} className="rounded-sm px-1 font-normal">
              {opt.label}
            </Badge>
          ))
      }
    }
    return null
  }

  const renderPopoverContent = (filter: FilterConfig) => {
    if (filter.type === 'number_range') {
      const current = activeFilters[filter.key] || {}
      return (
        <div className="p-4 space-y-4 w-[250px]">
          <div className="space-y-2">
            <h4 className="font-medium text-sm leading-none">{filter.title} Range</h4>
            <p className="text-xs text-muted-foreground">Set minimum and maximum values.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={current.min || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined
                onFilterChange(filter.key, { ...current, min: val })
              }}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={current.max || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined
                onFilterChange(filter.key, { ...current, max: val })
              }}
            />
          </div>
          {(current.min !== undefined || current.max !== undefined) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-8"
              onClick={() => onFilterChange(filter.key, undefined)}
            >
              Clear
            </Button>
          )}
        </div>
      )
    }

    // Default: Select
    return (
      <Command>
        <CommandInput placeholder={filter.title} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            {filter.options?.map((option) => {
              const isSelected = activeFilters[filter.key]?.includes(option.value)
              return (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    const current = activeFilters[filter.key] || []
                    const updated = isSelected
                      ? current.filter((val: string) => val !== option.value)
                      : [...current, option.value]
                    onFilterChange(filter.key, updated)
                  }}
                >
                  <div
                    className={cn(
                      "me-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className={cn("h-4 w-4")} />
                  </div>
                  {option.icon && (
                    <option.icon className="me-2 h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{option.label}</span>
                </CommandItem>
              )
            })}
          </CommandGroup>
          {activeFilters[filter.key]?.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => onFilterChange(filter.key, undefined)}
                  className="justify-center text-center"
                >
                  Clear filters
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 border-r pe-2 me-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
      </div>

      {filters.map((filter) => {
        const hasActive =
          (filter.type === 'number_range' && (activeFilters[filter.key]?.min !== undefined || activeFilters[filter.key]?.max !== undefined)) ||
          (filter.type !== 'number_range' && activeFilters[filter.key]?.length > 0)

        return (
          <Popover key={filter.key}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 border-dashed">
                {filter.title}
                {hasActive && (
                  <>
                    <span className="mx-2 h-4 w-[1px] bg-border" />
                    <div className="flex gap-1">
                      {renderBadge(filter)}
                    </div>
                  </>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className={filter.type === 'number_range' ? 'w-auto p-0' : 'w-[200px] p-0'} align="start">
              {renderPopoverContent(filter)}
            </PopoverContent>
          </Popover>
        )
      })}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-8 px-2 lg:px-3 text-destructive hover:text-destructive">
          Clear All
          <X className="ms-2 h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
