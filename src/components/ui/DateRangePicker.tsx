import { useState } from "react"
import { format, isAfter, isBefore, isEqual, startOfDay } from "date-fns"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  from?: string  // ISO date string yyyy-MM-dd
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
  placeholder?: string
  className?: string
}

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun…6=Sat → convert to Mon-based
  const day = new Date(year, month, 1).getDay()
  return (day + 6) % 7  // Mon=0 … Sun=6
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "Select date range",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => {
    const d = from ? new Date(from) : new Date()
    return d.getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    const d = from ? new Date(from) : new Date()
    return d.getMonth()
  })
  const [hovered, setHovered] = useState<Date | null>(null)
  // pick state: null = no pick started yet; "from" = waiting for to
  const [picking, setPicking] = useState<"from" | null>(null)

  const fromDate = from ? startOfDay(new Date(from)) : null
  const toDate = to ? startOfDay(new Date(to)) : null

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const handleDayClick = (d: Date) => {
    if (!picking) {
      // first click = from, clear to
      onChange({ from: format(d, "yyyy-MM-dd"), to: undefined })
      setPicking("from")
    } else {
      // second click = to
      if (fromDate && isBefore(d, fromDate)) {
        // clicked before current from — swap
        onChange({ from: format(d, "yyyy-MM-dd"), to: format(fromDate, "yyyy-MM-dd") })
      } else {
        onChange({ from: from, to: format(d, "yyyy-MM-dd") })
      }
      setPicking(null)
      setOpen(false)
    }
  }

  const isInRange = (d: Date) => {
    if (!fromDate) return false
    const effectiveTo = picking && hovered ? hovered : toDate
    if (!effectiveTo) return false
    const start = isBefore(fromDate, effectiveTo) ? fromDate : effectiveTo
    const end = isAfter(fromDate, effectiveTo) ? fromDate : effectiveTo
    return isAfter(d, start) && isBefore(d, end)
  }

  const isFrom = (d: Date) => fromDate && isEqual(d, fromDate)
  const isTo = (d: Date) => {
    const effectiveTo = picking && hovered ? hovered : toDate
    return effectiveTo && isEqual(d, effectiveTo)
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1))
  ]

  const displayLabel = () => {
    if (from && to) return `${format(new Date(from), "dd MMM yyyy")} → ${format(new Date(to), "dd MMM yyyy")}`
    if (from) return `From ${format(new Date(from), "dd MMM yyyy")} …`
    return placeholder
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setPicking(null) }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !from && "text-muted-foreground",
            className
          )}
        >
          <Calendar className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{displayLabel()}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 select-none">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>‹</Button>
            <span className="text-sm font-semibold">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>›</Button>
          </div>

          {/* Instruction */}
          <p className="text-xs text-center text-muted-foreground mb-2">
            {picking ? "Click to select end date" : "Click to select start date"}
          </p>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-0">
            {cells.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />

              const isStart = isFrom(date)
              const isEnd = isTo(date)
              const inRange = isInRange(date)
              const isToday = isEqual(startOfDay(date), startOfDay(new Date()))

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleDayClick(date)}
                  onMouseEnter={() => picking && setHovered(date)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    "relative h-8 w-full text-xs transition-all duration-150 rounded-none",
                    "hover:bg-primary/10",
                    inRange && "bg-primary/15",
                    (isStart || isEnd) && "bg-primary text-primary-foreground hover:bg-primary/90 z-10",
                    isStart && "rounded-l-full",
                    isEnd && "rounded-r-full",
                    isToday && !isStart && !isEnd && "font-bold underline decoration-primary"
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Clear */}
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-7 text-xs text-muted-foreground"
              onClick={() => { onChange({ from: undefined, to: undefined }); setPicking(null) }}
            >
              Clear dates
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
