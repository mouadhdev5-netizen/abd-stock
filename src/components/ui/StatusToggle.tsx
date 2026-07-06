import { useTranslation } from 'react-i18next'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface StatusToggleProps {
  checked: boolean
  onToggle: () => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function StatusToggle({ checked, onToggle, disabled = false, size = 'sm' }: StatusToggleProps) {
  const { t } = useTranslation('common')

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
        className={cn(
          'data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-600'
        )}
      />
      <span
        className={cn(
          'text-xs font-medium select-none',
          checked ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          size === 'sm' && 'hidden sm:inline'
        )}
      >
        {checked ? t('status.active') : t('status.inactive')}
      </span>
    </div>
  )
}
