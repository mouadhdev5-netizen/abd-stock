import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useState } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  RotateCcw,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'

export type CommandStatus =
  | 'pending'
  | 'confirmed'
  | 'in_delivery'
  | 'delivered'
  | 'returned'
  | 'cancelled'

interface Stage {
  key: CommandStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string          // Tailwind text/bg color token
  bgColor: string
  borderColor: string
}

const STAGES: Stage[] = [
  { key: 'pending',     label: 'Pending',     icon: ClipboardList, color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',  borderColor: 'border-yellow-300 dark:border-yellow-700' },
  { key: 'confirmed',   label: 'Confirmed',   icon: CheckCircle2,  color: 'text-blue-600',   bgColor: 'bg-blue-50 dark:bg-blue-900/20',      borderColor: 'border-blue-300 dark:border-blue-700' },
  { key: 'in_delivery', label: 'In Delivery', icon: Truck,         color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-900/20',  borderColor: 'border-purple-300 dark:border-purple-700' },
  { key: 'delivered',   label: 'Delivered',   icon: PackageCheck,  color: 'text-green-600',  bgColor: 'bg-green-50 dark:bg-green-900/20',    borderColor: 'border-green-300 dark:border-green-700' },
]

const TERMINAL_STAGES: Stage[] = [
  { key: 'returned',   label: 'Returned',   icon: RotateCcw, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-300' },
  { key: 'cancelled',  label: 'Cancelled',  icon: XCircle,   color: 'text-red-600',    bgColor: 'bg-red-50 dark:bg-red-900/20',       borderColor: 'border-red-300' },
]

const NEXT_STAGE: Partial<Record<CommandStatus, CommandStatus>> = {
  pending:     'confirmed',
  confirmed:   'in_delivery',
  in_delivery: 'delivered',
}

const NEXT_LABEL: Partial<Record<CommandStatus, string>> = {
  pending:     'Confirm Order',
  confirmed:   'Send to Delivery',
  in_delivery: 'Mark Delivered',
}

interface CommandLifecycleProps {
  status: CommandStatus
  onStatusChange: (newStatus: CommandStatus) => Promise<void> | void
  compact?: boolean
}

export function CommandLifecycle({ status, onStatusChange, compact = false }: CommandLifecycleProps) {
  const [confirmDestructive, setConfirmDestructive] = useState<CommandStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const currentStageIndex = STAGES.findIndex(s => s.key === status)
  const isTerminal = TERMINAL_STAGES.some(s => s.key === status)
  const nextStage = NEXT_STAGE[status]
  const nextLabel = NEXT_LABEL[status]

  const handleAdvance = async () => {
    if (!nextStage) return
    setIsLoading(true)
    try {
      await onStatusChange(nextStage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDestructive = async (s: CommandStatus) => {
    setIsLoading(true)
    try {
      await onStatusChange(s)
    } finally {
      setIsLoading(false)
      setConfirmDestructive(null)
    }
  }

  // Find the current stage object (could be a terminal stage)
  const currentStage =
    STAGES.find(s => s.key === status) || TERMINAL_STAGES.find(s => s.key === status)

  if (compact) {
    // Just show current status badge + next action button
    return (
      <div className="flex items-center gap-2">
        {currentStage && (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
            currentStage.bgColor,
            currentStage.borderColor,
            currentStage.color
          )}>
            <currentStage.icon className="h-3 w-3" />
            {currentStage.label}
          </span>
        )}
        {nextStage && (
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={handleAdvance}
            disabled={isLoading}
          >
            {nextLabel}
            <ArrowRight className="h-3 w-3 ms-1" />
          </Button>
        )}
      </div>
    )
  }

  // Full lifecycle view
  return (
    <div className="space-y-4">
      {/* Pipeline stepper */}
      <div className="flex items-center gap-0">
        {STAGES.map((stage, i) => {
          const isDone = currentStageIndex > i
          const isCurrent = stage.key === status
          const isFuture = currentStageIndex < i && !isTerminal

          return (
            <div key={stage.key} className="flex items-center flex-1">
              <div className={cn(
                "flex flex-col items-center gap-1 flex-1 transition-all duration-300",
              )}>
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isDone   && "bg-primary border-primary text-primary-foreground",
                  isCurrent && !isTerminal && cn(stage.bgColor, stage.borderColor, stage.color, "shadow-md ring-2 ring-offset-1", stage.borderColor),
                  isTerminal && isCurrent && "opacity-40 border-muted bg-muted/20",
                  isFuture && "border-muted bg-muted/20 text-muted-foreground",
                )}>
                  <stage.icon className="h-4 w-4" />
                </div>
                <span className={cn(
                  "text-[11px] font-medium whitespace-nowrap transition-colors",
                  isCurrent && !isTerminal ? stage.color : isDone ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={cn(
                  "h-0.5 w-8 mx-1 rounded transition-all duration-300",
                  isDone ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Terminal stages */}
      {isTerminal && currentStage && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium",
          currentStage.bgColor,
          currentStage.borderColor,
          currentStage.color
        )}>
          <currentStage.icon className="h-4 w-4" />
          This order is {currentStage.label.toLowerCase()}
        </div>
      )}

      {/* Action buttons */}
      {!isTerminal && (
        <div className="flex items-center gap-2 flex-wrap">
          {nextStage && (
            <Button
              size="sm"
              onClick={handleAdvance}
              disabled={isLoading}
              className="gap-1.5"
            >
              {nextLabel}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {/* Destructive actions */}
          {status !== 'delivered' && (
            <>
              {status !== 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={() => setConfirmDestructive('returned')}
                  disabled={isLoading}
                >
                  <RotateCcw className="h-3.5 w-3.5 me-1" />
                  Mark Returned
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/40 hover:bg-destructive/5"
                onClick={() => setConfirmDestructive('cancelled')}
                disabled={isLoading}
              >
                <XCircle className="h-3.5 w-3.5 me-1" />
                Cancel Order
              </Button>
            </>
          )}
        </div>
      )}

      {/* Confirm destructive */}
      <ConfirmDialog
        open={!!confirmDestructive}
        onCancel={() => setConfirmDestructive(null)}
        onConfirm={() => confirmDestructive && handleDestructive(confirmDestructive)}
        title={confirmDestructive === 'cancelled' ? 'Cancel Order?' : 'Mark as Returned?'}
        description={
          confirmDestructive === 'cancelled'
            ? 'This will mark the order as cancelled. Are you sure?'
            : 'This will mark the order as returned. Are you sure?'
        }
        confirmLabel={confirmDestructive === 'cancelled' ? 'Cancel Order' : 'Mark Returned'}
        confirmVariant={confirmDestructive === 'cancelled' ? 'destructive' : 'default'}
        isLoading={isLoading}
      />
    </div>
  )
}
