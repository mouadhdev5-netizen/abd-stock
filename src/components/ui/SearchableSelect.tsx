import React, { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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

export interface SearchableSelectOption {
  label: string
  value: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string | string[]
  onChange: (value: any) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  multi?: boolean
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  multi = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (currentValue: string) => {
    if (multi) {
      const valArray = Array.isArray(value) ? value : []
      if (valArray.includes(currentValue)) {
        onChange(valArray.filter(v => v !== currentValue))
      } else {
        onChange([...valArray, currentValue])
      }
    } else {
      onChange(currentValue === value ? "" : currentValue)
      setOpen(false)
    }
  }

  const displayValue = () => {
    if (multi) {
      const valArray = Array.isArray(value) ? value : []
      if (valArray.length === 0) return placeholder
      if (valArray.length === 1) {
        return options.find(opt => opt.value === valArray[0])?.label || valArray[0]
      }
      return `${valArray.length} selected`
    } else {
      return value
        ? options.find((opt) => opt.value === value)?.label || value
        : placeholder
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className, !value && "text-muted-foreground")}
        >
          <span className="truncate">{displayValue()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {/* modal={false} prevents focus stealing from other inputs inside dialogs */}
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = multi 
                  ? Array.isArray(value) && value.includes(option.value)
                  : value === option.value
                  
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
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
