import { useTranslation } from 'react-i18next'
import { Loader2, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime, truncateText } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export function MessageHistory() {
  const { t } = useTranslation(['production', 'common'])
  const { company } = useAuthStore()

  const { data: messages, isLoading } = useQuery({
    queryKey: ['whatsapp_messages', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          template:whatsapp_templates(name)
        `)
        .eq('company_id', company.id)
        .order('sent_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!company?.id,
  })

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t('production:whatsapp.history.title', { defaultValue: 'Message History' })}</h2>
        <p className="text-sm text-muted-foreground">
          {t('production:whatsapp.history.subtitle', { defaultValue: 'Log of all sent WhatsApp messages.' })}
        </p>
      </div>

      <div className="border rounded-md bg-card overflow-hidden flex-1">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>{t('production:whatsapp.history.sent_at', { defaultValue: 'Sent At' })}</TableHead>
              <TableHead>{t('production:whatsapp.history.type', { defaultValue: 'Type' })}</TableHead>
              <TableHead>{t('production:whatsapp.history.recipients', { defaultValue: 'Recipients' })}</TableHead>
              <TableHead>{t('production:whatsapp.history.status', { defaultValue: 'Status' })}</TableHead>
              <TableHead className="w-1/3">{t('production:whatsapp.history.message', { defaultValue: 'Message Preview' })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : messages?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t('labels.no_data', { ns: 'common', defaultValue: 'No message history found.' })}
                </TableCell>
              </TableRow>
            ) : (
              messages?.map((msg: any) => (
                <TableRow key={msg.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDateTime(msg.sent_at)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {msg.template?.name ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200">
                        {msg.template.name}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {t('production:whatsapp.history.custom', { defaultValue: 'Custom Message' })}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {msg.recipients_count}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-transparent">
                      {msg.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">
                    {truncateText(msg.message_body, 60)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
