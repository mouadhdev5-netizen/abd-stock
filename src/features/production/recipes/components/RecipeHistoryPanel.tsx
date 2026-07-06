import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Calendar, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

interface RecipeHistoryPanelProps {
  recipeId: string | null
  recipeName: string
  isOpen: boolean
  onClose: () => void
}

export function RecipeHistoryPanel({ recipeId, recipeName, isOpen, onClose }: RecipeHistoryPanelProps) {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()

  const { data: executions, isLoading } = useQuery({
    queryKey: ['recipe_executions', recipeId],
    queryFn: async () => {
      if (!recipeId) return []
      const { data, error } = await supabase
        .from('recipe_executions')
        .select(`
          *,
          profile:profiles(id, first_name, last_name)
        `)
        .eq('recipe_id', recipeId)
        .order('executed_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!recipeId && isOpen,
  })

  return (
    <Sheet open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('production:recipes.history', { defaultValue: 'Execution History' })}</SheetTitle>
          <SheetDescription>
            {t('production:recipes.history_desc', { defaultValue: 'Log of all past executions for:' })} <strong className="text-foreground">{recipeName}</strong>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : executions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('production:recipes.no_history', { defaultValue: 'No execution history found.' })}
            </div>
          ) : (
            <div className="relative border-l border-muted ms-3 space-y-6">
              {executions?.map((exec: any) => (
                <div key={exec.id} className="relative ps-6">
                  {/* Timeline dot */}
                  <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[6.5px] top-1.5 ring-4 ring-background" />
                  
                  <div className="bg-muted/30 border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-purple-700 dark:text-purple-400">
                        <Calendar className="h-4 w-4" />
                        {formatDateTime(exec.executed_at)}
                      </div>
                      <div className="font-bold text-sm">
                        {formatCurrency(exec.total_cost, company?.currency || 'DZD')}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {exec.profile?.first_name} {exec.profile?.last_name}
                    </div>

                    {exec.notes && (
                      <p className="mt-2 text-sm italic text-muted-foreground">{exec.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
