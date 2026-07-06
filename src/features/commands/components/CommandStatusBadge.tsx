import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'

interface CommandStatusBadgeProps {
  status: string
  source?: 'local' | 'api'
}

export function CommandStatusBadge({ status, source = 'local' }: CommandStatusBadgeProps) {
  const { t } = useTranslation('commerce')
  
  // Normalize status
  const normalized = status?.toLowerCase() || 'pending'
  
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' = 'secondary'
  let label = normalized

  if (normalized.includes('pending') || normalized.includes('en_attente')) {
    variant = 'secondary' // Gray
    label = t('commands.status.pending', { defaultValue: 'Pending' })
  } else if (normalized.includes('confirmed') || normalized.includes('confirmé')) {
    variant = 'default' // Blue (assuming default is primary/blue)
    label = t('commands.status.confirmed', { defaultValue: 'Confirmed' })
  } else if (normalized.includes('transit') || normalized.includes('expédié') || normalized.includes('shipped')) {
    variant = 'warning' // Yellow/Orange
    label = t('commands.status.in_transit', { defaultValue: 'In Transit' })
  } else if (normalized.includes('delivered') || normalized.includes('livré')) {
    variant = 'success' // Green
    label = t('commands.status.delivered', { defaultValue: 'Delivered' })
  } else if (normalized.includes('cancelled') || normalized.includes('retour') || normalized.includes('annulé')) {
    variant = 'destructive' // Red
    label = t('commands.status.cancelled', { defaultValue: 'Cancelled' })
  }

  // Handle raw Yalidin statuses if not matched above
  if (source === 'api' && label === normalized) {
    label = status // keep original capitalization for API statuses if no match
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant} className="whitespace-nowrap">
        {label}
      </Badge>
      {source === 'api' && (
        <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded">API</span>
      )}
    </div>
  )
}
