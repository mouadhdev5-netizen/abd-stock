import { cn } from '@/lib/utils'

interface SectionCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  color?: 'blue' | 'purple' | 'green' | 'red' | 'yellow' | 'gray'
  isLoading?: boolean
}

const colorMap = {
  blue: 'border-s-blue-500 dark:border-s-blue-400',
  purple: 'border-s-purple-500 dark:border-s-purple-400',
  green: 'border-s-emerald-500 dark:border-s-emerald-400',
  red: 'border-s-red-500 dark:border-s-red-400',
  yellow: 'border-s-yellow-500 dark:border-s-yellow-400',
  gray: 'border-s-gray-400 dark:border-s-gray-500',
}

const iconColorMap = {
  blue: 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30',
  purple: 'text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30',
  green: 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
  red: 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
  yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30',
  gray: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/30',
}

export function SectionCard({ title, value, icon, trend, color = 'blue', isLoading = false }: SectionCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm border-s-4',
        colorMap[color]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-28 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="mt-1 text-2xl font-bold tracking-tight truncate">{value}</p>
          )}
          {trend && !isLoading && (
            <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
          )}
        </div>
        <div className={cn('rounded-lg p-2.5 flex-shrink-0', iconColorMap[color])}>
          {icon}
        </div>
      </div>
    </div>
  )
}
