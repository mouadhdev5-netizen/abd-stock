import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CommandStatusBadge } from '../components/CommandStatusBadge'
import { getShipmentStatus, mapYalidinStatus } from '@/lib/yalidin'

export default function SuiviPage() {
  const { company } = useAuthStore()
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const { data: commands, isLoading, refetch } = useQuery({
    queryKey: ['commands_suivi', company?.id],
    queryFn: async () => {
      if (!company?.id) return []

      const { data, error } = await supabase
        .from('commands')
        .select(`
          *,
          customers(name)
        `)
        .eq('company_id', company.id)
        .not('yalidin_tracking_id', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch Yalidin statuses
      let apiStatuses: Record<string, any> = {}
      if (data && (data as any[]).length > 0) {
        const trackingIds = (data as any[]).map(c => c.yalidin_tracking_id).filter(Boolean) as string[]
        try {
          const statuses = await getShipmentStatus(trackingIds)
          statuses.forEach(s => {
            apiStatuses[s.tracking] = s
          })
        } catch (err) {
          console.error('Failed to fetch Yalidin statuses:', err)
        }
      }

      setLastRefreshed(new Date())
      return (data as any[]).map((c: any) => ({
        ...c,
        apiStatus: apiStatuses[c.yalidin_tracking_id!] || null
      }))
    },
    enabled: !!company?.id,
    refetchInterval: 60000, // auto-refresh every 60 seconds
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((new Date().getTime() - lastRefreshed.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastRefreshed])

  const handleSyncAll = async () => {
    if (!commands || commands.length === 0) return
    setIsSyncing(true)
    try {
      await refetch()
      // Optional: Update our local DB status if API status matches our mapped statuses
      for (const cmd of commands) {
        if (cmd.apiStatus) {
          const mapped = mapYalidinStatus(cmd.apiStatus.status)
          if (mapped !== cmd.status && (mapped === 'delivered' || mapped === 'cancelled')) {
            await supabase
              .from('commands')
              .update({ status: mapped } as never)
              .eq('id', cmd.id)
          }
        }
      }
      // refetch again to show updated local statuses
      await refetch()
    } catch (err) {
      console.error('Sync failed', err)
      alert('Sync failed. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suivi de Livraisons</h1>
          <p className="text-muted-foreground mt-1">Track shipments sent via Yalidin Delivery Service.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="me-1 h-4 w-4" />
            Last refreshed: {secondsAgo} seconds ago
          </div>
          <Button onClick={handleSyncAll} disabled={isSyncing || isLoading}>
            <RefreshCw className={`me-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync All
          </Button>
        </div>
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>Tracking ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Local Status</TableHead>
                <TableHead>API Status</TableHead>
                <TableHead>Last Event</TableHead>
                <TableHead>Est. Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">Loading tracking data...</TableCell>
                </TableRow>
              ) : commands?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">No active shipments with Yalidin.</TableCell>
                </TableRow>
              ) : (
                (commands as any[])?.map((command: any) => (
                  <TableRow key={command.id}>
                    <TableCell className="font-mono text-primary font-medium">
                      {command.yalidin_tracking_id}
                    </TableCell>
                    <TableCell>
                      {(command.customers as any)?.name || 'Walk-in Customer'}
                    </TableCell>
                    <TableCell>
                      <CommandStatusBadge status={command.status} />
                    </TableCell>
                    <TableCell>
                      {command.apiStatus ? (
                        <CommandStatusBadge status={command.apiStatus.status} source="api" />
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Pending sync</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {command.apiStatus?.last_event || '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {command.apiStatus?.estimated_delivery || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
