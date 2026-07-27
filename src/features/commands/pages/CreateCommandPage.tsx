import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { Plus, ArrowLeft, Loader2, Home, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { CommandForm } from '../components/CommandForm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CommandStatusBadge } from '../components/CommandStatusBadge'

export default function CreateCommandPage() {
  const { t } = useTranslation(['commerce', 'common'])
  const { company } = useAuthStore()
  const [isCreating, setIsCreating] = useState(false)

  const { data: recentCommands, isLoading } = useQuery({
    queryKey: ['commands_recent', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      
      const sevenDaysAgo = subDays(new Date(), 7).toISOString()

      const { data, error } = await supabase
        .from('commands')
        .select(`
          *,
          customers(name, phone)
        `)
        .eq('company_id', company.id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!company?.id && !isCreating,
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors"><Home className="h-4 w-4" /></Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <Link to="/commerce/commands/en-cours" className="hover:text-primary transition-colors">Commands</Link>
          <ChevronRight className="h-4 w-4 mx-1" />
          <span className="text-foreground font-medium">Create Command</span>
        </div>
        {isCreating && (
          <Button variant="outline" size="sm" onClick={() => setIsCreating(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Recent
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isCreating ? 'Create Command' : 'Recent Commands'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isCreating 
              ? 'Create a new order and automatically dispatch it to Yalidin.'
              : 'Recent commands from the last 7 days.'}
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Command
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          {isCreating ? (
            <CommandForm onSuccess={() => setIsCreating(false)} />
          ) : (
            <div className="overflow-auto border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead className="text-end">Total</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : recentCommands?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        No recent commands in the last 7 days.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentCommands?.map((command: any) => (
                      <TableRow key={command.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(command.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-primary">
                            {(command.customers as any)?.name || 'Walk-in'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(command.customers as any)?.phone || ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          {command.delivery_address || '-'}
                        </TableCell>
                        <TableCell className="text-end font-medium">
                          {formatCurrency(command.total || 0, company?.currency || 'DZD')}
                        </TableCell>
                        <TableCell className="text-center">
                          <CommandStatusBadge status={command.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
